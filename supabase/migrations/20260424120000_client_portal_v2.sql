/*
  Portail client v2 — suivi projet
  --------------------------------
  - `portal_users`    : associe un utilisateur Supabase Auth (email + mot de passe)
                        à un projet donné.
  - `project_steps`   : étapes d'avancement (timeline) d'un projet, visibles par le client.
  - `portal_messages` : messagerie bidirectionnelle client ↔ équipe.

  Principe :
  - Le CRM reste ouvert (clé anon + RLS permissif) pour l'équipe interne.
  - L'espace client utilise la même base Supabase mais via l'authentification
    (email + mot de passe). Les politiques `authenticated` limitent chaque client
    à son propre projet.

  Prérequis Supabase Dashboard :
    Authentication → Providers → Email : activé
    Authentication → Email : désactiver « Confirm email » pour que les clients
    puissent se connecter immédiatement après création par l'admin
    (le CRM crée le compte, l'admin transmet l'email + mot de passe au client).
*/

-- ─────────────────────────────────────────────────────────────
-- 1. Tables
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.portal_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL UNIQUE,
  name text,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_portal_users_auth ON public.portal_users(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_portal_users_project ON public.portal_users(project_id);

CREATE TABLE IF NOT EXISTS public.project_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  order_index int NOT NULL DEFAULT 0,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','in_progress','done')),
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_steps_project
  ON public.project_steps(project_id, order_index);

CREATE TABLE IF NOT EXISTS public.portal_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  sender text NOT NULL CHECK (sender IN ('client','team')),
  content text NOT NULL,
  read_by_admin boolean NOT NULL DEFAULT false,
  read_by_client boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_portal_messages_project
  ON public.portal_messages(project_id, created_at DESC);

-- Trigger updated_at sur project_steps
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS project_steps_touch ON public.project_steps;
CREATE TRIGGER project_steps_touch
  BEFORE UPDATE ON public.project_steps
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ─────────────────────────────────────────────────────────────
-- 2. RLS
-- ─────────────────────────────────────────────────────────────

ALTER TABLE public.portal_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_messages ENABLE ROW LEVEL SECURITY;

-- 2.a) Rôle anon (CRM interne) : accès complet
DROP POLICY IF EXISTS "anon_all_portal_users" ON public.portal_users;
DROP POLICY IF EXISTS "anon_all_project_steps" ON public.project_steps;
DROP POLICY IF EXISTS "anon_all_portal_messages" ON public.portal_messages;

CREATE POLICY "anon_all_portal_users"
  ON public.portal_users
  FOR ALL TO anon
  USING (true) WITH CHECK (true);

CREATE POLICY "anon_all_project_steps"
  ON public.project_steps
  FOR ALL TO anon
  USING (true) WITH CHECK (true);

CREATE POLICY "anon_all_portal_messages"
  ON public.portal_messages
  FOR ALL TO anon
  USING (true) WITH CHECK (true);

-- 2.b) Rôle authenticated (client connecté) : seulement son projet
DROP POLICY IF EXISTS "auth_read_own_portal_user" ON public.portal_users;
DROP POLICY IF EXISTS "auth_read_own_project" ON public.projects;
DROP POLICY IF EXISTS "auth_read_own_steps" ON public.project_steps;
DROP POLICY IF EXISTS "auth_read_own_messages" ON public.portal_messages;
DROP POLICY IF EXISTS "auth_send_messages" ON public.portal_messages;
DROP POLICY IF EXISTS "auth_mark_messages_read" ON public.portal_messages;

-- Le client lit sa propre fiche portail
CREATE POLICY "auth_read_own_portal_user"
  ON public.portal_users
  FOR SELECT TO authenticated
  USING (auth_user_id = auth.uid());

-- Le client lit les infos de son projet
CREATE POLICY "auth_read_own_project"
  ON public.projects
  FOR SELECT TO authenticated
  USING (
    id IN (
      SELECT project_id FROM public.portal_users
      WHERE auth_user_id = auth.uid()
    )
  );

-- Le client lit les étapes de son projet
CREATE POLICY "auth_read_own_steps"
  ON public.project_steps
  FOR SELECT TO authenticated
  USING (
    project_id IN (
      SELECT project_id FROM public.portal_users
      WHERE auth_user_id = auth.uid()
    )
  );

-- Le client lit les messages de son projet
CREATE POLICY "auth_read_own_messages"
  ON public.portal_messages
  FOR SELECT TO authenticated
  USING (
    project_id IN (
      SELECT project_id FROM public.portal_users
      WHERE auth_user_id = auth.uid()
    )
  );

-- Le client peut envoyer des messages (sender = 'client' uniquement)
CREATE POLICY "auth_send_messages"
  ON public.portal_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    sender = 'client'
    AND project_id IN (
      SELECT project_id FROM public.portal_users
      WHERE auth_user_id = auth.uid()
    )
  );

-- Le client peut marquer ses messages entrants comme lus
CREATE POLICY "auth_mark_messages_read"
  ON public.portal_messages
  FOR UPDATE TO authenticated
  USING (
    project_id IN (
      SELECT project_id FROM public.portal_users
      WHERE auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    project_id IN (
      SELECT project_id FROM public.portal_users
      WHERE auth_user_id = auth.uid()
    )
  );
