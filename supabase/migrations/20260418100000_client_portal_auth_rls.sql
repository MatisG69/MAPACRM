/*
  Portail client + auth : profils, invitations, accès projet, documents, RLS.

  Après application : les clés anon n’ont plus accès aux données CRM.
  Connectez-vous avec magic link (profil role = admin dans public.profiles).

  Configuration Supabase (dashboard) :
  - Authentication > URL de redirection : http://localhost:5173/auth/callback , URL prod + /espace-client
  - Storage : bucket project-documents créé par cette migration
*/

-- ---------------------------------------------------------------------------
-- Profils (rôles dynamiques : admin | client — jamais en dur dans le code)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  email text,
  role text NOT NULL DEFAULT 'client' CHECK (role IN ('admin', 'client')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profiles_email_lower ON public.profiles (lower(trim(email)));

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (new.id, new.email, 'client')
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.sync_profile_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles SET email = new.email WHERE id = new.id;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE OF email ON auth.users
  FOR EACH ROW
  WHEN (old.email IS DISTINCT FROM new.email)
  EXECUTE FUNCTION public.sync_profile_email();

-- ---------------------------------------------------------------------------
-- Colonnes projet (suivi portail)
-- ---------------------------------------------------------------------------
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS current_step text,
  ADD COLUMN IF NOT EXISTS next_step text;

-- ---------------------------------------------------------------------------
-- Invitations & accès multi-clients par projet
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.project_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects (id) ON DELETE CASCADE,
  email text NOT NULL,
  token uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'revoked')),
  invited_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_invitations_project ON public.project_invitations (project_id);
CREATE INDEX IF NOT EXISTS idx_project_invitations_email_lower ON public.project_invitations (lower(trim(email)));

CREATE TABLE IF NOT EXISTS public.project_client_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  email text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  invitation_id uuid REFERENCES public.project_invitations (id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (project_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_project_client_access_user ON public.project_client_access (user_id);
CREATE INDEX IF NOT EXISTS idx_project_client_access_project ON public.project_client_access (project_id);

CREATE TABLE IF NOT EXISTS public.project_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects (id) ON DELETE CASCADE,
  file_name text NOT NULL,
  storage_path text NOT NULL,
  content_type text,
  file_size bigint,
  uploaded_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_documents_project ON public.project_documents (project_id);

-- ---------------------------------------------------------------------------
-- Helpers RLS
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.has_project_access(p_project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.project_client_access a
    WHERE a.user_id = auth.uid()
      AND a.project_id = p_project_id
      AND a.status = 'active'
  );
$$;

-- Finalisation invitation après magic link (email = compte connecté)
CREATE OR REPLACE FUNCTION public.finalize_project_invitation(p_token uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inv public.project_invitations%ROWTYPE;
  user_email text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT email INTO user_email FROM auth.users WHERE id = auth.uid();
  IF user_email IS NULL THEN
    RAISE EXCEPTION 'no_email';
  END IF;

  SELECT * INTO inv
  FROM public.project_invitations
  WHERE token = p_token;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'invitation_not_found';
  END IF;

  IF inv.status = 'revoked' THEN
    RAISE EXCEPTION 'invitation_revoked';
  END IF;

  IF inv.status = 'accepted' THEN
    RETURN;
  END IF;

  IF inv.expires_at IS NOT NULL AND inv.expires_at < now() THEN
    RAISE EXCEPTION 'invitation_expired';
  END IF;

  IF lower(trim(inv.email)) <> lower(trim(user_email)) THEN
    RAISE EXCEPTION 'email_mismatch';
  END IF;

  INSERT INTO public.project_client_access (project_id, user_id, email, status, invitation_id)
  VALUES (inv.project_id, auth.uid(), lower(trim(user_email)), 'active', inv.id)
  ON CONFLICT (project_id, user_id)
  DO UPDATE SET
    status = 'active',
    email = EXCLUDED.email,
    invitation_id = EXCLUDED.invitation_id;

  UPDATE public.project_invitations
  SET status = 'accepted'
  WHERE id = inv.id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.finalize_project_invitation(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- RLS : nouvelles tables
-- ---------------------------------------------------------------------------
ALTER TABLE public.project_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_client_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_own_or_admin"
  ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_admin());

CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_admin_update_roles"
  ON public.profiles FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Rattrapage si le trigger n’a pas créé la ligne (uniquement rôle client)
CREATE POLICY "profiles_insert_own_client_only"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid() AND role = 'client');

CREATE POLICY "invitations_admin_all"
  ON public.project_invitations FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "access_select_admin_or_self"
  ON public.project_client_access FOR SELECT TO authenticated
  USING (public.is_admin() OR user_id = auth.uid());

CREATE POLICY "access_admin_write"
  ON public.project_client_access FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "access_admin_update"
  ON public.project_client_access FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "access_admin_delete"
  ON public.project_client_access FOR DELETE TO authenticated
  USING (public.is_admin());

CREATE POLICY "documents_select_admin_or_client"
  ON public.project_documents FOR SELECT TO authenticated
  USING (public.is_admin() OR public.has_project_access(project_id));

CREATE POLICY "documents_admin_write"
  ON public.project_documents FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "documents_admin_update"
  ON public.project_documents FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "documents_admin_delete"
  ON public.project_documents FOR DELETE TO authenticated
  USING (public.is_admin());

-- ---------------------------------------------------------------------------
-- Remplacer les politiques anon (accès ouvert) par des politiques authentifiées
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT policyname, tablename
    FROM pg_policies
    WHERE schemaname = 'public'
      AND 'anon' = ANY (roles)
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- Clients
CREATE POLICY "crm_clients_admin"
  ON public.clients FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Projets : admin total ; client lecture si accès actif
CREATE POLICY "crm_projects_admin_all"
  ON public.projects FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "crm_projects_client_read"
  ON public.projects FOR SELECT TO authenticated
  USING (public.has_project_access(id));

-- Tâches, interactions, factures, calendrier, opportunités, devis, checklist : admin uniquement
CREATE POLICY "crm_tasks_admin"
  ON public.tasks FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "crm_interactions_admin"
  ON public.interactions FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "crm_invoices_admin"
  ON public.invoices FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "crm_calendar_events_admin"
  ON public.calendar_events FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "crm_opportunities_admin"
  ON public.opportunities FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "crm_quotes_admin"
  ON public.quotes FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "crm_project_checklist_admin"
  ON public.project_checklist_items FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ---------------------------------------------------------------------------
-- Storage : bucket privé pour documents projet
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('project-documents', 'project-documents', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "project_docs_storage_admin"
  ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'project-documents' AND public.is_admin())
  WITH CHECK (bucket_id = 'project-documents' AND public.is_admin());

CREATE POLICY "project_docs_storage_client_read"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'project-documents'
    AND EXISTS (
      SELECT 1
      FROM public.project_client_access a
      WHERE a.user_id = auth.uid()
        AND a.status = 'active'
        AND split_part(name, '/', 1) = a.project_id::text
    )
  );

-- Profils pour comptes déjà présents dans auth.users
INSERT INTO public.profiles (id, email, role)
SELECT id, email, 'client'::text
FROM auth.users
ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;
