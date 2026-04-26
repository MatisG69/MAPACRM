import { useMemo } from 'react';
import type { IcsEvent } from '../../lib/icsParser';
import { Repeat, MapPin, Clock } from 'lucide-react';

interface CalendarDayViewProps {
  reference: Date;
  events: IcsEvent[];
  onEventClick?: (event: IcsEvent) => void;
}

const HOUR_START = 7;
const HOUR_END = 22;
const HOURS = Array.from({ length: HOUR_END - HOUR_START + 1 }, (_, i) => HOUR_START + i);
const SLOT_HEIGHT_PX = 64;
const PX_PER_MIN = SLOT_HEIGHT_PX / 60;

function sameDate(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
  );
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

export function CalendarDayView({ reference, events, onEventClick }: CalendarDayViewProps) {
  const today = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);
  const isToday = sameDate(reference, today);

  const { allDay, timed } = useMemo(() => {
    const allDay: IcsEvent[] = [];
    const timed: IcsEvent[] = [];
    for (const ev of events) {
      const start = new Date(ev.start);
      start.setHours(0, 0, 0, 0);
      const end = new Date(ev.end);
      end.setHours(0, 0, 0, 0);
      if (reference < start || reference > end) continue;
      if (ev.allDay) allDay.push(ev);
      else if (sameDate(ev.start, reference)) timed.push(ev);
    }
    return { allDay, timed };
  }, [events, reference]);

  const nowOffset = useMemo(() => {
    if (!isToday) return null;
    const now = new Date();
    if (now.getHours() < HOUR_START || now.getHours() > HOUR_END) return null;
    return ((now.getHours() - HOUR_START) * 60 + now.getMinutes()) * PX_PER_MIN;
  }, [isToday]);

  return (
    <div className="rounded-2xl border border-ws-line bg-ws-panel/40 overflow-hidden">
      {allDay.length > 0 && (
        <div className="border-b border-ws-line bg-ws-deep/15 px-4 py-2 flex flex-wrap gap-2">
          <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-ws-mist self-center mr-1">
            All-day
          </span>
          {allDay.map((ev) => (
            <button
              key={ev.uid + ev.start.toISOString()}
              type="button"
              onClick={() => onEventClick?.(ev)}
              className="rounded-md bg-ws-accent/12 hover:bg-ws-accent/20 border-l-2 border-ws-accent text-[11px] font-mono text-ws-accent-soft px-2 py-1 transition-colors"
            >
              {ev.recurring && <Repeat size={10} className="inline mr-1" />}
              {ev.summary || '(sans titre)'}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-[72px_1fr] relative" style={{ height: HOURS.length * SLOT_HEIGHT_PX }}>
        <div className="relative">
          {HOURS.map((h, idx) => (
            <div
              key={h}
              className="absolute right-3 text-[10px] font-mono text-ws-mist"
              style={{ top: idx * SLOT_HEIGHT_PX - 6 }}
            >
              {idx === 0 ? '' : `${h.toString().padStart(2, '0')}:00`}
            </div>
          ))}
        </div>
        <div className={`relative border-l border-ws-line ${isToday ? 'bg-ws-accent/3' : ''}`}>
          {HOURS.map((_, idx) => (
            <div
              key={idx}
              className="absolute left-0 right-0 border-t border-ws-line/50"
              style={{ top: idx * SLOT_HEIGHT_PX }}
            />
          ))}
          {nowOffset !== null && (
            <div className="absolute left-0 right-0 z-20 pointer-events-none" style={{ top: nowOffset }}>
              <div className="h-px bg-ws-accent shadow-[0_0_8px_rgba(175,112,55,0.6)]" />
              <div className="absolute -left-1 -top-1.5 w-2.5 h-2.5 rounded-full bg-ws-accent shadow-[0_0_6px_rgba(175,112,55,0.8)]" />
            </div>
          )}
          {timed.map((ev) => {
            const startMin = (ev.start.getHours() - HOUR_START) * 60 + ev.start.getMinutes();
            const durationMin = Math.max(20, (ev.end.getTime() - ev.start.getTime()) / 60000);
            const top = startMin * PX_PER_MIN;
            const height = durationMin * PX_PER_MIN;
            if (top + height < 0 || top > HOURS.length * SLOT_HEIGHT_PX) return null;
            return (
              <button
                key={ev.uid + ev.start.toISOString()}
                type="button"
                onClick={() => onEventClick?.(ev)}
                className="absolute left-2 right-3 z-10 rounded-md bg-ws-accent/15 hover:bg-ws-accent/22 border-l-2 border-ws-accent text-left px-3 py-2 overflow-hidden transition-colors"
                style={{ top: Math.max(0, top), height }}
              >
                <div className="text-sm font-semibold text-ws-paper truncate flex items-center gap-1.5">
                  {ev.recurring && <Repeat size={11} className="text-ws-accent flex-shrink-0" />}
                  {ev.summary || '(sans titre)'}
                </div>
                <div className="text-[11px] font-mono text-ws-accent-soft mt-0.5 flex items-center gap-1.5">
                  <Clock size={10} />
                  {formatTime(ev.start)}–{formatTime(ev.end)}
                </div>
                {ev.location && height > 56 && (
                  <div className="text-[11px] font-mono text-ws-mist mt-1 flex items-center gap-1.5 truncate">
                    <MapPin size={10} />
                    {ev.location}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
