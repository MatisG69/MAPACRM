import { useMemo } from 'react';
import type { IcsEvent } from '../../lib/icsParser';

interface CalendarMonthViewProps {
  reference: Date;
  events: IcsEvent[];
  onEventClick?: (event: IcsEvent) => void;
  onDayClick?: (date: Date) => void;
}

const DAY_LABELS_FR = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

function startOfMonthGrid(d: Date): Date {
  const first = new Date(d.getFullYear(), d.getMonth(), 1);
  const day = first.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const start = new Date(first);
  start.setDate(first.getDate() + diff);
  start.setHours(0, 0, 0, 0);
  return start;
}

function sameDate(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
  );
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

const MAX_VISIBLE_PER_DAY = 3;

export function CalendarMonthView({
  reference,
  events,
  onEventClick,
  onDayClick,
}: CalendarMonthViewProps) {
  const today = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);

  const gridStart = useMemo(() => startOfMonthGrid(reference), [reference]);

  const days = useMemo(() => {
    const cells: Date[] = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(gridStart);
      d.setDate(gridStart.getDate() + i);
      cells.push(d);
    }
    return cells;
  }, [gridStart]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, IcsEvent[]>();
    for (const d of days) map.set(d.toISOString().slice(0, 10), []);
    for (const ev of events) {
      const evStart = new Date(ev.start);
      evStart.setHours(0, 0, 0, 0);
      const evEnd = new Date(ev.end);
      evEnd.setHours(0, 0, 0, 0);
      for (const d of days) {
        if (d < evStart) continue;
        if (d > evEnd) break;
        const k = d.toISOString().slice(0, 10);
        const list = map.get(k);
        if (list) list.push(ev);
      }
    }
    // tri par heure dans la journée (all-day d'abord)
    for (const list of map.values()) {
      list.sort((a, b) => {
        if (a.allDay && !b.allDay) return -1;
        if (!a.allDay && b.allDay) return 1;
        return a.start.getTime() - b.start.getTime();
      });
    }
    return map;
  }, [events, days]);

  const currentMonth = reference.getMonth();

  return (
    <div className="rounded-2xl border border-ws-line bg-ws-panel/40 overflow-hidden">
      {/* Header jours */}
      <div className="grid grid-cols-7 border-b border-ws-line bg-ws-deep/30">
        {DAY_LABELS_FR.map((d) => (
          <div
            key={d}
            className="px-2 py-2 text-center text-[10px] font-mono uppercase tracking-[0.2em] text-ws-mist"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Grille 6×7 */}
      <div className="grid grid-cols-7 grid-rows-6 auto-rows-fr">
        {days.map((d, idx) => {
          const isToday = sameDate(d, today);
          const isOtherMonth = d.getMonth() !== currentMonth;
          const k = d.toISOString().slice(0, 10);
          const dayEvents = eventsByDay.get(k) ?? [];
          const visible = dayEvents.slice(0, MAX_VISIBLE_PER_DAY);
          const overflow = dayEvents.length - visible.length;

          return (
            <button
              type="button"
              key={k}
              onClick={() => onDayClick?.(d)}
              className={`relative text-left border-r border-b border-ws-line/60 min-h-[88px] p-1.5 transition-colors hover:bg-ws-raised/30 ${
                isOtherMonth ? 'bg-ws-deep/20' : ''
              } ${isToday ? 'bg-ws-accent/5' : ''} ${(idx + 1) % 7 === 0 ? 'border-r-0' : ''}`}
            >
              <div className="flex items-center justify-between mb-1">
                <span
                  className={`text-xs font-mono ${
                    isToday
                      ? 'inline-flex items-center justify-center w-5 h-5 rounded-full bg-ws-accent text-ws-void font-bold'
                      : isOtherMonth
                      ? 'text-ws-mist/40'
                      : 'text-ws-paper'
                  }`}
                >
                  {d.getDate()}
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                {visible.map((ev) => (
                  <span
                    key={ev.uid + ev.start.toISOString()}
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEventClick?.(ev);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.stopPropagation();
                        onEventClick?.(ev);
                      }
                    }}
                    className={`text-[10px] truncate rounded px-1 py-0.5 cursor-pointer transition-colors ${
                      ev.allDay
                        ? 'bg-ws-accent/15 text-ws-accent-soft hover:bg-ws-accent/25'
                        : 'text-ws-paper hover:bg-ws-accent/10'
                    }`}
                    title={`${ev.summary}${
                      ev.allDay ? '' : ` · ${formatTime(ev.start)}`
                    }`}
                  >
                    {!ev.allDay && (
                      <span className="font-mono text-ws-accent mr-1">
                        {formatTime(ev.start)}
                      </span>
                    )}
                    {ev.summary || '(sans titre)'}
                  </span>
                ))}
                {overflow > 0 && (
                  <span className="text-[9px] font-mono text-ws-mist pl-1">
                    + {overflow} autre{overflow > 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
