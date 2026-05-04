import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseEnabled } from '../lib/supabase';
import * as local from '../lib/localCrm';
import { normalizeClientStatus } from '../lib/clientStatus';
import { Client, ClientTag } from '../lib/types';

/* Forme brute renvoyée par Supabase pour la jointure m2m client_tag_assignments → client_tags. */
interface RawClientTagAssignment {
  tag: ClientTag;
}

export function useClients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchClients = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (isSupabaseEnabled() && supabase) {
        /* Jointure m2m : on récupère les tags assignés en une seule requête.
           Format Supabase : `tag_assignments:client_tag_assignments(tag:client_tags(*))`. */
        const { data, error: err } = await supabase
          .from('clients')
          .select('*, tag_assignments:client_tag_assignments(tag:client_tags(*))')
          .order('created_at', { ascending: false });
        if (err) throw err;
        setClients(
          (data || []).map((c) => {
            const assignments = (c as { tag_assignments?: RawClientTagAssignment[] }).tag_assignments;
            const tags: ClientTag[] = Array.isArray(assignments)
              ? assignments
                  .map((a) => a.tag)
                  .filter((t): t is ClientTag => Boolean(t))
                  .sort((a, b) => a.position - b.position || a.label.localeCompare(b.label, 'fr'))
              : [];
            // On retire la clé brute pour éviter qu'elle ne fuie dans les payloads d'update.
            const cleaned = { ...c };
            delete (cleaned as { tag_assignments?: unknown }).tag_assignments;
            return {
              ...cleaned,
              status: normalizeClientStatus(cleaned.status),
              satisfaction_rating: cleaned.satisfaction_rating ?? null,
              feedback: cleaned.feedback ?? null,
              tags,
            } as Client;
          })
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
    /* `tags` est une vue jointe (jamais persistée dans `clients`).
       On la retire du payload avant l'UPDATE — sinon Supabase rejette. */
    const payload = { ...values } as Partial<Client> & { tags?: unknown };
    delete payload.tags;
    if (isSupabaseEnabled() && supabase) {
      const { data, error: err } = await supabase
        .from('clients')
        .update(payload)
        .eq('id', id)
        .select('*, tag_assignments:client_tag_assignments(tag:client_tags(*))')
        .single();
      if (err) throw err;
      const assignments = (data as { tag_assignments?: RawClientTagAssignment[] }).tag_assignments;
      const tags: ClientTag[] = Array.isArray(assignments)
        ? assignments.map((a) => a.tag).filter((t): t is ClientTag => Boolean(t))
        : [];
      const cleaned = { ...data };
      delete (cleaned as { tag_assignments?: unknown }).tag_assignments;
      const next = { ...cleaned, tags } as Client;
      setClients((prev) => prev.map((c) => (c.id === id ? next : c)));
      return next;
    }
    const data = local.localUpdateClient(id, payload);
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
