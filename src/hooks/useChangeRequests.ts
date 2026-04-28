import { useCallback, useEffect, useState } from 'react';
import { supabase, isSupabaseEnabled } from '../lib/supabase';
import type { ChangeRequest, ChangeRequestStatus, ChangeRequestUrgency } from '../lib/types';

export interface CreateChangeRequestInput {
  projectId: string;
  clientId: string;
  description: string;
  urgency?: ChangeRequestUrgency;
  submittedBySignature?: string | null;
}

export function useChangeRequests(projectId: string | null) {
  const [items, setItems] = useState<ChangeRequest[]>([]);
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
        .from('change_requests')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });
      if (err) throw err;
      setItems((data ?? []) as ChangeRequest[]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  const create = useCallback(async (input: CreateChangeRequestInput): Promise<ChangeRequest> => {
    if (!isSupabaseEnabled() || !supabase) throw new Error('Supabase non configuré');
    const { data, error: err } = await supabase
      .from('change_requests')
      .insert({
        project_id: input.projectId,
        client_id: input.clientId,
        description: input.description,
        urgency: input.urgency ?? 'normal',
        submitted_by_signature: input.submittedBySignature ?? null,
      })
      .select('*')
      .single();
    if (err) throw err;
    const created = data as ChangeRequest;
    setItems((prev) => [created, ...prev]);
    return created;
  }, []);

  const estimate = useCallback(
    async (id: string, days: number, amount: number, adminNotes?: string | null): Promise<ChangeRequest> => {
      if (!isSupabaseEnabled() || !supabase) throw new Error('Supabase non configuré');
      const { data, error: err } = await supabase
        .from('change_requests')
        .update({
          estimated_days: days,
          estimated_amount: amount,
          admin_notes: adminNotes?.trim() || null,
          status: 'estimated' as ChangeRequestStatus,
        })
        .eq('id', id)
        .select('*')
        .single();
      if (err) throw err;
      const updated = data as ChangeRequest;
      setItems((prev) => prev.map((i) => (i.id === id ? updated : i)));
      return updated;
    },
    [],
  );

  const setStatus = useCallback(async (id: string, status: ChangeRequestStatus): Promise<ChangeRequest> => {
    if (!isSupabaseEnabled() || !supabase) throw new Error('Supabase non configuré');
    const { data, error: err } = await supabase
      .from('change_requests')
      .update({ status })
      .eq('id', id)
      .select('*')
      .single();
    if (err) throw err;
    const updated = data as ChangeRequest;
    setItems((prev) => prev.map((i) => (i.id === id ? updated : i)));
    return updated;
  }, []);

  const remove = useCallback(async (id: string) => {
    if (!isSupabaseEnabled() || !supabase) throw new Error('Supabase non configuré');
    const { error: err } = await supabase.from('change_requests').delete().eq('id', id);
    if (err) throw err;
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  return { items, loading, error, refetch: fetchAll, create, estimate, setStatus, remove };
}
