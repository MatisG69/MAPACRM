import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseEnabled } from '../lib/supabase';
import * as local from '../lib/localCrm';
import type { Quote } from '../lib/types';

export function useQuotes(clientId?: string) {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchQuotes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (isSupabaseEnabled() && supabase) {
        let query = supabase
          .from('quotes')
          .select(
            '*, client:clients(id, name, company, avatar_color), project:projects(id, name), opportunity:opportunities(id, name)'
          )
          .order('created_at', { ascending: false });
        if (clientId) query = query.eq('client_id', clientId);
        const { data, error: err } = await query;
        if (err) throw err;
        setQuotes((data || []) as Quote[]);
      } else {
        setQuotes(local.localListQuotes(clientId));
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    fetchQuotes();
  }, [fetchQuotes]);

  const createQuote = async (
    values: Omit<Quote, 'id' | 'created_at' | 'updated_at' | 'client' | 'project' | 'opportunity'>
  ) => {
    if (isSupabaseEnabled() && supabase) {
      const { data, error: err } = await supabase
        .from('quotes')
        .insert([values as Record<string, unknown>])
        .select(
          '*, client:clients(id, name, company, avatar_color), project:projects(id, name), opportunity:opportunities(id, name)'
        )
        .single();
      if (err) throw err;
      setQuotes((prev) => [data as Quote, ...prev]);
      return data as Quote;
    }
    const data = local.localCreateQuote(values);
    setQuotes((prev) => [data, ...prev]);
    return data;
  };

  const updateQuote = async (id: string, values: Partial<Quote>) => {
    if (isSupabaseEnabled() && supabase) {
      const rest = { ...values } as Record<string, unknown>;
      delete rest.client;
      delete rest.project;
      delete rest.opportunity;
      const { data, error: err } = await supabase
        .from('quotes')
        .update(rest)
        .eq('id', id)
        .select(
          '*, client:clients(id, name, company, avatar_color), project:projects(id, name), opportunity:opportunities(id, name)'
        )
        .single();
      if (err) throw err;
      setQuotes((prev) => prev.map((q) => (q.id === id ? (data as Quote) : q)));
      return data as Quote;
    }
    const data = local.localUpdateQuote(id, values);
    setQuotes((prev) => prev.map((q) => (q.id === id ? data : q)));
    return data;
  };

  const deleteQuote = async (id: string) => {
    if (isSupabaseEnabled() && supabase) {
      const { error: err } = await supabase.from('quotes').delete().eq('id', id);
      if (err) throw err;
    } else {
      local.localDeleteQuote(id);
    }
    setQuotes((prev) => prev.filter((q) => q.id !== id));
  };

  return { quotes, loading, error, refetch: fetchQuotes, createQuote, updateQuote, deleteQuote };
}
