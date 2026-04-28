import { useCallback, useEffect, useState } from 'react';
import { supabase, isSupabaseEnabled } from '../lib/supabase';
import type { MeetingKind, MeetingNote } from '../lib/types';

export interface CreateMeetingNoteInput {
  projectId: string;
  clientId: string;
  meetingDate: string;
  durationMinutes?: number | null;
  attendees?: string | null;
  kind?: MeetingKind;
  title: string;
  decisions?: string | null;
  actions?: string | null;
  nextSteps?: string | null;
}

export function useMeetingNotes(projectId: string | null) {
  const [items, setItems] = useState<MeetingNote[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    if (!projectId || !isSupabaseEnabled() || !supabase) {
      setItems([]);
      return;
    }
    setLoading(true);
    try {
      const { data, error: err } = await supabase
        .from('meeting_notes')
        .select('*')
        .eq('project_id', projectId)
        .order('meeting_date', { ascending: false });
      if (err) throw err;
      setItems((data ?? []) as MeetingNote[]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  const create = useCallback(async (input: CreateMeetingNoteInput): Promise<MeetingNote> => {
    if (!isSupabaseEnabled() || !supabase) throw new Error('Supabase non configuré');
    const { data, error: err } = await supabase
      .from('meeting_notes')
      .insert({
        project_id: input.projectId,
        client_id: input.clientId,
        meeting_date: input.meetingDate,
        meeting_duration_minutes: input.durationMinutes ?? null,
        meeting_attendees: input.attendees?.trim() || null,
        meeting_kind: input.kind ?? 'visio',
        title: input.title,
        decisions: input.decisions?.trim() || null,
        actions: input.actions?.trim() || null,
        next_steps: input.nextSteps?.trim() || null,
      })
      .select('*')
      .single();
    if (err) throw err;
    const created = data as MeetingNote;
    setItems((prev) => [created, ...prev]);
    return created;
  }, []);

  const update = useCallback(async (id: string, patch: Partial<MeetingNote>): Promise<MeetingNote> => {
    if (!isSupabaseEnabled() || !supabase) throw new Error('Supabase non configuré');
    const { data, error: err } = await supabase
      .from('meeting_notes')
      .update(patch)
      .eq('id', id)
      .select('*')
      .single();
    if (err) throw err;
    const updated = data as MeetingNote;
    setItems((prev) => prev.map((i) => (i.id === id ? updated : i)));
    return updated;
  }, []);

  const remove = useCallback(async (id: string) => {
    if (!isSupabaseEnabled() || !supabase) throw new Error('Supabase non configuré');
    const { error: err } = await supabase.from('meeting_notes').delete().eq('id', id);
    if (err) throw err;
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  return { items, loading, error, refetch: fetchAll, create, update, remove };
}
