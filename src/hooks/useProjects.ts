import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseEnabled } from '../lib/supabase';
import * as local from '../lib/localCrm';
import {
  mergeProjectSiteUrlFromOverlay,
  removeSiteUrlOverlay,
  setSiteUrlOverlay,
  supabaseMissingSiteUrlColumn,
} from '../lib/projectSiteUrlOverlay';
import { Project } from '../lib/types';

export interface UseProjectsOptions {
  afterCreate?: (project: Project) => void | Promise<void>;
}

function omitSiteUrl<V extends Record<string, unknown>>(row: V): Omit<V, 'site_url'> {
  const { site_url: _s, ...rest } = row;
  return rest as Omit<V, 'site_url'>;
}

export function useProjects(clientId?: string, options?: UseProjectsOptions) {
  const afterCreate = options?.afterCreate;
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (isSupabaseEnabled() && supabase) {
        let query = supabase
          .from('projects')
          .select('*, client:clients(*)')
          .order('created_at', { ascending: false });
        if (clientId) query = query.eq('client_id', clientId);
        const { data, error: err } = await query;
        if (err) throw err;
        setProjects(mergeProjectSiteUrlFromOverlay(data || []) as Project[]);
      } else {
        setProjects(local.localListProjects(clientId));
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  /** Recharge la liste sans passer `loading` à true (ex. après synchro tâches → progression). */
  const refreshProjectsQuietly = useCallback(async () => {
    try {
      if (isSupabaseEnabled() && supabase) {
        let query = supabase
          .from('projects')
          .select('*, client:clients(*)')
          .order('created_at', { ascending: false });
        if (clientId) query = query.eq('client_id', clientId);
        const { data, error: err } = await query;
        if (err) throw err;
        setProjects(mergeProjectSiteUrlFromOverlay(data || []) as Project[]);
      } else {
        setProjects(local.localListProjects(clientId));
      }
    } catch {
      /* silencieux */
    }
  }, [clientId]);

  const createProject = async (values: Omit<Project, 'id' | 'created_at' | 'updated_at' | 'client'>) => {
    if (isSupabaseEnabled() && supabase) {
      let { data, error: err } = await supabase
        .from('projects')
        .insert([values as Record<string, unknown>])
        .select('*, client:clients(*)')
        .single();
      if (err && supabaseMissingSiteUrlColumn(err)) {
        const fallback = omitSiteUrl(values as Record<string, unknown>);
        const r2 = await supabase
          .from('projects')
          .insert([fallback])
          .select('*, client:clients(*)')
          .single();
        data = r2.data;
        err = r2.error;
        if (!err && data && values.site_url) setSiteUrlOverlay(data.id, values.site_url);
      }
      if (err) throw err;
      const row = mergeProjectSiteUrlFromOverlay([data!])[0] as Project;
      setProjects((prev) => [row, ...prev]);
      await afterCreate?.(row);
      return row;
    }
    const data = local.localCreateProject(values);
    setProjects((prev) => [data, ...prev]);
    await afterCreate?.(data);
    return data;
  };

  const updateProject = async (id: string, values: Partial<Project>) => {
    if (isSupabaseEnabled() && supabase) {
      const { client: _c, ...rest } = values as Partial<Project & { client: unknown }>;
      let { data, error: err } = await supabase
        .from('projects')
        .update(rest as Record<string, unknown>)
        .eq('id', id)
        .select('*, client:clients(*)')
        .single();
      if (err && supabaseMissingSiteUrlColumn(err)) {
        const fallback = omitSiteUrl(rest as Record<string, unknown>);
        const r2 = await supabase
          .from('projects')
          .update(fallback)
          .eq('id', id)
          .select('*, client:clients(*)')
          .single();
        data = r2.data;
        err = r2.error;
        if (!err && Object.prototype.hasOwnProperty.call(values, 'site_url')) {
          setSiteUrlOverlay(id, values.site_url ?? null);
        }
      }
      if (err) throw err;
      if (data && Object.prototype.hasOwnProperty.call(data, 'site_url')) {
        removeSiteUrlOverlay(id);
      }
      const row = mergeProjectSiteUrlFromOverlay([data!])[0] as Project;
      setProjects((prev) => prev.map((p) => (p.id === id ? row : p)));
      return row;
    }
    const data = local.localUpdateProject(id, values);
    setProjects((prev) => prev.map((p) => (p.id === id ? data : p)));
    return data;
  };

  const deleteProject = async (id: string) => {
    if (isSupabaseEnabled() && supabase) {
      const { error: err } = await supabase.from('projects').delete().eq('id', id);
      if (err) throw err;
      removeSiteUrlOverlay(id);
    } else {
      local.localDeleteProject(id);
    }
    setProjects((prev) => prev.filter((p) => p.id !== id));
  };

  return {
    projects,
    loading,
    error,
    refetch: fetchProjects,
    refreshProjectsQuietly,
    createProject,
    updateProject,
    deleteProject,
  };
}
