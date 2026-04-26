import { useCallback, useEffect, useMemo, useState } from 'react';
import { parseIcs, type IcsEvent } from '../lib/icsParser';

/**
 * Endpoint Edge Function CalDAV (bidirectionnel iCloud).
 * Préférence : VITE_CALDAV_URL (override) sinon `<VITE_SUPABASE_URL>/functions/v1/caldav`.
 */
function getCaldavEndpoint(): string {
  const override = (import.meta.env.VITE_CALDAV_URL as string | undefined)?.trim();
  if (override) return override.replace(/\/$/, '');
  const base = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() || '';
  if (!base) return '';
  return base.replace(/\/$/, '') + '/functions/v1/caldav';
}

function getAuthHeaders(): Record<string, string> {
  const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() || '';
  if (!anonKey) return {};
  return { Authorization: `Bearer ${anonKey}`, apikey: anonKey };
}

export interface CaldavEventInput {
  summary: string;
  description?: string | null;
  location?: string | null;
  /** ISO string */
  start: string;
  /** ISO string */
  end: string;
  allDay?: boolean;
}

interface UseCaldavCalendarResult {
  events: IcsEvent[];
  loading: boolean;
  error: string | null;
  calendarName: string | null;
  lastFetchedAt: Date | null;
  refetch: () => Promise<void>;
  createEvent: (input: CaldavEventInput) => Promise<{ uid: string }>;
  updateEvent: (uid: string, input: CaldavEventInput) => Promise<void>;
  deleteEvent: (uid: string) => Promise<void>;
}

interface ListResponse {
  events: { uid: string; href: string; etag: string; ics: string }[];
}

interface InfoResponse {
  calendar: string;
  url: string;
  appleId: string;
}

export function useCaldavCalendar(): UseCaldavCalendarResult {
  const [events, setEvents] = useState<IcsEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [calendarName, setCalendarName] = useState<string | null>(null);
  const [lastFetchedAt, setLastFetchedAt] = useState<Date | null>(null);

  const window = useMemo(() => {
    const start = new Date();
    start.setDate(start.getDate() - 60);
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setDate(end.getDate() + 180);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }, []);

  const callApi = useCallback(
    async (
      method: 'GET' | 'POST' | 'PUT' | 'DELETE',
      action: string,
      params: Record<string, string> = {},
      body?: unknown
    ): Promise<unknown> => {
      const endpoint = getCaldavEndpoint();
      if (!endpoint) throw new Error('VITE_SUPABASE_URL non configurée');
      const url = new URL(endpoint);
      url.searchParams.set('action', action);
      for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
      const res = await fetch(url.toString(), {
        method,
        headers: {
          ...getAuthHeaders(),
          ...(body ? { 'Content-Type': 'application/json' } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        let detail = text;
        try {
          const j = JSON.parse(text);
          detail = j.error || text;
        } catch {
          /* not JSON */
        }
        throw new Error(`${res.status} ${detail || res.statusText}`);
      }
      return await res.json();
    },
    []
  );

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const info = (await callApi('GET', 'info')) as InfoResponse;
      setCalendarName(info.calendar);

      const list = (await callApi('GET', 'list', {
        from: window.start.toISOString(),
        to: window.end.toISOString(),
      })) as ListResponse;

      // Concat ICS de tous les events et parse en bloc avec expansion RRULE
      const fullIcs =
        'BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//MAPA//FR\n' +
        list.events
          .map((e) => {
            // L'ICS retourné par REPORT contient déjà BEGIN:VCALENDAR…END:VCALENDAR.
            // On extrait juste le VEVENT.
            const veventMatch = e.ics.match(/BEGIN:VEVENT[\s\S]*?END:VEVENT/);
            return veventMatch ? veventMatch[0] : '';
          })
          .filter(Boolean)
          .join('\n') +
        '\nEND:VCALENDAR';

      const parsed = parseIcs(fullIcs, window.start, window.end);
      setEvents(parsed);
      setLastFetchedAt(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur CalDAV inconnue');
    } finally {
      setLoading(false);
    }
  }, [callApi, window.start, window.end]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  // Auto-refresh 5 min (CalDAV étant bidirectionnel, on rafraîchit plus souvent que ICS public)
  useEffect(() => {
    const id = setInterval(() => {
      void refetch();
    }, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [refetch]);

  const createEvent = useCallback(
    async (input: CaldavEventInput) => {
      const result = (await callApi('POST', 'create', {}, input)) as { uid: string };
      await refetch();
      return result;
    },
    [callApi, refetch]
  );

  const updateEvent = useCallback(
    async (uid: string, input: CaldavEventInput) => {
      await callApi('PUT', 'update', { uid }, input);
      await refetch();
    },
    [callApi, refetch]
  );

  const deleteEvent = useCallback(
    async (uid: string) => {
      await callApi('DELETE', 'delete', { uid });
      await refetch();
    },
    [callApi, refetch]
  );

  return {
    events,
    loading,
    error,
    calendarName,
    lastFetchedAt,
    refetch,
    createEvent,
    updateEvent,
    deleteEvent,
  };
}
