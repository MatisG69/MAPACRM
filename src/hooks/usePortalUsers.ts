import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { PortalUser } from '../lib/types';

export interface CreatePortalUserInput {
  email: string;
  password: string;
  name: string;
  projectId: string;
}

/**
 * Gestion des identifiants d'accès au portail client.
 *
 * Création d'un compte :
 *   1. On instancie un client Supabase ÉPHÉMÈRE (sans persistance de session)
 *      pour ne pas polluer l'état du CRM — sinon `auth.signUp` ouvrirait une
 *      session dans le navigateur de l'admin.
 *   2. Ce client crée l'utilisateur Supabase Auth (email + password).
 *   3. On enregistre la ligne `portal_users` liée au projet via le client
 *      principal (anon).
 */
export function usePortalUsers() {
  const [users, setUsers] = useState<PortalUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    if (!supabase) {
      setUsers([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('portal_users')
        .select(
          `
          *,
          project:projects(id, name, status)
        `
        )
        .order('created_at', { ascending: false });
      if (err) throw err;
      setUsers((data ?? []) as PortalUser[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const createUser = useCallback(
    async ({ email, password, name, projectId }: CreatePortalUserInput): Promise<PortalUser> => {
      if (!supabase) throw new Error('Supabase non configuré');

      const url = import.meta.env.VITE_SUPABASE_URL as string;
      const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
      if (!url || !anon) throw new Error('Variables Supabase manquantes');

      // Client éphémère : signup sans polluer la session CRM
      const ephemeral = createClient(url, anon, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      });

      const { data: signUpData, error: signUpErr } = await ephemeral.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
      });
      if (signUpErr) throw signUpErr;

      const authUserId = signUpData.user?.id ?? null;
      if (!authUserId) {
        throw new Error(
          "Compte créé mais identifiant auth non récupéré. Vérifier que la confirmation d'email est désactivée dans Supabase."
        );
      }

      const { data: inserted, error: insertErr } = await supabase
        .from('portal_users')
        .insert({
          auth_user_id: authUserId,
          email: email.trim().toLowerCase(),
          name: name.trim() || null,
          project_id: projectId,
        })
        .select('*, project:projects(id, name, status)')
        .single();
      if (insertErr) throw insertErr;

      const created = inserted as PortalUser;
      setUsers((prev) => [created, ...prev]);
      return created;
    },
    []
  );

  const updateProject = useCallback(async (id: string, projectId: string | null) => {
    if (!supabase) throw new Error('Supabase non configuré');
    const { data, error: err } = await supabase
      .from('portal_users')
      .update({ project_id: projectId })
      .eq('id', id)
      .select('*, project:projects(id, name, status)')
      .single();
    if (err) throw err;
    setUsers((prev) => prev.map((u) => (u.id === id ? (data as PortalUser) : u)));
  }, []);

  /**
   * Supprime la ligne `portal_users`. L'utilisateur auth associé est
   * orphelin (la suppression d'un user auth nécessite la service_role key).
   * Supabase → Authentication → Users permet de le faire manuellement.
   */
  const deleteUser = useCallback(async (id: string) => {
    if (!supabase) throw new Error('Supabase non configuré');
    const { error: err } = await supabase.from('portal_users').delete().eq('id', id);
    if (err) throw err;
    setUsers((prev) => prev.filter((u) => u.id !== id));
  }, []);

  return { users, loading, error, fetchUsers, createUser, updateProject, deleteUser };
}
