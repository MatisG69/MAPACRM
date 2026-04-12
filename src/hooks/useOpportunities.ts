import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseEnabled } from '../lib/supabase';
import * as local from '../lib/localCrm';
import type { Opportunity } from '../lib/types';

export function useOpportunities() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOpportunities = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (isSupabaseEnabled() && supabase) {
        const { data, error: err } = await supabase
          .from('opportunities')
          .select('*, client:clients(id, name, avatar_color), project:projects(id, name)')
          .order('updated_at', { ascending: false });
        if (err) throw err;
        setOpportunities((data || []) as Opportunity[]);
      } else {
        setOpportunities(local.localListOpportunities());
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOpportunities();
  }, [fetchOpportunities]);

  const createOpportunity = async (
    values: Omit<Opportunity, 'id' | 'created_at' | 'updated_at' | 'client' | 'project'>
  ) => {
    if (isSupabaseEnabled() && supabase) {
      const { data, error: err } = await supabase
        .from('opportunities')
        .insert([values as Record<string, unknown>])
        .select('*, client:clients(id, name, avatar_color), project:projects(id, name)')
        .single();
      if (err) throw err;
      setOpportunities((prev) => [data as Opportunity, ...prev]);
      return data as Opportunity;
    }
    const data = local.localCreateOpportunity(values);
    setOpportunities((prev) => [data, ...prev]);
    return data;
  };

  const updateOpportunity = async (id: string, values: Partial<Opportunity>) => {
    if (isSupabaseEnabled() && supabase) {
      const rest = { ...values } as Record<string, unknown>;
      delete rest.client;
      delete rest.project;
      const { data, error: err } = await supabase
        .from('opportunities')
        .update(rest)
        .eq('id', id)
        .select('*, client:clients(id, name, avatar_color), project:projects(id, name)')
        .single();
      if (err) throw err;
      setOpportunities((prev) => prev.map((o) => (o.id === id ? (data as Opportunity) : o)));
      return data as Opportunity;
    }
    const data = local.localUpdateOpportunity(id, values);
    setOpportunities((prev) => prev.map((o) => (o.id === id ? data : o)));
    return data;
  };

  const deleteOpportunity = async (id: string) => {
    if (isSupabaseEnabled() && supabase) {
      const { error: err } = await supabase.from('opportunities').delete().eq('id', id);
      if (err) throw err;
    } else {
      local.localDeleteOpportunity(id);
    }
    setOpportunities((prev) => prev.filter((o) => o.id !== id));
  };

  return {
    opportunities,
    loading,
    error,
    refetch: fetchOpportunities,
    createOpportunity,
    updateOpportunity,
    deleteOpportunity,
  };
}
