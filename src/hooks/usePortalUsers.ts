import { useCallback, useEffect, useState } from 'react';
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
 * Flux de pré-autorisation (aucun email envoyé par MAPA) :
 *   1. L'admin saisit email + nom + projet (aucun mot de passe, aucun email).
 *   2. Insertion d'une ligne `portal_users` (auth_user_id = null) — l'email
 *      est ainsi pré-autorisé sur le portail.
 *   3. Le client se rend sur l'espace client, choisit l'onglet « Première
 *      connexion », saisit l'email pré-autorisé et choisit son mot de passe.
 *   4. Le portail vérifie la pré-autorisation puis appelle `auth.signUp`
 *      avec le mot de passe choisi par le client.
 *   5. Le trigger Postgres (cf. migration `link_portal_user_on_auth_signup`)
 *      relie `auth.users.id` à la ligne `portal_users` par correspondance
 *      d'email — le client est immédiatement connecté à son projet.
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

  /**
   * Pré-autorise un email à se connecter au portail. Aucun email n'est envoyé.
   * Le client définira son mot de passe lui-même lors de sa première connexion.
   */
  const inviteUser = useCallback(
    async ({ email, name, projectId }: InvitePortalUserInput): Promise<PortalUser> => {
      if (!supabase) throw new Error('Supabase non configuré');

      const cleanEmail = email.trim().toLowerCase();

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

  return { users, loading, error, fetchUsers, inviteUser, updateProject, deleteUser };
}
