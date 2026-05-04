import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseEnabled } from '../lib/supabase';
import * as local from '../lib/localCrm';
import type { ClientTag } from '../lib/types';

/**
 * Hook pour gérer le référentiel global des tags clients ainsi que leur
 * assignation aux clients. Couvre :
 *   - CRUD du référentiel `client_tags` (create / rename / recolor / delete)
 *   - Assignation / désassignation client ↔ tag (table jonction)
 *   - `setClientTags` : remplace en une opération atomique l'ensemble des
 *     tags d'un client (ergonomie pour le picker multi-select)
 */
export function useClientTags() {
  const [tags, setTags] = useState<ClientTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTags = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (isSupabaseEnabled() && supabase) {
        const { data, error: err } = await supabase
          .from('client_tags')
          .select('*')
          .order('position', { ascending: true })
          .order('label', { ascending: true });
        if (err) throw err;
        setTags((data || []) as ClientTag[]);
      } else {
        setTags(local.localListClientTags());
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  const createTag = async (
    values: Pick<ClientTag, 'label'> & Partial<Pick<ClientTag, 'color' | 'position'>>
  ): Promise<ClientTag> => {
    const payload = {
      label: values.label.trim(),
      color: values.color ?? '#b8973a',
      position: values.position ?? tags.length,
    };
    if (!payload.label) throw new Error('Le nom du tag est obligatoire');
    if (isSupabaseEnabled() && supabase) {
      const { data, error: err } = await supabase
        .from('client_tags')
        .insert([payload])
        .select('*')
        .single();
      if (err) throw err;
      const row = data as ClientTag;
      setTags((prev) => [...prev, row]);
      return row;
    }
    const row = local.localCreateClientTag(payload);
    setTags((prev) => [...prev, row]);
    return row;
  };

  const updateTag = async (id: string, values: Partial<ClientTag>): Promise<ClientTag> => {
    if (isSupabaseEnabled() && supabase) {
      const { data, error: err } = await supabase
        .from('client_tags')
        .update(values)
        .eq('id', id)
        .select('*')
        .single();
      if (err) throw err;
      const row = data as ClientTag;
      setTags((prev) => prev.map((t) => (t.id === id ? row : t)));
      return row;
    }
    const row = local.localUpdateClientTag(id, values);
    setTags((prev) => prev.map((t) => (t.id === id ? row : t)));
    return row;
  };

  const deleteTag = async (id: string): Promise<void> => {
    if (isSupabaseEnabled() && supabase) {
      const { error: err } = await supabase.from('client_tags').delete().eq('id', id);
      if (err) throw err;
    } else {
      local.localDeleteClientTag(id);
    }
    setTags((prev) => prev.filter((t) => t.id !== id));
  };

  /**
   * Remplace l'ensemble des tags d'un client. Diff-based : insère uniquement
   * ceux qui manquent et supprime ceux retirés. Atomique côté UI (les deux
   * requêtes s'enchaînent ; en cas d'échec partiel, on remonte l'erreur).
   */
  const setClientTags = async (
    clientId: string,
    nextTagIds: string[],
    currentTagIds: string[] = []
  ): Promise<void> => {
    const toAdd = nextTagIds.filter((id) => !currentTagIds.includes(id));
    const toRemove = currentTagIds.filter((id) => !nextTagIds.includes(id));
    if (toAdd.length === 0 && toRemove.length === 0) return;

    if (isSupabaseEnabled() && supabase) {
      if (toAdd.length > 0) {
        const rows = toAdd.map((tag_id) => ({ client_id: clientId, tag_id }));
        const { error: err } = await supabase.from('client_tag_assignments').insert(rows);
        if (err) throw err;
      }
      if (toRemove.length > 0) {
        const { error: err } = await supabase
          .from('client_tag_assignments')
          .delete()
          .eq('client_id', clientId)
          .in('tag_id', toRemove);
        if (err) throw err;
      }
      return;
    }
    local.localSetClientTags(clientId, nextTagIds);
  };

  return {
    tags,
    loading,
    error,
    refetch: fetchTags,
    createTag,
    updateTag,
    deleteTag,
    setClientTags,
  };
}
