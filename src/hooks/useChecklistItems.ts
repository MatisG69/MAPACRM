import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseEnabled } from '../lib/supabase';
import * as local from '../lib/localCrm';
import type { ProjectChecklistItem } from '../lib/types';

export function useChecklistItems(projectId?: string) {
  const [items, setItems] = useState<ProjectChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (isSupabaseEnabled() && supabase) {
        let query = supabase
          .from('project_checklist_items')
          .select('*')
          .order('position', { ascending: true });
        if (projectId) query = query.eq('project_id', projectId);
        const { data, error: err } = await query;
        if (err) throw err;
        setItems((data || []) as ProjectChecklistItem[]);
      } else {
        setItems(local.localListChecklistItems(projectId));
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const updateItem = async (id: string, values: Partial<ProjectChecklistItem>) => {
    if (isSupabaseEnabled() && supabase) {
      const { data, error: err } = await supabase
        .from('project_checklist_items')
        .update(values as Record<string, unknown>)
        .eq('id', id)
        .select('*')
        .single();
      if (err) throw err;
      setItems((prev) => prev.map((c) => (c.id === id ? (data as ProjectChecklistItem) : c)));
      return data as ProjectChecklistItem;
    }
    const data = local.localUpdateChecklistItem(id, values);
    setItems((prev) => prev.map((c) => (c.id === id ? data : c)));
    return data;
  };

  return { items, loading, error, refetch: fetchItems, updateItem };
}
