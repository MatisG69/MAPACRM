import { supabase, isSupabaseEnabled } from './supabase';
import * as local from './localCrm';

/** Recalcule `projects.progress` à partir des tâches liées (ignore si aucune tâche). */
export async function syncProjectProgressForProjectId(projectId: string): Promise<void> {
  try {
    if (isSupabaseEnabled() && supabase) {
      const { data: ts, error } = await supabase.from('tasks').select('status').eq('project_id', projectId);
      if (error) return;
      const list = ts || [];
      if (list.length === 0) return;
      const done = list.filter((t: { status: string }) => t.status === 'completed').length;
      const pct = Math.round((done / list.length) * 100);
      await supabase.from('projects').update({ progress: pct }).eq('id', projectId);
    } else {
      local.localSyncProjectProgressFromTasks(projectId);
    }
  } catch {
    /* ne pas bloquer la sauvegarde de tâche */
  }
}

export async function syncProjectProgressForMany(
  projectIds: (string | null | undefined)[]
): Promise<void> {
  const uniq = [...new Set(projectIds.filter((x): x is string => Boolean(x)))];
  for (const id of uniq) {
    await syncProjectProgressForProjectId(id);
  }
}
