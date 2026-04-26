import { useCallback, useEffect, useMemo, useState } from 'react';
import { parseIcs, type IcsEvent } from '../lib/icsParser';

const STORAGE_KEY = 'mapa.appleCalendarUrl';

/** URL par défaut prise en compte si aucune valeur n'est saisie par l'utilisateur. */
const DEFAULT_URL =
  ((import.meta.env.VITE_APPLE_CALENDAR_URL as string | undefined)?.trim()) || '';

/** URL du proxy CORS — Edge Function Supabase déployée à `/functions/v1/ics-proxy`. */
function getProxyEndpoint(): string {
  const base = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() || '';
  if (!base) return '';
  return base.replace(/\/$/, '') + '/functions/v1/ics-proxy';
}

export function getStoredCalendarUrl(): string {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v && v.trim()) return v.trim();
  } catch {
    /* localStorage indisponible (ex: SSR) */
  }
  return DEFAULT_URL;
}

export function setStoredCalendarUrl(url: string | null) {
  try {
    if (!url || !url.trim()) localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, url.trim());
  } catch {
    /* noop */
  }
}

interface UseAppleCalendarResult {
  events: IcsEvent[];
  loading: boolean;
  error: string | null;
  /** URL active (depuis localStorage ou env var). Vide → setup non fait. */
  url: string;
  setUrl: (next: string | null) => void;
  refetch: () => Promise<void>;
  lastFetchedAt: Date | null;
}

/**
 * Récupère et expanse les events ICS du calendrier Apple public configuré.
 *  - Fenêtre d'expansion : 60 jours avant → 180 jours après aujourd'hui
 *  - Fetch via Edge Function `ics-proxy` (contourne le CORS d'iCloud)
 *  - Cache mémoire + auto-refresh toutes les 10 minutes
 */
export function useAppleCalendar(): UseAppleCalendarResult {
  const [url, setUrlState] = useState<string>(() => getStoredCalendarUrl());
  const [events, setEvents] = useState<IcsEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

  const fetchEvents = useCallback(async () => {
    if (!url) {
      setEvents([]);
      setError(null);
      return;
    }
    const proxy = getProxyEndpoint();
    if (!proxy) {
      setError('Configuration Supabase manquante (VITE_SUPABASE_URL).');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() || '';
      const res = await fetch(`${proxy}?url=${encodeURIComponent(url)}`, {
        headers: anonKey ? { Authorization: `Bearer ${anonKey}`, apikey: anonKey } : undefined,
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`Proxy ${res.status} : ${text || res.statusText}`);
      }
      const ics = await res.text();
      const parsed = parseIcs(ics, window.start, window.end);
      setEvents(parsed);
      setLastFetchedAt(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur de récupération du calendrier');
    } finally {
      setLoading(false);
    }
  }, [url, window.start, window.end]);

  useEffect(() => {
    void fetchEvents();
  }, [fetchEvents]);

  // Auto-refresh toutes les 10 minutes pour rester à jour avec iCloud
  useEffect(() => {
    if (!url) return;
    const id = setInterval(() => {
      void fetchEvents();
    }, 10 * 60 * 1000);
    return () => clearInterval(id);
  }, [url, fetchEvents]);

  const setUrl = useCallback((next: string | null) => {
    setStoredCalendarUrl(next);
    setUrlState(next?.trim() || '');
  }, []);

  return { events, loading, error, url, setUrl, refetch: fetchEvents, lastFetchedAt };
}
