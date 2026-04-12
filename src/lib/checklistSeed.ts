import { supabase, isSupabaseEnabled } from './supabase';
import * as local from './localCrm';
import { getChecklistTemplate } from './projectChecklistTemplates';
import type { ProjectType } from './types';

/** Insère la checklist type MAPA pour un projet (idempotent si déjà des lignes : on n’ajoute pas en double). */
export async function seedChecklistForProject(
  projectId: string,
  type: ProjectType | null | undefined
): Promise<void> {
  const labels = getChecklistTemplate(type ?? null);
  if (labels.length === 0) return;

  if (isSupabaseEnabled() && supabase) {
    const { count, error: countErr } = await supabase
      .from('project_checklist_items')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', projectId);
    if (countErr) return;
    if ((count ?? 0) > 0) return;
    const rows = labels.map((label, i) => ({
      project_id: projectId,
      label,
      done: false,
      position: i,
    }));
    await supabase.from('project_checklist_items').insert(rows);
    return;
  }

  const existing = local.localListChecklistItems(projectId);
  if (existing.length > 0) return;
  local.localBulkCreateChecklistItems(projectId, labels);
}
