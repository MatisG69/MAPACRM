import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { PortalUser } from '../lib/types';

export interface InvitePortalUserInput {
  email: string;
  name: string;
  projectId: string;
}

/**
 * Gestion des identifiants d'accès au portail client.
 *
 * Flux d'invitation (le client choisit son propre mot de passe) :
 *   1. L'admin saisit email + nom + projet (aucun mot de passe).
 *   2. Insertion d'une ligne `portal_users` (auth_user_id = null à ce stade).
 *   3. Envoi d'un lien magique Supabase via `signInWithOtp` depuis un client
 *      ÉPHÉMÈRE (sans persistance de session, pour ne pas polluer le CRM).
 *      `shouldCreateUser: true` crée l'auth user et envoie un email.
 *   4. À l'arrivée du client sur le portail, un trigger Postgres
 *      (cf. migration `link_portal_user_on_auth_signup`) relie
 *      `auth.users.id` à la ligne `portal_users` par correspondance d'email.
 *   5. Le client définit lui-même son mot de passe depuis le portail.
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

  const inviteUser = useCallback(
    async ({ email, name, projectId }: InvitePortalUserInput): Promise<PortalUser> => {
      if (!supabase) throw new Error('Supabase non configuré');

      const url = import.meta.env.VITE_SUPABASE_URL as string;
      const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
      if (!url || !anon) throw new Error('Variables Supabase manquantes');

      const portalUrl =
        (import.meta.env.VITE_PORTAL_URL as string | undefined)?.trim() || window.location.origin;
      const cleanEmail = email.trim().toLowerCase();

      // 1. Créer la ligne portal_users (auth_user_id = null jusqu'à acceptation)
      const { data: inserted, error: insertErr } = await supabase
        .from('portal_users')
        .insert({
          auth_user_id: null,
          email: cleanEmail,
          name: name.trim() || null,
          project_id: projectId,
        })
        .select('*, project:projects(id, name, status)')
        .single();
      if (insertErr) throw insertErr;

      // 2. Envoyer le lien d'invitation via signInWithOtp (client éphémère)
      const ephemeral = createClient(url, anon, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      });

      const { error: otpErr } = await ephemeral.auth.signInWithOtp({
        email: cleanEmail,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: portalUrl,
        },
      });

      if (otpErr) {
        // Rollback : on retire la ligne portal_users si l'envoi a échoué
        await supabase.from('portal_users').delete().eq('id', (inserted as PortalUser).id);
        throw new Error(`Envoi de l'invitation impossible : ${otpErr.message}`);
      }

      const created = inserted as PortalUser;
      setUsers((prev) => [created, ...prev]);
      return created;
    },
    []
  );

  /** Renvoie un nouveau lien d'invitation à un identifiant existant. */
  const resendInvite = useCallback(async (email: string): Promise<void> => {
    const url = import.meta.env.VITE_SUPABASE_URL as string;
    const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
    if (!url || !anon) throw new Error('Variables Supabase manquantes');

    const portalUrl =
      (import.meta.env.VITE_PORTAL_URL as string | undefined)?.trim() || window.location.origin;

    const ephemeral = createClient(url, anon, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });

    const { error: otpErr } = await ephemeral.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { shouldCreateUser: true, emailRedirectTo: portalUrl },
    });
    if (otpErr) throw otpErr;
  }, []);

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

  return { users, loading, error, fetchUsers, inviteUser, resendInvite, updateProject, deleteUser };
}
