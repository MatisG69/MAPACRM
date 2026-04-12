import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseEnabled } from '../lib/supabase';
import * as local from '../lib/localCrm';
import { Invoice } from '../lib/types';

export function useInvoices(clientId?: string) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (isSupabaseEnabled() && supabase) {
        let query = supabase
          .from('invoices')
          .select('*, client:clients(id, name, company, avatar_color), project:projects(id, name)')
          .order('created_at', { ascending: false });
        if (clientId) query = query.eq('client_id', clientId);
        const { data, error: err } = await query;
        if (err) throw err;
        setInvoices(
          (data || []).map((inv) => ({
            ...inv,
            source_quote_id: (inv as Invoice).source_quote_id ?? null,
          }))
        );
      } else {
        setInvoices(local.localListInvoices(clientId));
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const createInvoice = async (
    values: Omit<Invoice, 'id' | 'created_at' | 'updated_at' | 'client' | 'project'>
  ) => {
    if (isSupabaseEnabled() && supabase) {
      const { data, error: err } = await supabase
        .from('invoices')
        .insert([values])
        .select('*, client:clients(id, name, company, avatar_color), project:projects(id, name)')
        .single();
      if (err) throw err;
      setInvoices((prev) => [data, ...prev]);
      return data;
    }
    const data = local.localCreateInvoice(values);
    setInvoices((prev) => [data, ...prev]);
    return data;
  };

  const updateInvoice = async (id: string, values: Partial<Invoice>) => {
    if (isSupabaseEnabled() && supabase) {
      const { client: _c, project: _p, ...rest } = values as Partial<
        Invoice & { client: unknown; project: unknown }
      >;
      const { data, error: err } = await supabase
        .from('invoices')
        .update(rest)
        .eq('id', id)
        .select('*, client:clients(id, name, company, avatar_color), project:projects(id, name)')
        .single();
      if (err) throw err;
      setInvoices((prev) => prev.map((inv) => (inv.id === id ? data : inv)));
      return data;
    }
    const data = local.localUpdateInvoice(id, values);
    setInvoices((prev) => prev.map((inv) => (inv.id === id ? data : inv)));
    return data;
  };

  const deleteInvoice = async (id: string) => {
    if (isSupabaseEnabled() && supabase) {
      const { error: err } = await supabase.from('invoices').delete().eq('id', id);
      if (err) throw err;
    } else {
      local.localDeleteInvoice(id);
    }
    setInvoices((prev) => prev.filter((inv) => inv.id !== id));
  };

  return { invoices, loading, error, refetch: fetchInvoices, createInvoice, updateInvoice, deleteInvoice };
}
