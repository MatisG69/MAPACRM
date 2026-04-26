/**
 * Edge Function : Pont CalDAV iCloud bidirectionnel
 * --------------------------------------------------
 * Permet au CRM de lire / créer / modifier / supprimer des events dans
 * Apple Calendar via CalDAV. Les credentials Apple ne sortent JAMAIS
 * du serveur (stockés dans Supabase Secrets).
 *
 * Setup côté Supabase (CLI ou Dashboard → Edge Functions → Secrets) :
 *   APPLE_ID                  = ton Apple ID (ex: matis.gouyet@gmail.com)
 *   APPLE_APP_PASSWORD        = app-specific password (xxxx-xxxx-xxxx-xxxx)
 *   APPLE_CALENDAR_NAME       = nom exact du calendrier ciblé (ex: "MAPA")
 *
 * Endpoints (sur cette même fonction, dispatchés par ?action=) :
 *   GET    ?action=list&from=ISO&to=ISO                 → liste events
 *   GET    ?action=info                                 → calendrier actif + nb events
 *   POST   ?action=create        body: EventInput       → crée event
 *   PUT    ?action=update&uid=…  body: EventInput       → met à jour event
 *   DELETE ?action=delete&uid=…                         → supprime event
 *
 * EventInput = {
 *   summary: string,
 *   description?: string,
 *   location?: string,
 *   start: ISO string,
 *   end: ISO string,
 *   allDay?: boolean
 * }
 *
 * Déploiement :
 *   npx supabase functions deploy caldav --no-verify-jwt
 *   (note : auth réelle = vérification du Bearer anon key dans le code)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

// ─── CORS ──────────────────────────────────────────────────────────────
const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });

const fail = (msg: string, status = 500) => json({ error: msg }, status);

// ─── Auth simple : on exige le Bearer anon key Supabase ─────────────────
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || '';
function requireAuth(req: Request): boolean {
  if (!SUPABASE_ANON_KEY) return true; // dev local sans clé : on laisse passer
  const auth = req.headers.get('authorization') || req.headers.get('Authorization') || '';
  return auth === `Bearer ${SUPABASE_ANON_KEY}`;
}

// ─── Credentials Apple ──────────────────────────────────────────────────
const APPLE_ID = Deno.env.get('APPLE_ID') || '';
const APPLE_APP_PASSWORD = Deno.env.get('APPLE_APP_PASSWORD') || '';
const APPLE_CALENDAR_NAME = Deno.env.get('APPLE_CALENDAR_NAME') || 'MAPA';

function basicAuthHeader(): string {
  return 'Basic ' + btoa(`${APPLE_ID}:${APPLE_APP_PASSWORD}`);
}

function checkAppleConfig(): string | null {
  if (!APPLE_ID) return 'APPLE_ID missing in Edge Function secrets';
  if (!APPLE_APP_PASSWORD) return 'APPLE_APP_PASSWORD missing in Edge Function secrets';
  return null;
}

// ─── XML parsing helpers ────────────────────────────────────────────────
/** Extrait toutes les valeurs d'un tag (ignore les namespaces). */
function extractAll(xml: string, tagLocal: string): string[] {
  const re = new RegExp(`<(?:[a-zA-Z0-9]+:)?${tagLocal}(?:\\s[^>]*)?>([\\s\\S]*?)</(?:[a-zA-Z0-9]+:)?${tagLocal}>`, 'g');
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) out.push(m[1].trim());
  return out;
}
function extractFirst(xml: string, tagLocal: string): string | null {
  const all = extractAll(xml, tagLocal);
  return all.length > 0 ? all[0] : null;
}

// ─── CalDAV : discovery + cache ─────────────────────────────────────────
interface CalendarRef {
  url: string; // URL absolue du calendrier
  displayName: string;
}

let cachedCalendar: CalendarRef | null = null;

async function caldavRequest(
  url: string,
  method: string,
  body: string | null = null,
  extraHeaders: Record<string, string> = {}
): Promise<Response> {
  return await fetch(url, {
    method,
    headers: {
      Authorization: basicAuthHeader(),
      'Content-Type': 'application/xml; charset=utf-8',
      Depth: '0',
      ...extraHeaders,
    },
    body: body ?? undefined,
    redirect: 'follow',
  });
}

/**
 * Discovery iCloud :
 *  1. PROPFIND /.well-known/caldav → redirect vers le shard utilisateur (p01-..p200-)
 *  2. PROPFIND principal → calendar-home-set
 *  3. PROPFIND calendar-home Depth:1 → liste de calendriers
 *  4. Filter par displayname = APPLE_CALENDAR_NAME
 */
async function discoverCalendar(): Promise<CalendarRef> {
  if (cachedCalendar) return cachedCalendar;

  // Étape 1 : current-user-principal
  const principalReq = `<?xml version="1.0" encoding="utf-8" ?>
<propfind xmlns="DAV:">
  <prop><current-user-principal/></prop>
</propfind>`;

  let res = await caldavRequest('https://caldav.icloud.com/', 'PROPFIND', principalReq);
  if (!res.ok) throw new Error(`Principal discovery failed: ${res.status} ${await res.text()}`);
  const principalHref = extractFirst(await res.text(), 'href');
  if (!principalHref) throw new Error('No principal href in response');

  const principalUrl = new URL(principalHref, res.url).toString();

  // Étape 2 : calendar-home-set
  const homeReq = `<?xml version="1.0" encoding="utf-8" ?>
<propfind xmlns="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
  <prop><c:calendar-home-set/></prop>
</propfind>`;
  res = await caldavRequest(principalUrl, 'PROPFIND', homeReq);
  if (!res.ok) throw new Error(`Home discovery failed: ${res.status}`);
  const homeXml = await res.text();
  // <calendar-home-set><href>...</href></calendar-home-set>
  const homeMatch = homeXml.match(/<(?:[a-zA-Z0-9]+:)?calendar-home-set[^>]*>[\s\S]*?<(?:[a-zA-Z0-9]+:)?href[^>]*>([\s\S]*?)<\/(?:[a-zA-Z0-9]+:)?href>/);
  if (!homeMatch) throw new Error('No calendar-home-set found');
  const homeUrl = new URL(homeMatch[1].trim(), res.url).toString();

  // Étape 3 : list calendars
  const listReq = `<?xml version="1.0" encoding="utf-8" ?>
<propfind xmlns="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
  <prop>
    <displayname/>
    <resourcetype/>
    <c:supported-calendar-component-set/>
  </prop>
</propfind>`;
  res = await fetch(homeUrl, {
    method: 'PROPFIND',
    headers: {
      Authorization: basicAuthHeader(),
      'Content-Type': 'application/xml; charset=utf-8',
      Depth: '1',
    },
    body: listReq,
  });
  if (!res.ok) throw new Error(`Calendar list failed: ${res.status}`);
  const listXml = await res.text();

  // Étape 4 : parse <response> elements
  const responses = extractAll(listXml, 'response');
  const target = APPLE_CALENDAR_NAME.trim().toLowerCase();
  const candidates: CalendarRef[] = [];
  for (const r of responses) {
    const href = extractFirst(r, 'href');
    const displayname = extractFirst(r, 'displayname');
    // Garde seulement les calendriers VEVENT
    const supports = extractFirst(r, 'supported-calendar-component-set') || '';
    if (!href || !displayname) continue;
    if (!supports.toLowerCase().includes('vevent')) continue;
    candidates.push({ url: new URL(href, res.url).toString(), displayName: displayname });
  }
  if (candidates.length === 0) throw new Error('No VEVENT calendar found in iCloud account');
  const matched =
    candidates.find((c) => c.displayName.trim().toLowerCase() === target) || candidates[0];

  cachedCalendar = matched;
  return matched;
}

// ─── ICS helpers ────────────────────────────────────────────────────────
function pad(n: number): string {
  return n < 10 ? '0' + n : '' + n;
}
function toIcsUTC(d: Date): string {
  return (
    d.getUTCFullYear().toString() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    'T' +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    'Z'
  );
}
function toIcsDate(d: Date): string {
  return d.getUTCFullYear().toString() + pad(d.getUTCMonth() + 1) + pad(d.getUTCDate());
}

function escapeIcsText(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
}

function unescapeIcsText(s: string): string {
  return s.replace(/\\n/gi, '\n').replace(/\\,/g, ',').replace(/\\;/g, ';').replace(/\\\\/g, '\\');
}

interface EventInput {
  summary: string;
  description?: string | null;
  location?: string | null;
  start: string; // ISO
  end: string; // ISO
  allDay?: boolean;
}

function buildIcs(uid: string, ev: EventInput): string {
  const start = new Date(ev.start);
  const end = new Date(ev.end);
  const stamp = new Date();

  let dtStart: string;
  let dtEnd: string;
  if (ev.allDay) {
    dtStart = `DTSTART;VALUE=DATE:${toIcsDate(start)}`;
    // RFC : DTEND DATE est exclusif → on ajoute 1 jour si end est le même jour
    const endDate = new Date(end);
    if (endDate.getTime() <= start.getTime()) endDate.setUTCDate(endDate.getUTCDate() + 1);
    dtEnd = `DTEND;VALUE=DATE:${toIcsDate(endDate)}`;
  } else {
    dtStart = `DTSTART:${toIcsUTC(start)}`;
    dtEnd = `DTEND:${toIcsUTC(end)}`;
  }

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//MAPA Developpement//MAPA CRM//FR',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${toIcsUTC(stamp)}`,
    dtStart,
    dtEnd,
    `SUMMARY:${escapeIcsText(ev.summary || '(sans titre)')}`,
  ];
  if (ev.description) lines.push(`DESCRIPTION:${escapeIcsText(ev.description)}`);
  if (ev.location) lines.push(`LOCATION:${escapeIcsText(ev.location)}`);
  lines.push('END:VEVENT', 'END:VCALENDAR');

  return lines.join('\r\n') + '\r\n';
}

// ─── Operations ─────────────────────────────────────────────────────────
interface ListedEvent {
  uid: string;
  href: string;
  etag: string;
  ics: string;
}

async function listRange(from: Date, to: Date): Promise<ListedEvent[]> {
  const cal = await discoverCalendar();
  const reportBody = `<?xml version="1.0" encoding="utf-8" ?>
<c:calendar-query xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
  <d:prop>
    <d:getetag/>
    <c:calendar-data/>
  </d:prop>
  <c:filter>
    <c:comp-filter name="VCALENDAR">
      <c:comp-filter name="VEVENT">
        <c:time-range start="${toIcsUTC(from)}" end="${toIcsUTC(to)}"/>
      </c:comp-filter>
    </c:comp-filter>
  </c:filter>
</c:calendar-query>`;

  const res = await fetch(cal.url, {
    method: 'REPORT',
    headers: {
      Authorization: basicAuthHeader(),
      'Content-Type': 'application/xml; charset=utf-8',
      Depth: '1',
    },
    body: reportBody,
  });
  if (!res.ok) throw new Error(`REPORT failed: ${res.status} ${await res.text()}`);
  const xml = await res.text();
  const responses = extractAll(xml, 'response');
  const events: ListedEvent[] = [];
  for (const r of responses) {
    const href = extractFirst(r, 'href');
    const etag = extractFirst(r, 'getetag') || '';
    const ics = extractFirst(r, 'calendar-data');
    if (!href || !ics) continue;
    const uidMatch = ics.match(/UID:([^\r\n]+)/i);
    const uid = uidMatch ? uidMatch[1].trim() : href;
    events.push({
      uid,
      href: new URL(href, res.url).toString(),
      etag: etag.replace(/"/g, ''),
      ics: ics.trim(),
    });
  }
  return events;
}

async function createEvent(input: EventInput): Promise<{ uid: string; href: string; etag: string }> {
  const cal = await discoverCalendar();
  const uid = crypto.randomUUID() + '@mapa-developpement.fr';
  const ics = buildIcs(uid, input);
  const href = cal.url.replace(/\/?$/, '/') + uid + '.ics';
  const res = await fetch(href, {
    method: 'PUT',
    headers: {
      Authorization: basicAuthHeader(),
      'Content-Type': 'text/calendar; charset=utf-8',
      'If-None-Match': '*',
    },
    body: ics,
  });
  if (!res.ok && res.status !== 201 && res.status !== 204) {
    throw new Error(`PUT create failed: ${res.status} ${await res.text()}`);
  }
  const etag = (res.headers.get('etag') || '').replace(/"/g, '');
  return { uid, href, etag };
}

async function findEventHrefByUid(uid: string): Promise<{ href: string; etag: string; ics: string } | null> {
  const cal = await discoverCalendar();
  // Petite fenêtre élargie autour de "now" — pour update/delete on accepte un look-back large
  const now = new Date();
  const from = new Date(now);
  from.setFullYear(from.getFullYear() - 2);
  const to = new Date(now);
  to.setFullYear(to.getFullYear() + 5);
  const all = await listRange(from, to);
  void cal;
  return all.find((e) => e.uid === uid) ?? null;
}

async function updateEvent(uid: string, input: EventInput): Promise<{ etag: string }> {
  const existing = await findEventHrefByUid(uid);
  if (!existing) throw new Error(`Event ${uid} not found`);
  const ics = buildIcs(uid, input);
  const res = await fetch(existing.href, {
    method: 'PUT',
    headers: {
      Authorization: basicAuthHeader(),
      'Content-Type': 'text/calendar; charset=utf-8',
      'If-Match': `"${existing.etag}"`,
    },
    body: ics,
  });
  if (!res.ok && res.status !== 204) {
    throw new Error(`PUT update failed: ${res.status} ${await res.text()}`);
  }
  const etag = (res.headers.get('etag') || '').replace(/"/g, '');
  return { etag };
}

async function deleteEvent(uid: string): Promise<void> {
  const existing = await findEventHrefByUid(uid);
  if (!existing) throw new Error(`Event ${uid} not found`);
  const res = await fetch(existing.href, {
    method: 'DELETE',
    headers: {
      Authorization: basicAuthHeader(),
      'If-Match': `"${existing.etag}"`,
    },
  });
  if (!res.ok && res.status !== 204) {
    throw new Error(`DELETE failed: ${res.status} ${await res.text()}`);
  }
}

// ─── Router ─────────────────────────────────────────────────────────────
serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }
  if (!requireAuth(req)) {
    return fail('Unauthorized', 401);
  }

  const cfgErr = checkAppleConfig();
  if (cfgErr) return fail(cfgErr, 500);

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action') || '';

    if (action === 'info' && req.method === 'GET') {
      const cal = await discoverCalendar();
      return json({ calendar: cal.displayName, url: cal.url, appleId: APPLE_ID });
    }

    if (action === 'list' && req.method === 'GET') {
      const from = url.searchParams.get('from');
      const to = url.searchParams.get('to');
      if (!from || !to) return fail('Missing from/to', 400);
      const events = await listRange(new Date(from), new Date(to));
      return json({ events });
    }

    if (action === 'create' && req.method === 'POST') {
      const input = (await req.json()) as EventInput;
      if (!input.summary || !input.start || !input.end) {
        return fail('summary, start, end required', 400);
      }
      const result = await createEvent(input);
      return json(result);
    }

    if (action === 'update' && req.method === 'PUT') {
      const uid = url.searchParams.get('uid');
      if (!uid) return fail('Missing uid', 400);
      const input = (await req.json()) as EventInput;
      const result = await updateEvent(uid, input);
      return json(result);
    }

    if (action === 'delete' && req.method === 'DELETE') {
      const uid = url.searchParams.get('uid');
      if (!uid) return fail('Missing uid', 400);
      await deleteEvent(uid);
      return json({ ok: true });
    }

    return fail('Unknown action', 400);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    console.error('caldav error:', msg);
    return fail(msg, 500);
  }
});
