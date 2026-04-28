import { useCallback, useEffect, useState } from 'react';
import { supabase, isSupabaseEnabled } from '../lib/supabase';
import type { ProjectProduction } from '../lib/types';

/**
 * Module post-livraison pour un projet : URL prod, hébergeur, repo, scores
 * Lighthouse, uptime. 1:1 avec le projet, créé à la première sauvegarde.
 */
export function useProjectProduction(projectId: string | null) {
  const [data, setData] = useState<ProjectProduction | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOne = useCallback(async () => {
    if (!projectId || !isSupabaseEnabled() || !supabase) {
      setData(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data: row, error: err } = await supabase
        .from('project_production')
        .select('*')
        .eq('project_id', projectId)
        .maybeSingle();
      if (err) throw err;
      setData((row ?? null) as ProjectProduction | null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void fetchOne();
  }, [fetchOne]);

  /** Upsert sur project_id : crée la ligne si absente, sinon met à jour. */
  const save = useCallback(
    async (patch: Partial<ProjectProduction>): Promise<ProjectProduction> => {
      if (!projectId) throw new Error('Projet requis');
      if (!isSupabaseEnabled() || !supabase) throw new Error('Supabase non configuré');
      const payload = { ...patch, project_id: projectId };
      const { data: row, error: err } = await supabase
        .from('project_production')
        .upsert(payload, { onConflict: 'project_id' })
        .select('*')
        .single();
      if (err) throw err;
      const saved = row as ProjectProduction;
      setData(saved);
      return saved;
    },
    [projectId],
  );

  const remove = useCallback(async () => {
    if (!data?.id) return;
    if (!isSupabaseEnabled() || !supabase) throw new Error('Supabase non configuré');
    const { error: err } = await supabase
      .from('project_production')
      .delete()
      .eq('id', data.id);
    if (err) throw err;
    setData(null);
  }, [data]);

  return { data, loading, error, refetch: fetchOne, save, remove };
}
