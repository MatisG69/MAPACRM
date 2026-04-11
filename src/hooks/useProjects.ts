import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseEnabled } from '../lib/supabase';
import * as local from '../lib/localCrm';
import { Project } from '../lib/types';

export function useProjects(clientId?: string) {
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
        setProjects(data || []);
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

  const createProject = async (values: Omit<Project, 'id' | 'created_at' | 'updated_at' | 'client'>) => {
    if (isSupabaseEnabled() && supabase) {
      const { data, error: err } = await supabase
        .from('projects')
        .insert([values])
        .select('*, client:clients(*)')
        .single();
      if (err) throw err;
      setProjects((prev) => [data, ...prev]);
      return data;
    }
    const data = local.localCreateProject(values);
    setProjects((prev) => [data, ...prev]);
    return data;
  };

  const updateProject = async (id: string, values: Partial<Project>) => {
    if (isSupabaseEnabled() && supabase) {
      const { client: _c, ...rest } = values as Partial<Project & { client: unknown }>;
      const { data, error: err } = await supabase
        .from('projects')
        .update(rest)
        .eq('id', id)
        .select('*, client:clients(*)')
        .single();
      if (err) throw err;
      setProjects((prev) => prev.map((p) => (p.id === id ? data : p)));
      return data;
    }
    const data = local.localUpdateProject(id, values);
    setProjects((prev) => prev.map((p) => (p.id === id ? data : p)));
    return data;
  };

  const deleteProject = async (id: string) => {
    if (isSupabaseEnabled() && supabase) {
      const { error: err } = await supabase.from('projects').delete().eq('id', id);
      if (err) throw err;
    } else {
      local.localDeleteProject(id);
    }
    setProjects((prev) => prev.filter((p) => p.id !== id));
  };

  return { projects, loading, error, refetch: fetchProjects, createProject, updateProject, deleteProject };
}
