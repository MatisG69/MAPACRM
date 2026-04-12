import type { Project, Task } from './types';

export function taskStatsForProject(tasks: Task[], projectId: string): { total: number; completed: number } {
  const list = tasks.filter((t) => t.project_id === projectId);
  return {
    total: list.length,
    completed: list.filter((t) => t.status === 'completed').length,
  };
}

/** Pourcentage dérivé des tâches, ou `null` s’il n’y a aucune tâche sur ce projet. */
export function progressPercentFromTasks(tasks: Task[], projectId: string): number | null {
  const { total, completed } = taskStatsForProject(tasks, projectId);
  if (total === 0) return null;
  return Math.round((completed / total) * 100);
}

export interface ResolvedProjectProgress {
  percent: number;
  /** `true` si au moins une tâche est rattachée — la barre suit les tâches */
  taskDriven: boolean;
  completed: number;
  total: number;
}

export function resolveProjectProgress(project: Project, allTasks: Task[]): ResolvedProjectProgress {
  const fromTasks = progressPercentFromTasks(allTasks, project.id);
  if (fromTasks !== null) {
    const { total, completed } = taskStatsForProject(allTasks, project.id);
    return { percent: fromTasks, taskDriven: true, completed, total };
  }
  return {
    percent: Math.min(100, Math.max(0, project.progress)),
    taskDriven: false,
    completed: 0,
    total: 0,
  };
}
