-- ════════════════════════════════════════════════════════════════════════
-- Durcissement RLS : le CRM passe d'un accès « clé anon ouverte » à un accès
-- réservé à l'administrateur authentifié (Supabase Auth).
--
-- Effet :
--   · anon ne peut PLUS lire / modifier / supprimer les données CRM.
--   · seul un compte présent dans public.crm_admins (authentifié) a accès.
--   · surfaces publiques conservées :
--       - INSERT anon sur service_requests / page_views / website_requests
--         (formulaire + analytics du site vitrine)
--       - SELECT anon sur availability_rules / calendar_busy_ranges
--         (widget de réservation public, données non sensibles)
--   · les politiques `authenticated` du portail client sont PRÉSERVÉES
--     (la suppression ne cible que les politiques accordées au rôle `anon`).
--
-- ⚠️ ORDRE DE DÉPLOIEMENT OBLIGATOIRE (sinon lockout du CRM) :
--   1. Déployer le CRM AVEC l'écran de login (AuthGate) sur Vercel.
--   2. Se connecter (contactmapadev@gmail.com) → session authenticated active.
--   3. SEULEMENT ENSUITE, exécuter cette migration dans le SQL Editor.
-- ════════════════════════════════════════════════════════════════════════

-- ── 1. Modèle admin ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.crm_admins (
  user_id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.crm_admins ENABLE ROW LEVEL SECURITY;

-- Compte admin MAPA (créé via l'API admin Supabase).
INSERT INTO public.crm_admins (user_id)
VALUES ('83a9427f-7c84-4b14-9a5c-20ade619ff7d')
ON CONFLICT (user_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.is_crm_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.crm_admins a WHERE a.user_id = auth.uid()
  );
$$;

-- crm_admins : lecture réservée aux admins (écriture via service_role / SQL only).
DROP POLICY IF EXISTS "crm_admins_admin_read" ON public.crm_admins;
CREATE POLICY "crm_admins_admin_read" ON public.crm_admins
  FOR SELECT TO authenticated USING (public.is_crm_admin());

-- ── 2. Suppression de TOUTES les politiques accordées au rôle `anon` ─────
-- (préserve les politiques `authenticated` du portail client)
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND 'anon' = ANY(roles)
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- ── 3. Politique admin-only sur toutes les tables CRM + portail ──────────
-- (additive : les politiques portail `authenticated` restent actives en //)
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'clients','projects','tasks','interactions','invoices','calendar_events',
    'opportunities','quotes','project_checklist_items','folders','client_tags',
    'client_tag_assignments','client_documents','calls','notifications',
    'change_requests','meeting_notes','nda_agreements','project_briefs',
    'project_production','project_suggestions','testimonials','project_steps',
    'portal_messages','portal_users','project_client_access','project_invitations',
    'project_documents','profiles','service_requests','page_views','website_requests',
    'availability_rules'
    -- calendar_busy_ranges est une VUE (pas de RLS possible) : voir note §4.
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS "crm_admin_all" ON public.%I', t);
    EXECUTE format(
      'CREATE POLICY "crm_admin_all" ON public.%I FOR ALL TO authenticated USING (public.is_crm_admin()) WITH CHECK (public.is_crm_admin())',
      t
    );
  END LOOP;
END $$;

-- ── 4. Surfaces publiques minimales (rôle anon) ─────────────────────────
-- Formulaire de réservation du site → INSERT only.
DROP POLICY IF EXISTS "anon_insert_service_requests" ON public.service_requests;
CREATE POLICY "anon_insert_service_requests" ON public.service_requests
  FOR INSERT TO anon WITH CHECK (true);

-- Analytics du site → INSERT only (write-only, aucune lecture publique).
DROP POLICY IF EXISTS "anon_insert_page_views" ON public.page_views;
CREATE POLICY "anon_insert_page_views" ON public.page_views
  FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "anon_insert_website_requests" ON public.website_requests;
CREATE POLICY "anon_insert_website_requests" ON public.website_requests
  FOR INSERT TO anon WITH CHECK (true);

-- Widget de réservation public → SELECT only des créneaux (non sensibles).
DROP POLICY IF EXISTS "anon_select_availability_rules" ON public.availability_rules;
CREATE POLICY "anon_select_availability_rules" ON public.availability_rules
  FOR SELECT TO anon USING (true);

-- calendar_busy_ranges est une VUE : pas de RLS/policy possible. Son accès
-- public est géré par les GRANT existants ; elle n'expose que start_at/end_at
-- (conçue anti-fuite). Aucune action requise ici.
