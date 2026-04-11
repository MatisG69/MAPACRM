import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseEnabled } from '../lib/supabase';
import * as local from '../lib/localCrm';
import type { CalendarEvent } from '../lib/types';

export function useCalendarEvents() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (isSupabaseEnabled() && supabase) {
        const { data, error: err } = await supabase
          .from('calendar_events')
          .select('*, client:clients(id, name, avatar_color), project:projects(id, name)')
          .order('start_at', { ascending: true });
        if (err) throw err;
        setEvents(data || []);
      } else {
        setEvents(local.localListCalendarEvents());
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const createEvent = async (
    values: Omit<CalendarEvent, 'id' | 'created_at' | 'updated_at' | 'client' | 'project'>
  ) => {
    if (isSupabaseEnabled() && supabase) {
      const { data, error: err } = await supabase
        .from('calendar_events')
        .insert([values])
        .select('*, client:clients(id, name, avatar_color), project:projects(id, name)')
        .single();
      if (err) throw err;
      setEvents((prev) => [...prev, data].sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime()));
      return data;
    }
    const data = local.localCreateCalendarEvent(values);
    setEvents((prev) => [...prev, data].sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime()));
    return data;
  };

  const updateEvent = async (id: string, values: Partial<CalendarEvent>) => {
    if (isSupabaseEnabled() && supabase) {
      const { client: _c, project: _p, ...rest } = values as Partial<
        CalendarEvent & { client: unknown; project: unknown }
      >;
      const { data, error: err } = await supabase
        .from('calendar_events')
        .update(rest)
        .eq('id', id)
        .select('*, client:clients(id, name, avatar_color), project:projects(id, name)')
        .single();
      if (err) throw err;
      setEvents((prev) =>
        prev
          .map((ev) => (ev.id === id ? data : ev))
          .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime())
      );
      return data;
    }
    const data = local.localUpdateCalendarEvent(id, values);
    setEvents((prev) =>
      prev
        .map((ev) => (ev.id === id ? data : ev))
        .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime())
    );
    return data;
  };

  const deleteEvent = async (id: string) => {
    if (isSupabaseEnabled() && supabase) {
      const { error: err } = await supabase.from('calendar_events').delete().eq('id', id);
      if (err) throw err;
    } else {
      local.localDeleteCalendarEvent(id);
    }
    setEvents((prev) => prev.filter((ev) => ev.id !== id));
  };

  return { events, loading, error, refetch: fetchEvents, createEvent, updateEvent, deleteEvent };
}
