import { useMemo, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  RefreshCw,
  Plus,
} from 'lucide-react';
import { Header } from '../components/layout/Header';
import { Button } from '../components/ui/Button';
import { useCaldavCalendar } from '../hooks/useCaldavCalendar';
import type { IcsEvent } from '../lib/icsParser';
import { CalendarMonthView } from '../components/calendar-matis/CalendarMonthView';
import { CalendarWeekView } from '../components/calendar-matis/CalendarWeekView';
import { CalendarDayView } from '../components/calendar-matis/CalendarDayView';
import { EventEditorModal } from '../components/calendar-matis/EventEditorModal';

type ViewMode = 'day' | 'week' | 'month';

const VIEW_LABELS: Record<ViewMode, string> = {
  day: 'Jour',
  week: 'Semaine',
  month: 'Mois',
};

const MONTHS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

function formatHeaderTitle(view: ViewMode, ref: Date): string {
  if (view === 'month') return `${MONTHS_FR[ref.getMonth()]} ${ref.getFullYear()}`;
  if (view === 'week') {
    const start = new Date(ref);
    const day = start.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    start.setDate(start.getDate() + diff);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    const sameMonth = start.getMonth() === end.getMonth();
    if (sameMonth) {
      return `${start.getDate()}–${end.getDate()} ${MONTHS_FR[start.getMonth()]} ${start.getFullYear()}`;
    }
    return `${start.getDate()} ${MONTHS_FR[start.getMonth()].slice(0, 3)}. – ${end.getDate()} ${MONTHS_FR[end.getMonth()].slice(0, 3)}. ${end.getFullYear()}`;
  }
  return ref.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function shiftDate(view: ViewMode, ref: Date, dir: -1 | 1): Date {
  const d = new Date(ref);
  if (view === 'day') d.setDate(d.getDate() + dir);
  else if (view === 'week') d.setDate(d.getDate() + dir * 7);
  else d.setMonth(d.getMonth() + dir);
  return d;
}

export function CalendarMatisPage() {
  const {
    events,
    loading,
    error,
    calendarName,
    lastFetchedAt,
    refetch,
    createEvent,
    updateEvent,
    deleteEvent,
  } = useCaldavCalendar();
  const [view, setView] = useState<ViewMode>('week');
  const [reference, setReference] = useState<Date>(() => new Date());
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorInitial, setEditorInitial] = useState<IcsEvent | null>(null);
  const [editorDefaultStart, setEditorDefaultStart] = useState<Date | undefined>(undefined);

  const goToday = () => setReference(new Date());
  const goPrev = () => setReference((r) => shiftDate(view, r, -1));
  const goNext = () => setReference((r) => shiftDate(view, r, 1));

  const headerTitle = useMemo(() => formatHeaderTitle(view, reference), [view, reference]);

  const openCreate = (defaultStart?: Date) => {
    setEditorInitial(null);
    setEditorDefaultStart(defaultStart);
    setEditorOpen(true);
  };

  const openEdit = (ev: IcsEvent) => {
    setEditorInitial(ev);
    setEditorDefaultStart(undefined);
    setEditorOpen(true);
  };

  const handleDayClick = (d: Date) => {
    setReference(d);
    setView('day');
  };

  return (
    <div>
      <Header
        title="Calendrier Matis"
        subtitle={
          calendarName
            ? `Synchronisé bidirectionnel · ${calendarName} (Apple Calendar)`
            : 'Synchronisation Apple Calendar via CalDAV'
        }
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              icon={<RefreshCw size={14} className={loading ? 'animate-spin' : ''} />}
              onClick={() => void refetch()}
              disabled={loading}
              className="normal-case tracking-normal"
            >
              <span className="hidden sm:inline">Rafraîchir</span>
            </Button>
            <Button
              icon={<Plus size={14} />}
              onClick={() => openCreate()}
              className="normal-case tracking-normal"
            >
              Nouvel évènement
            </Button>
          </div>
        }
      />

      <div className="px-4 md:px-8 py-5 md:py-6 space-y-5">
        {error && (
          <div className="flex items-start gap-3 p-4 rounded-2xl bg-ws-bear-dim border border-red-500/30 text-red-200 text-sm">
            <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <div className="font-mono break-all">{error}</div>
              <div className="text-[11px] text-red-300/80 mt-1 leading-relaxed">
                Vérifie : (1) la fonction Edge <code>caldav</code> est déployée avec
                <code> --no-verify-jwt</code>, (2) les secrets Supabase
                <code> APPLE_ID</code>, <code>APPLE_APP_PASSWORD</code>,
                <code> APPLE_CALENDAR_NAME</code> sont définis, (3) ton app password Apple est
                valide (régénère-le sur appleid.apple.com si besoin).
              </div>
            </div>
          </div>
        )}

        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-ws-line bg-ws-panel/40 px-4 py-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={goPrev}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-ws-line bg-ws-deep/40 text-ws-mist hover:text-ws-paper hover:border-ws-accent/40 transition-colors touch-manipulation"
              aria-label="Précédent"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              onClick={goToday}
              className="px-3.5 h-9 rounded-xl border border-ws-line bg-ws-deep/40 text-xs font-mono uppercase tracking-[0.18em] text-ws-paper hover:border-ws-accent/40 transition-colors touch-manipulation"
            >
              Aujourd'hui
            </button>
            <button
              type="button"
              onClick={goNext}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-ws-line bg-ws-deep/40 text-ws-mist hover:text-ws-paper hover:border-ws-accent/40 transition-colors touch-manipulation"
              aria-label="Suivant"
            >
              <ChevronRight size={16} />
            </button>
            <div className="ml-3 font-display text-lg md:text-xl text-ws-paper font-semibold capitalize">
              {headerTitle}
            </div>
          </div>

          <div className="flex items-center gap-1 p-1 rounded-xl bg-ws-deep/60 border border-ws-line">
            {(['day', 'week', 'month'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setView(m)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono uppercase tracking-[0.16em] transition-all ${
                  view === m
                    ? 'bg-ws-panel text-ws-paper shadow-sm'
                    : 'text-ws-mist hover:text-ws-paper'
                }`}
              >
                {VIEW_LABELS[m]}
              </button>
            ))}
          </div>
        </div>

        {loading && events.length === 0 ? (
          <div className="flex items-center justify-center gap-3 text-ws-mist py-24">
            <Loader2 size={16} className="animate-spin" />
            <span className="font-mono text-sm">Connexion à Apple Calendar via CalDAV…</span>
          </div>
        ) : view === 'day' ? (
          <CalendarDayView reference={reference} events={events} onEventClick={openEdit} />
        ) : view === 'week' ? (
          <CalendarWeekView reference={reference} events={events} onEventClick={openEdit} />
        ) : (
          <CalendarMonthView
            reference={reference}
            events={events}
            onEventClick={openEdit}
            onDayClick={handleDayClick}
          />
        )}

        <div className="text-[11px] font-mono text-ws-mist/70 text-center">
          {events.length} évènement{events.length > 1 ? 's' : ''} chargé
          {events.length > 1 ? 's' : ''}
          {lastFetchedAt && (
            <>
              {' · '}sync à{' '}
              {lastFetchedAt.toLocaleTimeString('fr-FR', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </>
          )}
        </div>
      </div>

      <EventEditorModal
        isOpen={editorOpen}
        onClose={() => setEditorOpen(false)}
        initial={editorInitial}
        defaultStart={editorDefaultStart}
        onCreate={createEvent}
        onUpdate={updateEvent}
        onDelete={deleteEvent}
      />
    </div>
  );
}
