import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseEnabled } from '../lib/supabase';
import * as local from '../lib/localCrm';
import { Task } from '../lib/types';

export function useTasks(projectId?: string) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (isSupabaseEnabled() && supabase) {
        let query = supabase
          .from('tasks')
          .select('*, project:projects(id, name)')
          .order('created_at', { ascending: false });
        if (projectId) query = query.eq('project_id', projectId);
        const { data, error: err } = await query;
        if (err) throw err;
        setTasks(data || []);
      } else {
        setTasks(local.localListTasks(projectId));
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const createTask = async (values: Omit<Task, 'id' | 'created_at' | 'updated_at' | 'project'>) => {
    if (isSupabaseEnabled() && supabase) {
      const { data, error: err } = await supabase
        .from('tasks')
        .insert([values])
        .select('*, project:projects(id, name)')
        .single();
      if (err) throw err;
      setTasks((prev) => [data, ...prev]);
      return data;
    }
    const data = local.localCreateTask(values);
    setTasks((prev) => [data, ...prev]);
    return data;
  };

  const updateTask = async (id: string, values: Partial<Task>) => {
    if (isSupabaseEnabled() && supabase) {
      const { project: _p, ...rest } = values as Partial<Task & { project: unknown }>;
      const { data, error: err } = await supabase
        .from('tasks')
        .update(rest)
        .eq('id', id)
        .select('*, project:projects(id, name)')
        .single();
      if (err) throw err;
      setTasks((prev) => prev.map((t) => (t.id === id ? data : t)));
      return data;
    }
    const data = local.localUpdateTask(id, values);
    setTasks((prev) => prev.map((t) => (t.id === id ? data : t)));
    return data;
  };

  const deleteTask = async (id: string) => {
    if (isSupabaseEnabled() && supabase) {
      const { error: err } = await supabase.from('tasks').delete().eq('id', id);
      if (err) throw err;
    } else {
      local.localDeleteTask(id);
    }
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  return { tasks, loading, error, refetch: fetchTasks, createTask, updateTask, deleteTask };
}
