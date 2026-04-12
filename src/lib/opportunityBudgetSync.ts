import type { Opportunity, Project } from './types';

/**
 * Détermine sur quel projet appliquer le budget issu du pipeline.
 * Ordre : 1) projet lié sur l’opportunité · 2) seul projet du client · 3) nom d’opportunité = nom de projet (trim, insensible à la casse).
 */
export function resolveProjectIdForPipelineBudget(
  opportunity: Pick<Opportunity, 'project_id' | 'client_id' | 'name'>,
  allProjects: Project[]
): string | null {
  if (opportunity.project_id) return opportunity.project_id;
  if (!opportunity.client_id) return null;

  const clientProjects = allProjects.filter((p) => p.client_id === opportunity.client_id);
  if (clientProjects.length === 0) return null;
  if (clientProjects.length === 1) return clientProjects[0].id;

  const want = opportunity.name.trim().toLowerCase();
  if (!want) return null;
  const match = clientProjects.find((p) => p.name.trim().toLowerCase() === want);
  return match?.id ?? null;
}

export function pipelineAmountAsBudget(amount: unknown): number | null {
  if (amount == null) return null;
  const n = typeof amount === 'string' ? parseFloat(amount) : Number(amount);
  if (Number.isNaN(n) || n < 0) return null;
  return n;
}
