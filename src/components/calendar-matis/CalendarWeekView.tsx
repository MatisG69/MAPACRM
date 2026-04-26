import { useMemo } from 'react';
import type { IcsEvent } from '../../lib/icsParser';
import { Repeat, MapPin, Clock } from 'lucide-react';

interface CalendarWeekViewProps {
  /** Date de référence — on affiche la semaine contenant cette date (lundi → dimanche) */
  reference: Date;
  events: IcsEvent[];
  onEventClick?: (event: IcsEvent) => void;
}

const DAY_LABELS_FR = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

const HOUR_START = 7;
const HOUR_END = 22;
const HOURS = Array.from({ length: HOUR_END - HOUR_START + 1 }, (_, i) => HOUR_START + i);
const SLOT_HEIGHT_PX = 56; // hauteur d'une heure
const PX_PER_MIN = SLOT_HEIGHT_PX / 60;

/** Lundi de la semaine contenant `d` (00:00:00). */
function startOfWeek(d: Date): Date {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  const day = r.getDay(); // 0 = dim, 1 = lun, ...
  const diff = day === 0 ? -6 : 1 - day;
  r.setDate(r.getDate() + diff);
  return r;
}

function sameDate(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
  );
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

export function CalendarWeekView({ reference, events, onEventClick }: CalendarWeekViewProps) {
  const weekStart = useMemo(() => startOfWeek(reference), [reference]);
  const days = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const d = new Date(weekStart);
        d.setDate(weekStart.getDate() + i);
        return d;
      }),
    [weekStart]
  );

  const today = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);

  /** Events groupés par jour (clé YYYY-MM-DD). */
  const eventsByDay = useMemo(() => {
    const map = new Map<string, { allDay: IcsEvent[]; timed: IcsEvent[] }>();
    for (const d of days) {
      const k = d.toISOString().slice(0, 10);
      map.set(k, { allDay: [], timed: [] });
    }
    for (const ev of events) {
      // Pour les events qui s'étalent sur plusieurs jours, on les ajoute à chaque jour intersecté
      const evStart = new Date(ev.start);
      evStart.setHours(0, 0, 0, 0);
      const evEnd = new Date(ev.end);
      evEnd.setHours(0, 0, 0, 0);
      for (const d of days) {
        if (d < evStart) continue;
        if (d > evEnd) break;
        const k = d.toISOString().slice(0, 10);
        const bucket = map.get(k);
        if (!bucket) continue;
        if (ev.allDay) bucket.allDay.push(ev);
        else if (sameDate(ev.start, d)) bucket.timed.push(ev);
      }
    }
    return map;
  }, [events, days]);

  // Position du curseur "maintenant" dans la grille (px depuis le haut)
  const nowOffset = useMemo(() => {
    const now = new Date();
    if (now.getHours() < HOUR_START || now.getHours() > HOUR_END) return null;
    return ((now.getHours() - HOUR_START) * 60 + now.getMinutes()) * PX_PER_MIN;
  }, []);

  return (
    <div className="rounded-2xl border border-ws-line bg-ws-panel/40 overflow-hidden">
      {/* En-tête : jours de la semaine */}
      <div className="grid grid-cols-[64px_repeat(7,1fr)] border-b border-ws-line bg-ws-deep/30">
        <div />
        {days.map((d) => {
          const isToday = sameDate(d, today);
          return (
            <div
              key={d.toISOString()}
              className={`px-2 py-3 text-center border-l border-ws-line ${
                isToday ? 'bg-ws-accent/8' : ''
              }`}
            >
              <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-ws-mist">
                {DAY_LABELS_FR[(d.getDay() + 6) % 7]}
              </div>
              <div
                className={`mt-1 text-base font-semibold ${
                  isToday ? 'text-ws-accent' : 'text-ws-paper'
                }`}
              >
                {d.getDate()}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bandeau all-day */}
      <div className="grid grid-cols-[64px_repeat(7,1fr)] border-b border-ws-line bg-ws-deep/15 min-h-[36px]">
        <div className="px-2 py-2 text-[9px] font-mono uppercase tracking-[0.18em] text-ws-mist text-right pr-3">
          all-day
        </div>
        {days.map((d) => {
          const k = d.toISOString().slice(0, 10);
          const bucket = eventsByDay.get(k);
          const allDay = bucket?.allDay ?? [];
          return (
            <div
              key={k}
              className="border-l border-ws-line py-1 px-1 flex flex-col gap-0.5 min-w-0"
            >
              {allDay.map((ev) => (
                <button
                  key={ev.uid + ev.start.toISOString()}
                  type="button"
                  onClick={() => onEventClick?.(ev)}
                  className="w-full text-left rounded-md bg-ws-accent/12 hover:bg-ws-accent/20 border-l-2 border-ws-accent text-[10px] font-mono text-ws-accent-soft px-1.5 py-0.5 truncate transition-colors"
                  title={ev.summary}
                >
                  {ev.recurring && <Repeat size={9} className="inline mr-1" />}
                  {ev.summary || '(sans titre)'}
                </button>
              ))}
            </div>
          );
        })}
      </div>

      {/* Grille horaire */}
      <div className="grid grid-cols-[64px_repeat(7,1fr)] relative" style={{ height: HOURS.length * SLOT_HEIGHT_PX }}>
        {/* Colonne des heures */}
        <div className="relative">
          {HOURS.map((h, idx) => (
            <div
              key={h}
              className="absolute right-2 text-[10px] font-mono text-ws-mist"
              style={{ top: idx * SLOT_HEIGHT_PX - 6 }}
            >
              {idx === 0 ? '' : `${h.toString().padStart(2, '0')}:00`}
            </div>
          ))}
        </div>

        {/* Colonnes des jours */}
        {days.map((d) => {
          const k = d.toISOString().slice(0, 10);
          const bucket = eventsByDay.get(k);
          const timed = bucket?.timed ?? [];
          const isToday = sameDate(d, today);
          return (
            <div
              key={k}
              className={`relative border-l border-ws-line ${isToday ? 'bg-ws-accent/4' : ''}`}
            >
              {/* Lignes horaires */}
              {HOURS.map((_, idx) => (
                <div
                  key={idx}
                  className="absolute left-0 right-0 border-t border-ws-line/50"
                  style={{ top: idx * SLOT_HEIGHT_PX }}
                />
              ))}

              {/* Curseur "maintenant" */}
              {isToday && nowOffset !== null && (
                <div
                  className="absolute left-0 right-0 z-20 pointer-events-none"
                  style={{ top: nowOffset }}
                >
                  <div className="h-px bg-ws-accent shadow-[0_0_8px_rgba(175,112,55,0.6)]" />
                  <div className="absolute -left-1 -top-1.5 w-2.5 h-2.5 rounded-full bg-ws-accent shadow-[0_0_6px_rgba(175,112,55,0.8)]" />
                </div>
              )}

              {/* Events */}
              {timed.map((ev) => {
                const startMin =
                  (ev.start.getHours() - HOUR_START) * 60 + ev.start.getMinutes();
                const durationMin = Math.max(
                  20,
                  (ev.end.getTime() - ev.start.getTime()) / 60000
                );
                const top = startMin * PX_PER_MIN;
                const height = durationMin * PX_PER_MIN;
                if (top + height < 0 || top > HOURS.length * SLOT_HEIGHT_PX) return null;
                return (
                  <button
                    key={ev.uid + ev.start.toISOString()}
                    type="button"
                    onClick={() => onEventClick?.(ev)}
                    className="absolute left-0.5 right-0.5 z-10 rounded-md bg-ws-accent/15 hover:bg-ws-accent/22 border-l-2 border-ws-accent text-left px-1.5 py-1 overflow-hidden transition-colors group"
                    style={{ top: Math.max(0, top), height }}
                    title={ev.summary}
                  >
                    <div className="text-[11px] font-semibold text-ws-paper truncate flex items-center gap-1">
                      {ev.recurring && <Repeat size={9} className="text-ws-accent flex-shrink-0" />}
                      {ev.summary || '(sans titre)'}
                    </div>
                    {height > 32 && (
                      <div className="text-[9px] font-mono text-ws-accent-soft mt-0.5 flex items-center gap-1">
                        <Clock size={8} />
                        {formatTime(ev.start)}–{formatTime(ev.end)}
                      </div>
                    )}
                    {height > 56 && ev.location && (
                      <div className="text-[9px] font-mono text-ws-mist mt-0.5 flex items-center gap-1 truncate">
                        <MapPin size={8} />
                        {ev.location}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
