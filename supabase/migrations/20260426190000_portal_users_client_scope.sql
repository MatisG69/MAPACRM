/*
  Portal users — passage du périmètre projet au périmètre client
  ----------------------------------------------------------------
  Avant : un identifiant portail = 1 projet (portal_users.project_id).
  Après : un identifiant portail = 1 client (portal_users.client_id).
          Le client voit tous SES projets dans son espace.

  Étapes :
    1. Ajout de portal_users.client_id (FK clients) + backfill depuis
       projects.client_id du project_id existant.
    2. Mise à jour des politiques RLS authenticated pour filtrer par
       client_id (via projects.client_id) au lieu de project_id direct.
    3. project_id reste présent pour rétro-compatibilité (peut être
       supprimé ultérieurement si plus aucun usage).
*/

-- 1. Colonne client_id sur portal_users
ALTER TABLE public.portal_users
  ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_portal_users_client ON public.portal_users(client_id);

-- 2. Backfill : pour chaque portal_users avec project_id rempli, retrouver
--    le client_id du projet et l'assigner au portal_users
UPDATE public.portal_users pu
SET client_id = p.client_id
FROM public.projects p
WHERE pu.project_id = p.id
  AND pu.client_id IS NULL
  AND p.client_id IS NOT NULL;

-- 3. Mise à jour des politiques RLS pour le rôle authenticated (client portail)
--    On filtre désormais par projects.client_id ∈ (portal_users.client_id de auth.uid())

-- 3.a) projects : le client lit tous ses projets (pas seulement un)
DROP POLICY IF EXISTS "auth_read_own_project" ON public.projects;
CREATE POLICY "auth_read_own_project"
  ON public.projects
  FOR SELECT TO authenticated
  USING (
    client_id IN (
      SELECT client_id FROM public.portal_users
      WHERE auth_user_id = auth.uid()
        AND client_id IS NOT NULL
    )
  );

-- 3.b) project_steps
DROP POLICY IF EXISTS "auth_read_own_steps" ON public.project_steps;
CREATE POLICY "auth_read_own_steps"
  ON public.project_steps
  FOR SELECT TO authenticated
  USING (
    project_id IN (
      SELECT p.id FROM public.projects p
      JOIN public.portal_users pu ON pu.client_id = p.client_id
      WHERE pu.auth_user_id = auth.uid()
        AND pu.client_id IS NOT NULL
    )
  );

-- 3.c) portal_messages — lecture
DROP POLICY IF EXISTS "auth_read_own_messages" ON public.portal_messages;
CREATE POLICY "auth_read_own_messages"
  ON public.portal_messages
  FOR SELECT TO authenticated
  USING (
    project_id IN (
      SELECT p.id FROM public.projects p
      JOIN public.portal_users pu ON pu.client_id = p.client_id
      WHERE pu.auth_user_id = auth.uid()
        AND pu.client_id IS NOT NULL
    )
  );

-- 3.d) portal_messages — envoi (le client peut écrire un message sur l'un de ses projets)
DROP POLICY IF EXISTS "auth_send_messages" ON public.portal_messages;
CREATE POLICY "auth_send_messages"
  ON public.portal_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    sender = 'client'
    AND project_id IN (
      SELECT p.id FROM public.projects p
      JOIN public.portal_users pu ON pu.client_id = p.client_id
      WHERE pu.auth_user_id = auth.uid()
        AND pu.client_id IS NOT NULL
    )
  );

-- 3.e) portal_messages — marquage lu côté client (UPDATE limité au champ read_by_client via app)
DROP POLICY IF EXISTS "auth_mark_messages_read" ON public.portal_messages;
CREATE POLICY "auth_mark_messages_read"
  ON public.portal_messages
  FOR UPDATE TO authenticated
  USING (
    project_id IN (
      SELECT p.id FROM public.projects p
      JOIN public.portal_users pu ON pu.client_id = p.client_id
      WHERE pu.auth_user_id = auth.uid()
        AND pu.client_id IS NOT NULL
    )
  );

-- 3.f) quotes
DROP POLICY IF EXISTS "auth_read_own_quotes" ON public.quotes;
CREATE POLICY "auth_read_own_quotes"
  ON public.quotes
  FOR SELECT TO authenticated
  USING (
    client_id IN (
      SELECT client_id FROM public.portal_users
      WHERE auth_user_id = auth.uid()
        AND client_id IS NOT NULL
    )
  );

-- 3.g) invoices
DROP POLICY IF EXISTS "auth_read_own_invoices" ON public.invoices;
CREATE POLICY "auth_read_own_invoices"
  ON public.invoices
  FOR SELECT TO authenticated
  USING (
    client_id IN (
      SELECT client_id FROM public.portal_users
      WHERE auth_user_id = auth.uid()
        AND client_id IS NOT NULL
    )
  );

-- 3.h) calendar_events
DROP POLICY IF EXISTS "auth_read_own_events" ON public.calendar_events;
CREATE POLICY "auth_read_own_events"
  ON public.calendar_events
  FOR SELECT TO authenticated
  USING (
    client_id IN (
      SELECT client_id FROM public.portal_users
      WHERE auth_user_id = auth.uid()
        AND client_id IS NOT NULL
    )
    OR project_id IN (
      SELECT p.id FROM public.projects p
      JOIN public.portal_users pu ON pu.client_id = p.client_id
      WHERE pu.auth_user_id = auth.uid()
        AND pu.client_id IS NOT NULL
    )
  );

-- 3.i) project_checklist_items
DROP POLICY IF EXISTS "auth_read_own_checklist" ON public.project_checklist_items;
CREATE POLICY "auth_read_own_checklist"
  ON public.project_checklist_items
  FOR SELECT TO authenticated
  USING (
    project_id IN (
      SELECT p.id FROM public.projects p
      JOIN public.portal_users pu ON pu.client_id = p.client_id
      WHERE pu.auth_user_id = auth.uid()
        AND pu.client_id IS NOT NULL
    )
  );
