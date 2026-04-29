import {
  Building2,
  Calendar as CalendarIcon,
  CheckCircle2,
  CheckSquare,
  Euro,
  FolderKanban,
  MessageSquare,
  Plus,
  Sparkles,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import type { UnifiedCalendarOccurrence } from '../../lib/calendarUnified';

interface DayDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  day: Date | null;
  occurrences: UnifiedCalendarOccurrence[];
  onCreate: () => void;
  onSelectOccurrence: (occ: UnifiedCalendarOccurrence) => void;
}

type Kind = UnifiedCalendarOccurrence['kind'];

const KIND_META: Record<Kind, { label: string; color: string; Icon: typeof CalendarIcon }> = {
  agenda: { label: 'Agenda', color: '#a8a2ff', Icon: CalendarIcon },
  project: { label: 'Projet', color: '#af7037', Icon: FolderKanban },
  task: { label: 'Tâche', color: '#c98a4c', Icon: CheckSquare },
  client: { label: 'Client', color: '#059669', Icon: Building2 },
  interaction: { label: 'Échange', color: '#0891B2', Icon: MessageSquare },
  invoice_due: { label: 'Facture', color: '#d4a574', Icon: Euro },
  invoice_paid: { label: 'Payé', color: '#34d399', Icon: CheckCircle2 },
};

function formatTime(d: Date): string {
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
  );
}

function dayHeaderLabel(day: Date): { weekday: string; numeric: string; meta: string } {
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  let meta = '';
  if (isSameDay(day, today)) meta = "Aujourd'hui";
  else if (isSameDay(day, tomorrow)) meta = 'Demain';
  else if (isSameDay(day, yesterday)) meta = 'Hier';

  return {
    weekday: day.toLocaleDateString('fr-FR', { weekday: 'long' }),
    numeric: day.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }),
    meta,
  };
}

export function DayDetailModal({
  isOpen,
  onClose,
  day,
  occurrences,
  onCreate,
  onSelectOccurrence,
}: DayDetailModalProps) {
  if (!day) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="">
        <div />
      </Modal>
    );
  }

  const { weekday, numeric, meta } = dayHeaderLabel(day);

  // Tri : journée entière en premier, puis chronologique
  const sorted = [...occurrences].sort((a, b) => {
    if (a.allDay !== b.allDay) return a.allDay ? -1 : 1;
    const t = a.startAt.getTime() - b.startAt.getTime();
    if (t !== 0) return t;
    return a.title.localeCompare(b.title, 'fr');
  });

  // Stat synthétique en haut
  const counts = sorted.reduce<Partial<Record<Kind, number>>>((acc, occ) => {
    acc[occ.kind] = (acc[occ.kind] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`${weekday} ${numeric}`} size="lg">
      <div className="space-y-4">
        {/* Bandeau d'en-tête : date marquante + raccourcis */}
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-ws-line/50">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              {meta && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-[0.2em] bg-ws-accent/15 border border-ws-accent/35 text-ws-accent">
                  <Sparkles size={10} /> {meta}
                </span>
              )}
              <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-ws-mist">
                {sorted.length} entrée{sorted.length !== 1 ? 's' : ''}
              </span>
            </div>
            {Object.keys(counts).length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {(Object.keys(counts) as Kind[]).map((k) => {
                  const meta = KIND_META[k];
                  const Icon = meta.Icon;
                  return (
                    <span
                      key={k}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono border"
                      style={{
                        backgroundColor: `${meta.color}1A`,
                        borderColor: `${meta.color}55`,
                        color: meta.color,
                      }}
                    >
                      <Icon size={10} /> {meta.label} · {counts[k]}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
          <Button icon={<Plus size={14} />} size="sm" onClick={onCreate}>
            Nouvel événement
          </Button>
        </div>

        {/* Liste des occurrences */}
        {sorted.length === 0 ? (
          <div className="text-center py-12 px-4">
            <CalendarIcon size={28} className="mx-auto text-ws-mist/40 mb-3" />
            <p className="text-sm text-ws-paper font-semibold mb-1">Aucun événement ce jour-là.</p>
            <p className="text-xs text-ws-mist mb-5">
              Lance la création directement depuis cette journée.
            </p>
            <Button icon={<Plus size={14} />} onClick={onCreate}>
              Ajouter un événement
            </Button>
          </div>
        ) : (
          <ul className="space-y-2 max-h-[55vh] overflow-y-auto pr-1 -mr-1">
            {sorted.map((occ) => {
              const meta = KIND_META[occ.kind];
              const Icon = meta.Icon;
              const isPortalBooking =
                occ.kind === 'agenda' && occ.calendarEvent?.booking_source === 'portal';
              const linkedClient = occ.calendarEvent?.client?.name;
              const linkedProject = occ.calendarEvent?.project?.name;
              const description = occ.calendarEvent?.description;

              return (
                <li key={occ.occurrenceKey}>
                  <button
                    type="button"
                    onClick={() => onSelectOccurrence(occ)}
                    className="w-full text-left rounded-xl border bg-ws-deep/30 hover:bg-ws-deep/50 transition-colors p-3 flex items-start gap-3 group"
                    style={{ borderColor: `${meta.color}33` }}
                  >
                    {/* Pastille temps */}
                    <div
                      className="flex-shrink-0 w-16 flex flex-col items-center justify-center rounded-lg border py-1.5 px-1"
                      style={{
                        backgroundColor: `${meta.color}14`,
                        borderColor: `${meta.color}40`,
                        color: meta.color,
                      }}
                    >
                      {occ.allDay ? (
                        <span className="text-[9px] font-mono uppercase tracking-[0.14em] leading-tight text-center">
                          Journée
                        </span>
                      ) : (
                        <>
                          <span className="text-sm font-mono font-semibold tabular-nums leading-none">
                            {formatTime(occ.startAt)}
                          </span>
                          {occ.endAt && isSameDay(occ.endAt, occ.startAt) && (
                            <span className="text-[9px] font-mono opacity-70 mt-0.5">
                              {formatTime(occ.endAt)}
                            </span>
                          )}
                        </>
                      )}
                    </div>

                    {/* Corps */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono uppercase tracking-[0.18em]"
                          style={{
                            backgroundColor: `${meta.color}22`,
                            color: meta.color,
                          }}
                        >
                          <Icon size={10} />
                          {meta.label}
                        </span>
                        {isPortalBooking && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono uppercase tracking-[0.18em] bg-amber-500/15 text-amber-300 border border-amber-500/30">
                            Portail client
                          </span>
                        )}
                      </div>
                      <div className="text-sm font-semibold text-ws-paper truncate group-hover:text-white transition-colors">
                        {occ.title}
                      </div>
                      {(linkedClient || linkedProject) && (
                        <div className="text-[11px] font-mono text-ws-mist mt-1 truncate">
                          {linkedClient && (
                            <>
                              <Building2 size={10} className="inline mr-1 -mt-0.5" />
                              {linkedClient}
                            </>
                          )}
                          {linkedClient && linkedProject && <span className="mx-1.5 opacity-50">·</span>}
                          {linkedProject && (
                            <>
                              <FolderKanban size={10} className="inline mr-1 -mt-0.5" />
                              {linkedProject}
                            </>
                          )}
                        </div>
                      )}
                      {description && (
                        <p className="text-xs text-ws-ink/80 mt-2 line-clamp-2 leading-relaxed">
                          {description}
                        </p>
                      )}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Modal>
  );
}
