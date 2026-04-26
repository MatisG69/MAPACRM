/**
 * Parser iCalendar (RFC 5545) minimaliste mais robuste pour MAPA CRM.
 * --------------------------------------------------------------------
 * Gère :
 *  - VEVENT (SUMMARY, DESCRIPTION, LOCATION, UID, DTSTART, DTEND, RRULE, EXDATE)
 *  - Lignes pliées (continuation avec espace/tab en début)
 *  - DATE et DATE-TIME (UTC + TZID local)
 *  - Récurrences FREQ=DAILY|WEEKLY|MONTHLY|YEARLY avec INTERVAL, COUNT, UNTIL, BYDAY
 *  - EXDATE pour exclure des occurrences spécifiques
 *
 * Limitations volontaires (non implémentées) :
 *  - VTIMEZONE complexe → on traite TZID comme « heure locale du navigateur »
 *  - BYMONTHDAY, BYSETPOS, WKST avancé
 *  - Évènements modifiés (RECURRENCE-ID)
 *
 * Pour la majorité des calendriers iCloud personnels, c'est largement
 * suffisant. Si on a besoin de plus tard, on swappera vers `ical.js`.
 */

export interface IcsEvent {
  uid: string;
  summary: string;
  description: string | null;
  location: string | null;
  /** ISO local (sans Z) ou ISO UTC (avec Z) */
  start: Date;
  end: Date;
  allDay: boolean;
  /** Source de récurrence (utile pour debug / styling) */
  recurring: boolean;
}

interface RawEvent {
  uid: string;
  summary: string;
  description: string | null;
  location: string | null;
  dtstart: { value: string; tzid: string | null; isDate: boolean };
  dtend: { value: string; tzid: string | null; isDate: boolean } | null;
  rrule: string | null;
  exdates: string[];
}

/** Reconstitue les lignes ICS pliées (RFC 5545 § 3.1) */
function unfoldLines(text: string): string[] {
  const raw = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const out: string[] = [];
  for (const line of raw) {
    if (line.length === 0) continue;
    if ((line.startsWith(' ') || line.startsWith('\t')) && out.length > 0) {
      out[out.length - 1] += line.slice(1);
    } else {
      out.push(line);
    }
  }
  return out;
}

/** Parse une ligne « PROP;PARAM=VAL:VALUE » en { name, params, value } */
function parseLine(line: string): { name: string; params: Record<string, string>; value: string } | null {
  const colonIdx = line.indexOf(':');
  if (colonIdx === -1) return null;
  const head = line.slice(0, colonIdx);
  const value = line.slice(colonIdx + 1);
  const parts = head.split(';');
  const name = parts[0].toUpperCase();
  const params: Record<string, string> = {};
  for (let i = 1; i < parts.length; i++) {
    const eq = parts[i].indexOf('=');
    if (eq === -1) continue;
    params[parts[i].slice(0, eq).toUpperCase()] = parts[i].slice(eq + 1);
  }
  return { name, params, value };
}

/** Décode les caractères échappés (\\n, \\,, \\;, \\\\) */
function unescapeText(s: string): string {
  return s
    .replace(/\\n/gi, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\');
}

/**
 * Convertit une valeur ICS en Date.
 * Formats acceptés :
 *   - 20260424          (DATE — all-day)
 *   - 20260424T093000   (DATE-TIME locale, à interpréter avec TZID)
 *   - 20260424T093000Z  (DATE-TIME UTC)
 */
function parseIcsDate(value: string, tzid: string | null): { date: Date; isDate: boolean } {
  const isDate = !value.includes('T');
  if (isDate) {
    const y = Number(value.slice(0, 4));
    const m = Number(value.slice(4, 6)) - 1;
    const d = Number(value.slice(6, 8));
    return { date: new Date(y, m, d, 0, 0, 0, 0), isDate: true };
  }
  const y = Number(value.slice(0, 4));
  const m = Number(value.slice(4, 6)) - 1;
  const d = Number(value.slice(6, 8));
  const hh = Number(value.slice(9, 11));
  const mm = Number(value.slice(11, 13));
  const ss = Number(value.slice(13, 15));
  if (value.endsWith('Z')) {
    return { date: new Date(Date.UTC(y, m, d, hh, mm, ss)), isDate: false };
  }
  // Heure locale (TZID ignoré → on assume timezone du navigateur ; suffisant pour iCloud perso)
  void tzid;
  return { date: new Date(y, m, d, hh, mm, ss), isDate: false };
}

/** Parse RRULE en map { FREQ, INTERVAL, COUNT, UNTIL, BYDAY } */
function parseRRule(rrule: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const seg of rrule.split(';')) {
    const eq = seg.indexOf('=');
    if (eq === -1) continue;
    out[seg.slice(0, eq).toUpperCase()] = seg.slice(eq + 1);
  }
  return out;
}

const DAY_TO_INDEX: Record<string, number> = {
  SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6,
};

/**
 * Étend une RRULE en occurrences concrètes dans la fenêtre [windowStart, windowEnd].
 * Retourne au max ~500 occurrences pour éviter les boucles infinies.
 */
function expandRRule(
  raw: RawEvent,
  windowStart: Date,
  windowEnd: Date
): IcsEvent[] {
  if (!raw.rrule) return [];
  const rule = parseRRule(raw.rrule);
  const freq = rule.FREQ;
  const interval = Math.max(1, parseInt(rule.INTERVAL || '1', 10));
  const count = rule.COUNT ? parseInt(rule.COUNT, 10) : Infinity;
  const until = rule.UNTIL ? parseIcsDate(rule.UNTIL, null).date : null;
  const byday = rule.BYDAY ? rule.BYDAY.split(',') : null;

  const startParsed = parseIcsDate(raw.dtstart.value, raw.dtstart.tzid);
  const endParsed = raw.dtend ? parseIcsDate(raw.dtend.value, raw.dtend.tzid) : null;
  const duration = endParsed
    ? endParsed.date.getTime() - startParsed.date.getTime()
    : startParsed.isDate
      ? 24 * 60 * 60 * 1000
      : 60 * 60 * 1000;

  // Set d'EXDATE en ms pour exclure rapidement
  const exSet = new Set<number>();
  for (const ex of raw.exdates) {
    exSet.add(parseIcsDate(ex, null).date.getTime());
  }

  const occurrences: IcsEvent[] = [];
  const baseStart = startParsed.date;
  const finalEnd = until && (!windowEnd || until < windowEnd) ? until : windowEnd;

  const pushIfInWindow = (start: Date) => {
    if (exSet.has(start.getTime())) return;
    if (start > finalEnd) return false;
    if (start < windowStart) return true; // continue mais ne pas pousser
    const end = new Date(start.getTime() + duration);
    occurrences.push({
      uid: raw.uid,
      summary: raw.summary,
      description: raw.description,
      location: raw.location,
      start,
      end,
      allDay: startParsed.isDate,
      recurring: true,
    });
    return true;
  };

  let n = 0;
  let cursor = new Date(baseStart);
  // Garde-fous : max 500 occurrences ou 5 ans après le windowEnd
  const safetyLimit = 500;

  if (freq === 'DAILY') {
    while (n < count && cursor <= finalEnd && occurrences.length < safetyLimit) {
      pushIfInWindow(cursor);
      n++;
      cursor = new Date(cursor);
      cursor.setDate(cursor.getDate() + interval);
    }
  } else if (freq === 'WEEKLY') {
    if (byday && byday.length > 0) {
      // Itère par semaine, expanse chaque BYDAY
      const dayIdxs = byday.map((d) => DAY_TO_INDEX[d.slice(-2)]).filter((i) => i !== undefined);
      while (n < count && cursor <= finalEnd && occurrences.length < safetyLimit) {
        for (const dayIdx of dayIdxs) {
          if (n >= count || occurrences.length >= safetyLimit) break;
          const occur = new Date(cursor);
          const diff = (dayIdx - cursor.getDay() + 7) % 7;
          occur.setDate(cursor.getDate() + diff);
          occur.setHours(baseStart.getHours(), baseStart.getMinutes(), baseStart.getSeconds(), 0);
          if (occur >= baseStart && occur <= finalEnd) {
            pushIfInWindow(occur);
            n++;
          }
        }
        cursor = new Date(cursor);
        cursor.setDate(cursor.getDate() + 7 * interval);
      }
    } else {
      while (n < count && cursor <= finalEnd && occurrences.length < safetyLimit) {
        pushIfInWindow(cursor);
        n++;
        cursor = new Date(cursor);
        cursor.setDate(cursor.getDate() + 7 * interval);
      }
    }
  } else if (freq === 'MONTHLY') {
    while (n < count && cursor <= finalEnd && occurrences.length < safetyLimit) {
      pushIfInWindow(cursor);
      n++;
      cursor = new Date(cursor);
      cursor.setMonth(cursor.getMonth() + interval);
    }
  } else if (freq === 'YEARLY') {
    while (n < count && cursor <= finalEnd && occurrences.length < safetyLimit) {
      pushIfInWindow(cursor);
      n++;
      cursor = new Date(cursor);
      cursor.setFullYear(cursor.getFullYear() + interval);
    }
  }

  return occurrences;
}

/**
 * Parse un texte ICS et retourne les events développés sur la fenêtre demandée.
 * @param text contenu .ics brut
 * @param windowStart borne basse pour expansion des récurrences
 * @param windowEnd borne haute
 */
export function parseIcs(text: string, windowStart: Date, windowEnd: Date): IcsEvent[] {
  const lines = unfoldLines(text);
  const rawEvents: RawEvent[] = [];
  let current: RawEvent | null = null;

  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') {
      current = {
        uid: '',
        summary: '',
        description: null,
        location: null,
        dtstart: { value: '', tzid: null, isDate: false },
        dtend: null,
        rrule: null,
        exdates: [],
      };
      continue;
    }
    if (line === 'END:VEVENT') {
      if (current && current.dtstart.value) rawEvents.push(current);
      current = null;
      continue;
    }
    if (!current) continue;

    const parsed = parseLine(line);
    if (!parsed) continue;
    const { name, params, value } = parsed;

    switch (name) {
      case 'UID':
        current.uid = value;
        break;
      case 'SUMMARY':
        current.summary = unescapeText(value);
        break;
      case 'DESCRIPTION':
        current.description = unescapeText(value);
        break;
      case 'LOCATION':
        current.location = unescapeText(value);
        break;
      case 'DTSTART':
        current.dtstart = {
          value,
          tzid: params.TZID || null,
          isDate: params.VALUE === 'DATE' || !value.includes('T'),
        };
        break;
      case 'DTEND':
        current.dtend = {
          value,
          tzid: params.TZID || null,
          isDate: params.VALUE === 'DATE' || !value.includes('T'),
        };
        break;
      case 'RRULE':
        current.rrule = value;
        break;
      case 'EXDATE':
        // Plusieurs EXDATE possibles, séparés par virgule sur la même ligne
        for (const ex of value.split(',')) current.exdates.push(ex.trim());
        break;
    }
  }

  const out: IcsEvent[] = [];
  for (const raw of rawEvents) {
    const startParsed = parseIcsDate(raw.dtstart.value, raw.dtstart.tzid);
    const endParsed = raw.dtend ? parseIcsDate(raw.dtend.value, raw.dtend.tzid) : null;

    if (raw.rrule) {
      out.push(...expandRRule(raw, windowStart, windowEnd));
    } else {
      // Event non récurrent : ne le garde que s'il intersecte la fenêtre
      const eventEnd = endParsed
        ? endParsed.date
        : new Date(
            startParsed.date.getTime() + (startParsed.isDate ? 24 * 60 * 60 * 1000 : 60 * 60 * 1000)
          );
      if (eventEnd < windowStart || startParsed.date > windowEnd) continue;
      out.push({
        uid: raw.uid || `${raw.summary}-${startParsed.date.toISOString()}`,
        summary: raw.summary,
        description: raw.description,
        location: raw.location,
        start: startParsed.date,
        end: eventEnd,
        allDay: startParsed.isDate,
        recurring: false,
      });
    }
  }

  // Tri chronologique
  out.sort((a, b) => a.start.getTime() - b.start.getTime());
  return out;
}
