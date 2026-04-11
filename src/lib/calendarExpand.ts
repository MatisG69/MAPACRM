import type { CalendarEvent } from './types';

export interface CalendarOccurrence {
  event: CalendarEvent;
  /** Identifiant unique pour cette occurrence (édition = événement parent) */
  occurrenceKey: string;
  startAt: Date;
  endAt: Date | null;
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function parseEventStart(e: CalendarEvent): Date {
  return new Date(e.start_at);
}

function parseEventEnd(e: CalendarEvent): Date | null {
  if (!e.end_at) return null;
  return new Date(e.end_at);
}

function durationMs(e: CalendarEvent): number {
  const s = parseEventStart(e);
  const en = parseEventEnd(e);
  if (!en) return e.all_day ? 24 * 60 * 60 * 1000 - 1 : 60 * 60 * 1000;
  return Math.max(en.getTime() - s.getTime(), 0);
}

function overlapsRange(start: Date, end: Date, rangeStart: Date, rangeEnd: Date): boolean {
  return start <= rangeEnd && end >= rangeStart;
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function addMonths(d: Date, n: number): Date {
  const x = new Date(d);
  const day = x.getDate();
  x.setMonth(x.getMonth() + n);
  if (x.getDate() < day) x.setDate(0);
  return x;
}

const MAX_EXPAND = 200;

/** Produit les occurrences visibles entre rangeStart (inclus) et rangeEnd (inclus, fin de journée). */
export function expandCalendarEvents(
  events: CalendarEvent[],
  rangeStart: Date,
  rangeEnd: Date
): CalendarOccurrence[] {
  const rs = startOfDay(rangeStart);
  const re = endOfDay(rangeEnd);
  const out: CalendarOccurrence[] = [];

  for (const e of events) {
    const baseStart = parseEventStart(e);
    const dur = durationMs(e);
    const until = e.recurrence_until ? endOfDay(new Date(e.recurrence_until)) : null;

    if (e.recurrence === 'none') {
      const start = e.all_day ? startOfDay(baseStart) : baseStart;
      const end = e.all_day
        ? endOfDay(baseStart)
        : parseEventEnd(e) ?? new Date(baseStart.getTime() + dur);
      if (overlapsRange(start, end, rs, re)) {
        out.push({
          event: e,
          occurrenceKey: e.id,
          startAt: start,
          endAt: e.all_day ? null : parseEventEnd(e) ?? new Date(baseStart.getTime() + dur),
        });
      }
      continue;
    }

    let cursor = new Date(baseStart);
    if (cursor < rs) {
      if (e.recurrence === 'daily') {
        const dayMs = 24 * 60 * 60 * 1000;
        let n = Math.floor((rs.getTime() - cursor.getTime()) / dayMs);
        cursor = addDays(cursor, Math.max(0, n));
        let guard = 0;
        while (cursor < rs && guard++ < MAX_EXPAND) cursor = addDays(cursor, 1);
      } else if (e.recurrence === 'weekly') {
        const weekMs = 7 * 24 * 60 * 60 * 1000;
        let n = Math.floor((rs.getTime() - cursor.getTime()) / weekMs);
        cursor = addDays(cursor, n * 7);
        let guard = 0;
        while (cursor < rs && guard++ < MAX_EXPAND) cursor = addDays(cursor, 7);
      } else if (e.recurrence === 'monthly') {
        let guard = 0;
        while (cursor < rs && guard++ < MAX_EXPAND) cursor = addMonths(cursor, 1);
      }
    }

    let count = 0;
    while (count < MAX_EXPAND) {
      if (until && cursor > until) break;
      const occEnd = e.all_day
        ? endOfDay(cursor)
        : new Date(cursor.getTime() + (dur || 60 * 60 * 1000));

      if (cursor > re) break;
      if (overlapsRange(cursor, occEnd, rs, re)) {
        out.push({
          event: e,
          occurrenceKey: `${e.id}__${cursor.toISOString()}`,
          startAt: new Date(cursor),
          endAt: e.all_day ? null : new Date(cursor.getTime() + dur),
        });
      }

      if (e.recurrence === 'daily') {
        cursor = addDays(cursor, 1);
      } else if (e.recurrence === 'weekly') {
        cursor = addDays(cursor, 7);
      } else if (e.recurrence === 'monthly') {
        cursor = addMonths(cursor, 1);
      } else {
        break;
      }
      count++;
    }
  }

  return out.sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
}
