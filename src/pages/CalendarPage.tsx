import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { Header } from '../components/layout/Header';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { CalendarEventForm } from '../components/calendar/CalendarEventForm';
import { expandCalendarEvents, type CalendarOccurrence } from '../lib/calendarExpand';
import type { CalendarEvent, Client, Project } from '../lib/types';
import { formatDateTime } from '../lib/utils';

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

/** Premier jour affiché (lundi) pour la grille du mois. */
function gridStartMonday(firstOfMonth: Date): Date {
  const first = new Date(firstOfMonth.getFullYear(), firstOfMonth.getMonth(), 1);
  const day = first.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  return startOfDay(addDays(first, diff));
}

function buildDayBuckets(
  occurrences: CalendarOccurrence[]
): Map<string, CalendarOccurrence[]> {
  const map = new Map<string, CalendarOccurrence[]>();
  for (const occ of occurrences) {
    const start = startOfDay(occ.startAt);
    const endDay = occ.endAt ? startOfDay(occ.endAt) : start;
    for (let x = new Date(start); x.getTime() <= endDay.getTime(); x = addDays(x, 1)) {
      const k = dayKey(x);
      const list = map.get(k) ?? [];
      if (!list.some((o) => o.occurrenceKey === occ.occurrenceKey)) list.push(occ);
      map.set(k, list);
    }
  }
  for (const [, list] of map) {
    list.sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
  }
  return map;
}

const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

interface CalendarPageProps {
  events: CalendarEvent[];
  clients: Client[];
  projects: Project[];
  onCreate: (data: Omit<CalendarEvent, 'id' | 'created_at' | 'updated_at' | 'client' | 'project'>) => Promise<CalendarEvent>;
  onUpdate: (id: string, data: Partial<CalendarEvent>) => Promise<CalendarEvent>;
  onDelete: (id: string) => Promise<void>;
}

export function CalendarPage({ events, clients, projects, onCreate, onUpdate, onDelete }: CalendarPageProps) {
  const [viewMonth, setViewMonth] = useState(() => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), 1);
  });

  const [modalCreate, setModalCreate] = useState(false);
  const [createDay, setCreateDay] = useState<Date | undefined>(undefined);
  const [editEvent, setEditEvent] = useState<CalendarEvent | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const gridStart = useMemo(() => gridStartMonday(viewMonth), [viewMonth]);
  const gridEnd = useMemo(() => addDays(gridStart, 41), [gridStart]);

  const occurrences = useMemo(
    () => expandCalendarEvents(events, gridStart, gridEnd),
    [events, gridStart, gridEnd]
  );

  const byDay = useMemo(() => buildDayBuckets(occurrences), [occurrences]);

  const cells = useMemo(() => {
    const out: { date: Date; inMonth: boolean }[] = [];
    for (let i = 0; i < 42; i++) {
      const date = addDays(gridStart, i);
      out.push({
        date,
        inMonth: date.getMonth() === viewMonth.getMonth(),
      });
    }
    return out;
  }, [gridStart, viewMonth]);

  const monthLabel = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(viewMonth);

  const goPrev = () => setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1));
  const goNext = () => setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1));
  const goToday = () => {
    const n = new Date();
    setViewMonth(new Date(n.getFullYear(), n.getMonth(), 1));
  };

  const todayKey = dayKey(new Date());

  const openCreate = (day?: Date) => {
    setCreateDay(day);
    setModalCreate(true);
  };

  const closeCreate = () => {
    setModalCreate(false);
    setCreateDay(undefined);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleteLoading(true);
    await onDelete(deleteId);
    setDeleteLoading(false);
    setDeleteId(null);
    setEditEvent(null);
  };

  return (
    <div>
      <Header
        title="Calendrier"
        subtitle="Vue d’ensemble de l’activité — vous remplissez chaque entrée (clients, livraisons, rendez-vous, récurrences…)"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 rounded-2xl border border-ws-line bg-ws-panel/80 p-1">
              <button
                type="button"
                onClick={goPrev}
                className="p-2 rounded-xl text-ws-mist hover:text-ws-paper hover:bg-white/[0.06] touch-manipulation"
                aria-label="Mois précédent"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                type="button"
                onClick={goToday}
                className="px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider text-ws-accent-soft"
              >
                Aujourd’hui
              </button>
              <button
                type="button"
                onClick={goNext}
                className="p-2 rounded-xl text-ws-mist hover:text-ws-paper hover:bg-white/[0.06] touch-manipulation"
                aria-label="Mois suivant"
              >
                <ChevronRight size={18} />
              </button>
            </div>
            <Button icon={<Plus size={16} />} onClick={() => openCreate()}>
              Nouvel événement
            </Button>
          </div>
        }
      />

      <div className="px-3 py-4 md:p-8 bg-ws-deep/20 min-h-[calc(100vh-100px)]">
        <div className="flex items-baseline justify-between gap-4 mb-4 md:mb-6">
          <h2 className="font-display text-xl md:text-2xl font-bold text-ws-cream capitalize tracking-tight">
            {monthLabel}
          </h2>
          <p className="text-[10px] font-mono text-ws-mist uppercase tracking-[0.15em] hidden sm:block">
            Grille 6 × 7 · {occurrences.length} occurrence{occurrences.length !== 1 ? 's' : ''} sur la période
          </p>
        </div>

        <div className="rounded-[1.25rem] md:rounded-[1.75rem] border border-white/[0.08] bg-ws-panel/40 backdrop-blur-md overflow-hidden shadow-dock">
          <div className="grid grid-cols-7 border-b border-ws-line/80 bg-black/25">
            {WEEKDAYS.map((w) => (
              <div
                key={w}
                className="text-center text-[10px] font-mono font-semibold uppercase tracking-[0.2em] text-ws-mist py-2.5 md:py-3"
              >
                {w}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 auto-rows-fr min-h-[min(78dvh,560px)] md:min-h-[calc(100vh-220px)]">
            {cells.map(({ date, inMonth }) => {
              const k = dayKey(date);
              const list = byDay.get(k) ?? [];
              const isToday = k === todayKey;
              return (
                <div
                  key={k}
                  role="button"
                  tabIndex={0}
                  onClick={() => openCreate(date)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      openCreate(date);
                    }
                  }}
                  className={`flex flex-col items-stretch text-left border-b border-r border-ws-line/50 min-h-[4.5rem] md:min-h-[7.5rem] p-1 md:p-2 transition-colors hover:bg-white/[0.03] focus-visible:outline focus-visible:outline-2 focus-visible:outline-ws-accent/60 cursor-pointer ${
                    inMonth ? 'bg-transparent' : 'bg-black/15 opacity-70'
                  } ${isToday ? 'ring-1 ring-inset ring-ws-accent/35 bg-ws-accent-muted/10' : ''}`}
                >
                  <span
                    className={`text-[11px] md:text-sm font-semibold tabular-nums mb-1 flex-shrink-0 pointer-events-none ${
                      isToday ? 'text-ws-accent-soft' : inMonth ? 'text-ws-paper' : 'text-ws-mist'
                    }`}
                  >
                    {date.getDate()}
                  </span>
                  <div className="flex flex-col gap-0.5 md:gap-1 overflow-hidden flex-1 min-h-0 w-full">
                    {list.slice(0, 5).map((occ) => {
                      const ev = occ.event;
                      const c = ev.color && /^#[0-9A-Fa-f]{6}$/.test(ev.color) ? ev.color : 'rgba(168, 162, 255, 0.55)';
                      return (
                        <button
                          key={occ.occurrenceKey}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditEvent(ev);
                          }}
                          className="truncate rounded-md px-1 py-0.5 md:px-1.5 md:py-1 text-[9px] md:text-[10px] font-medium leading-tight border text-left hover:brightness-110 touch-manipulation"
                          style={{
                            borderColor: c,
                            backgroundColor: `${c}22`,
                            color: 'var(--tw-prose-invert, #f5f0e8)',
                          }}
                          title={ev.title}
                        >
                          {!ev.all_day && (
                            <span className="font-mono opacity-80 mr-0.5">
                              {occ.startAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                          {ev.title}
                        </button>
                      );
                    })}
                    {list.length > 5 && (
                      <span className="text-[9px] text-ws-mist font-mono pl-0.5 pointer-events-none">
                        +{list.length - 5}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <Modal isOpen={modalCreate} onClose={closeCreate} title="Nouvel événement" size="lg">
        <CalendarEventForm
          key={createDay ? createDay.getTime() : 'new-open'}
          clients={clients}
          projects={projects}
          defaultStart={createDay}
          onCancel={closeCreate}
          onSubmit={async (data) => {
            await onCreate(data);
            closeCreate();
          }}
        />
      </Modal>

      <Modal
        isOpen={!!editEvent}
        onClose={() => setEditEvent(null)}
        title="Modifier l’événement"
        size="lg"
      >
        {editEvent && (
          <>
            <div className="flex justify-end mb-3">
              <Button
                type="button"
                variant="danger"
                size="sm"
                icon={<Trash2 size={14} />}
                onClick={() => setDeleteId(editEvent.id)}
              >
                Supprimer
              </Button>
            </div>
            <p className="text-[10px] font-mono text-ws-mist mb-4">
              Créé le {formatDateTime(editEvent.created_at)} · Dernière mise à jour{' '}
              {formatDateTime(editEvent.updated_at)}
            </p>
            <CalendarEventForm
              key={editEvent.id}
              initial={editEvent}
              clients={clients}
              projects={projects}
              onCancel={() => setEditEvent(null)}
              onSubmit={async (data) => {
                await onUpdate(editEvent.id, data);
                setEditEvent(null);
              }}
            />
          </>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Supprimer cet événement ?"
        description="La série récurrente entière sera supprimée (une seule fiche en base)."
        loading={deleteLoading}
      />
    </div>
  );
}
