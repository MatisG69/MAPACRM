import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseEnabled } from '../lib/supabase';
import * as local from '../lib/localCrm';
import { Interaction } from '../lib/types';

export function useInteractions(clientId?: string) {
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInteractions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (isSupabaseEnabled() && supabase) {
        let query = supabase
          .from('interactions')
          .select('*, client:clients(id, name, avatar_color)')
          .order('date', { ascending: false });
        if (clientId) query = query.eq('client_id', clientId);
        const { data, error: err } = await query;
        if (err) throw err;
        setInteractions(data || []);
      } else {
        setInteractions(local.localListInteractions(clientId));
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    fetchInteractions();
  }, [fetchInteractions]);

  const createInteraction = async (values: Omit<Interaction, 'id' | 'created_at' | 'client'>) => {
    if (isSupabaseEnabled() && supabase) {
      const { data, error: err } = await supabase
        .from('interactions')
        .insert([values])
        .select('*, client:clients(id, name, avatar_color)')
        .single();
      if (err) throw err;
      setInteractions((prev) => [data, ...prev]);
      return data;
    }
    const data = local.localCreateInteraction(values);
    setInteractions((prev) => [data, ...prev]);
    return data;
  };

  const deleteInteraction = async (id: string) => {
    if (isSupabaseEnabled() && supabase) {
      const { error: err } = await supabase.from('interactions').delete().eq('id', id);
      if (err) throw err;
    } else {
      local.localDeleteInteraction(id);
    }
    setInteractions((prev) => prev.filter((i) => i.id !== id));
  };

  return { interactions, loading, error, refetch: fetchInteractions, createInteraction, deleteInteraction };
}
