import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { ProjectStep, ProjectStepStatus } from '../lib/types';

export interface NewProjectStepInput {
  title: string;
  description?: string | null;
  status?: ProjectStepStatus;
  order_index?: number;
}

export function useProjectSteps(projectId: string | null | undefined) {
  const [steps, setSteps] = useState<ProjectStep[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSteps = useCallback(async () => {
    if (!supabase || !projectId) {
      setSteps([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('project_steps')
        .select('*')
        .eq('project_id', projectId)
        .order('order_index', { ascending: true });
      if (err) throw err;
      setSteps((data ?? []) as ProjectStep[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchSteps();
  }, [fetchSteps]);

  const createStep = useCallback(
    async (input: NewProjectStepInput): Promise<ProjectStep> => {
      if (!supabase || !projectId) throw new Error('Projet introuvable');
      const nextIndex =
        input.order_index ?? (steps.length > 0 ? Math.max(...steps.map((s) => s.order_index)) + 1 : 0);
      const { data, error: err } = await supabase
        .from('project_steps')
        .insert({
          project_id: projectId,
          title: input.title,
          description: input.description ?? null,
          status: input.status ?? 'pending',
          order_index: nextIndex,
        })
        .select('*')
        .single();
      if (err) throw err;
      const created = data as ProjectStep;
      setSteps((prev) => [...prev, created].sort((a, b) => a.order_index - b.order_index));
      return created;
    },
    [projectId, steps]
  );

  const updateStep = useCallback(async (id: string, patch: Partial<ProjectStep>) => {
    if (!supabase) throw new Error('Supabase non configuré');
    // Horodatage auto des transitions de statut
    const enriched: Partial<ProjectStep> = { ...patch };
    if (patch.status === 'in_progress' && !patch.started_at) {
      enriched.started_at = new Date().toISOString();
    }
    if (patch.status === 'done') {
      enriched.completed_at = patch.completed_at ?? new Date().toISOString();
      enriched.started_at = enriched.started_at ?? new Date().toISOString();
    }
    if (patch.status === 'pending') {
      enriched.completed_at = null;
    }
    const { data, error: err } = await supabase
      .from('project_steps')
      .update(enriched)
      .eq('id', id)
      .select('*')
      .single();
    if (err) throw err;
    setSteps((prev) => prev.map((s) => (s.id === id ? (data as ProjectStep) : s)));
  }, []);

  const deleteStep = useCallback(async (id: string) => {
    if (!supabase) throw new Error('Supabase non configuré');
    const { error: err } = await supabase.from('project_steps').delete().eq('id', id);
    if (err) throw err;
    setSteps((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const reorder = useCallback(async (orderedIds: string[]) => {
    if (!supabase) throw new Error('Supabase non configuré');
    const updates = orderedIds.map((id, idx) =>
      supabase!.from('project_steps').update({ order_index: idx }).eq('id', id)
    );
    await Promise.all(updates);
    setSteps((prev) =>
      [...prev]
        .map((s) => {
          const i = orderedIds.indexOf(s.id);
          return i >= 0 ? { ...s, order_index: i } : s;
        })
        .sort((a, b) => a.order_index - b.order_index)
    );
  }, []);

  return { steps, loading, error, fetchSteps, createStep, updateStep, deleteStep, reorder };
}
