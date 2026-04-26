import { useMemo, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Settings,
  Loader2,
  AlertCircle,
  Calendar as CalendarIcon,
  RefreshCw,
  X,
  MapPin,
  Clock,
  Repeat,
  FileText,
} from 'lucide-react';
import { Header } from '../components/layout/Header';
import { Modal } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';
import { useAppleCalendar } from '../hooks/useAppleCalendar';
import type { IcsEvent } from '../lib/icsParser';
import { CalendarMonthView } from '../components/calendar-matis/CalendarMonthView';
import { CalendarWeekView } from '../components/calendar-matis/CalendarWeekView';
import { CalendarDayView } from '../components/calendar-matis/CalendarDayView';
import { CalendarSettingsModal } from '../components/calendar-matis/CalendarSettingsModal';

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

function formatTime(d: Date): string {
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

export function CalendarMatisPage() {
  const { events, loading, error, url, setUrl, refetch, lastFetchedAt } = useAppleCalendar();
  const [view, setView] = useState<ViewMode>('week');
  const [reference, setReference] = useState<Date>(() => new Date());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<IcsEvent | null>(null);

  const goToday = () => setReference(new Date());
  const goPrev = () => setReference((r) => shiftDate(view, r, -1));
  const goNext = () => setReference((r) => shiftDate(view, r, 1));

  const headerTitle = useMemo(() => formatHeaderTitle(view, reference), [view, reference]);

  const handleDayClick = (d: Date) => {
    setReference(d);
    setView('day');
  };

  return (
    <div>
      <Header
        title="Calendrier Matis"
        subtitle="Synchronisé en lecture seule depuis Apple Calendar"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              icon={<RefreshCw size={14} className={loading ? 'animate-spin' : ''} />}
              onClick={() => void refetch()}
              disabled={!url || loading}
              className="normal-case tracking-normal"
            >
              <span className="hidden sm:inline">Rafraîchir</span>
            </Button>
            <Button
              variant="secondary"
              icon={<Settings size={14} />}
              onClick={() => setSettingsOpen(true)}
              className="normal-case tracking-normal"
            >
              Réglages
            </Button>
          </div>
        }
      />

      <div className="px-4 md:px-8 py-5 md:py-6 space-y-5">
        {!url && !loading && (
          <div className="rounded-3xl border border-ws-line bg-ws-panel/60 p-10 text-center max-w-2xl mx-auto">
            <CalendarIcon size={28} className="mx-auto mb-3 text-ws-accent" />
            <h2 className="font-display text-xl font-semibold text-ws-paper mb-2">
              Connecte ton calendrier Apple
            </h2>
            <p className="text-sm text-ws-mist leading-relaxed mb-5 max-w-md mx-auto">
              Publie un calendrier iCloud (clic droit dans Apple Calendar →{' '}
              <em>Share Calendar</em> → coche <em>Public Calendar</em>), copie l'URL{' '}
              <code className="text-ws-accent">webcal://...</code> et colle-la dans les réglages.
            </p>
            <Button
              icon={<Settings size={14} />}
              onClick={() => setSettingsOpen(true)}
              className="normal-case tracking-normal"
            >
              Configurer
            </Button>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-3 p-4 rounded-2xl bg-ws-bear-dim border border-red-500/30 text-red-200 text-sm">
            <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <div className="font-mono">{error}</div>
              <div className="text-[11px] text-red-300/80 mt-1">
                Vérifie l'URL et que la fonction Edge <code>ics-proxy</code> est bien déployée
                sur Supabase.
              </div>
            </div>
          </div>
        )}

        {url && (
          <>
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
                <span className="font-mono text-sm">Chargement de ton calendrier…</span>
              </div>
            ) : view === 'day' ? (
              <CalendarDayView
                reference={reference}
                events={events}
                onEventClick={setSelectedEvent}
              />
            ) : view === 'week' ? (
              <CalendarWeekView
                reference={reference}
                events={events}
                onEventClick={setSelectedEvent}
              />
            ) : (
              <CalendarMonthView
                reference={reference}
                events={events}
                onEventClick={setSelectedEvent}
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
          </>
        )}
      </div>

      <CalendarSettingsModal
        isOpen={settingsOpen}
        currentUrl={url}
        onClose={() => setSettingsOpen(false)}
        onSave={setUrl}
        onRefresh={() => void refetch()}
        lastFetchedAt={lastFetchedAt}
        loading={loading}
      />

      {/* Event detail modal */}
      <Modal
        isOpen={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
        title={selectedEvent?.summary || 'Évènement'}
        size="md"
      >
        {selectedEvent && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              {selectedEvent.recurring && (
                <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-ws-accent/15 border border-ws-accent/30 text-[10px] font-mono uppercase tracking-[0.18em] text-ws-accent">
                  <Repeat size={10} />
                  Récurrent
                </span>
              )}
              {selectedEvent.allDay && (
                <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-ws-deep/50 border border-ws-line text-[10px] font-mono uppercase tracking-[0.18em] text-ws-mist">
                  Journée entière
                </span>
              )}
            </div>

            <div className="rounded-2xl border border-ws-line bg-ws-deep/40 p-4 space-y-3">
              <div className="flex items-start gap-2.5 text-sm text-ws-paper">
                <Clock size={14} className="mt-0.5 text-ws-accent flex-shrink-0" />
                <div>
                  <div className="font-mono">
                    {selectedEvent.start.toLocaleDateString('fr-FR', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </div>
                  {!selectedEvent.allDay && (
                    <div className="font-mono text-xs text-ws-mist mt-0.5">
                      {formatTime(selectedEvent.start)} – {formatTime(selectedEvent.end)}
                    </div>
                  )}
                </div>
              </div>

              {selectedEvent.location && (
                <div className="flex items-start gap-2.5 text-sm text-ws-paper">
                  <MapPin size={14} className="mt-0.5 text-ws-accent flex-shrink-0" />
                  <div className="break-words">{selectedEvent.location}</div>
                </div>
              )}

              {selectedEvent.description && (
                <div className="flex items-start gap-2.5 text-sm text-ws-ink">
                  <FileText size={14} className="mt-0.5 text-ws-accent flex-shrink-0" />
                  <div className="whitespace-pre-wrap break-words">
                    {selectedEvent.description}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <Button
                variant="secondary"
                icon={<X size={14} />}
                onClick={() => setSelectedEvent(null)}
                className="normal-case tracking-normal"
              >
                Fermer
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
