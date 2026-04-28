import { useCallback, useEffect, useState } from 'react';
import { supabase, isSupabaseEnabled } from '../lib/supabase';
import type { ProjectBrief } from '../lib/types';

/**
 * Gestion du brief d'un projet (1:1).
 * - `brief = null` → aucun brief créé (l'admin n'a pas encore commencé)
 * - `upsert()` crée OU met à jour le brief
 * - `clearValidation()` annule la signature client (utile si modification scope)
 */
export function useProjectBrief(projectId: string | null) {
  const [brief, setBrief] = useState<ProjectBrief | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBrief = useCallback(async () => {
    if (!projectId || !isSupabaseEnabled() || !supabase) {
      setBrief(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('project_briefs')
        .select('*')
        .eq('project_id', projectId)
        .maybeSingle();
      if (err) throw err;
      setBrief((data ?? null) as ProjectBrief | null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void fetchBrief();
  }, [fetchBrief]);

  const upsert = useCallback(
    async (
      patch: Partial<
        Pick<
          ProjectBrief,
          | 'objectives'
          | 'scope_in'
          | 'scope_out'
          | 'constraints'
          | 'deliverables'
          | 'figma_url'
          | 'notes'
        >
      >,
    ): Promise<ProjectBrief> => {
      if (!projectId || !isSupabaseEnabled() || !supabase) {
        throw new Error('Supabase non configuré');
      }
      const payload = { project_id: projectId, ...patch };
      const { data, error: err } = await supabase
        .from('project_briefs')
        .upsert(payload, { onConflict: 'project_id' })
        .select('*')
        .single();
      if (err) throw err;
      const updated = data as ProjectBrief;
      setBrief(updated);
      return updated;
    },
    [projectId],
  );

  /** Réinitialise la validation client (signature). À utiliser si l'admin
   *  modifie le périmètre après une signature. */
  const clearValidation = useCallback(async (): Promise<void> => {
    if (!brief?.id || !isSupabaseEnabled() || !supabase) return;
    const { error: err } = await supabase
      .from('project_briefs')
      .update({
        validated_at: null,
        validated_by_ip: null,
        validated_signature: null,
      })
      .eq('id', brief.id);
    if (err) throw err;
    setBrief({ ...brief, validated_at: null, validated_by_ip: null, validated_signature: null });
  }, [brief]);

  return { brief, loading, error, refetch: fetchBrief, upsert, clearValidation };
}
