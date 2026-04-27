import { useCallback, useEffect, useState } from 'react';
import { supabase, isSupabaseEnabled } from '../lib/supabase';
import type { Call } from '../lib/types';

const SELECT_WITH_CLIENT = `
  *,
  client:clients(id, name, company, email, phone, website, avatar_color)
`;

/**
 * Gestion du journal d'appels commerciaux.
 * Tableau vide par défaut — chaque ligne est créée à la main par le commercial,
 * avec sélection d'un client (l'auto-fill des coordonnées se fait côté UI
 * en lisant la jointure `client`).
 */
export function useCalls() {
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    if (!isSupabaseEnabled() || !supabase) {
      setCalls([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('calls')
        .select(SELECT_WITH_CLIENT)
        .order('created_at', { ascending: false });
      if (err) throw err;
      setCalls((data ?? []) as Call[]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  /**
   * Crée une nouvelle ligne d'appel pour un client.
   * Tous les champs (called, interested, notes) restent à leur défaut.
   */
  const createCall = useCallback(async (clientId: string): Promise<Call> => {
    if (!isSupabaseEnabled() || !supabase) {
      throw new Error('Supabase non configuré');
    }
    const { data, error: err } = await supabase
      .from('calls')
      .insert({ client_id: clientId })
      .select(SELECT_WITH_CLIENT)
      .single();
    if (err) throw err;
    const created = data as Call;
    setCalls((prev) => [created, ...prev]);
    return created;
  }, []);

  /**
   * Met à jour une ligne d'appel. Le toggle `called` synchronise automatiquement
   * `called_at` (timestamp courant si on passe à true, null si on repasse à false).
   */
  const updateCall = useCallback(
    async (id: string, patch: Partial<Pick<Call, 'called' | 'interested' | 'notes' | 'client_id'>>) => {
      if (!isSupabaseEnabled() || !supabase) {
        throw new Error('Supabase non configuré');
      }
      const fullPatch: Record<string, unknown> = { ...patch };
      if ('called' in patch) {
        fullPatch.called_at = patch.called ? new Date().toISOString() : null;
      }
      const { data, error: err } = await supabase
        .from('calls')
        .update(fullPatch)
        .eq('id', id)
        .select(SELECT_WITH_CLIENT)
        .single();
      if (err) throw err;
      const updated = data as Call;
      setCalls((prev) => prev.map((c) => (c.id === id ? updated : c)));
      return updated;
    },
    []
  );

  const deleteCall = useCallback(async (id: string) => {
    if (!isSupabaseEnabled() || !supabase) {
      throw new Error('Supabase non configuré');
    }
    const { error: err } = await supabase.from('calls').delete().eq('id', id);
    if (err) throw err;
    setCalls((prev) => prev.filter((c) => c.id !== id));
  }, []);

  return { calls, loading, error, refetch: fetchAll, createCall, updateCall, deleteCall };
}
