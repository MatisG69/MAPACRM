import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseEnabled } from '../lib/supabase';
import * as local from '../lib/localCrm';
import { normalizeClientStatus } from '../lib/clientStatus';
import { Client } from '../lib/types';

export function useClients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchClients = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (isSupabaseEnabled() && supabase) {
        const { data, error: err } = await supabase
          .from('clients')
          .select('*')
          .order('created_at', { ascending: false });
        if (err) throw err;
        setClients(
          (data || []).map((c) => ({
            ...c,
            status: normalizeClientStatus(c.status),
            satisfaction_rating: c.satisfaction_rating ?? null,
            feedback: c.feedback ?? null,
          }))
        );
      } else {
        setClients(local.localListClients());
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const createClient = async (values: Omit<Client, 'id' | 'created_at' | 'updated_at'>) => {
    if (isSupabaseEnabled() && supabase) {
      const { data, error: err } = await supabase.from('clients').insert([values]).select().single();
      if (err) throw err;
      setClients((prev) => [data, ...prev]);
      return data;
    }
    const data = local.localCreateClient(values);
    setClients((prev) => [data, ...prev]);
    return data;
  };

  const updateClient = async (id: string, values: Partial<Client>) => {
    if (isSupabaseEnabled() && supabase) {
      const { data, error: err } = await supabase.from('clients').update(values).eq('id', id).select().single();
      if (err) throw err;
      setClients((prev) => prev.map((c) => (c.id === id ? data : c)));
      return data;
    }
    const data = local.localUpdateClient(id, values);
    setClients((prev) => prev.map((c) => (c.id === id ? data : c)));
    return data;
  };

  const deleteClient = async (id: string) => {
    if (isSupabaseEnabled() && supabase) {
      const { error: err } = await supabase.from('clients').delete().eq('id', id);
      if (err) throw err;
    } else {
      local.localDeleteClient(id);
    }
    setClients((prev) => prev.filter((c) => c.id !== id));
  };

  return { clients, loading, error, refetch: fetchClients, createClient, updateClient, deleteClient };
}
