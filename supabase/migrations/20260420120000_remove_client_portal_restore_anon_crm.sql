/*
  Retrait du portail client + magic link : suppression des objets créés par
  20260418100000_client_portal_auth_rls.sql et rétablissement des politiques RLS
  « outil interne » (clé anon) sur les tables CRM.
*/

-- Storage : politiques portail uniquement (pas de DELETE sur storage.* : protégé par Supabase)
DROP POLICY IF EXISTS "project_docs_storage_admin" ON storage.objects;
DROP POLICY IF EXISTS "project_docs_storage_client_read" ON storage.objects;
-- Bucket `project-documents` : le vider / le supprimer via Dashboard → Storage (ou Storage API), si besoin.

-- Politiques CRM « admin authentifié »
DROP POLICY IF EXISTS "crm_clients_admin" ON public.clients;
DROP POLICY IF EXISTS "crm_projects_admin_all" ON public.projects;
DROP POLICY IF EXISTS "crm_projects_client_read" ON public.projects;
DROP POLICY IF EXISTS "crm_tasks_admin" ON public.tasks;
DROP POLICY IF EXISTS "crm_interactions_admin" ON public.interactions;
DROP POLICY IF EXISTS "crm_invoices_admin" ON public.invoices;
DROP POLICY IF EXISTS "crm_calendar_events_admin" ON public.calendar_events;
DROP POLICY IF EXISTS "crm_opportunities_admin" ON public.opportunities;
DROP POLICY IF EXISTS "crm_quotes_admin" ON public.quotes;
DROP POLICY IF EXISTS "crm_project_checklist_admin" ON public.project_checklist_items;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;

DROP FUNCTION IF EXISTS public.finalize_project_invitation(uuid);
DROP FUNCTION IF EXISTS public.has_project_access(uuid);
DROP FUNCTION IF EXISTS public.is_admin();
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.sync_profile_email();

-- Tables portail (CASCADE supprime les politiques attachées)
DROP TABLE IF EXISTS public.project_documents CASCADE;
DROP TABLE IF EXISTS public.project_client_access CASCADE;
DROP TABLE IF EXISTS public.project_invitations CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Accès CRM via clé anon (usage interne, pas d’auth email dans l’app)
DROP POLICY IF EXISTS "anon_select_clients" ON public.clients;
DROP POLICY IF EXISTS "anon_insert_clients" ON public.clients;
DROP POLICY IF EXISTS "anon_update_clients" ON public.clients;
DROP POLICY IF EXISTS "anon_delete_clients" ON public.clients;

CREATE POLICY "anon_select_clients" ON public.clients FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_clients" ON public.clients FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_clients" ON public.clients FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_clients" ON public.clients FOR DELETE TO anon USING (true);

DROP POLICY IF EXISTS "anon_select_projects" ON public.projects;
DROP POLICY IF EXISTS "anon_insert_projects" ON public.projects;
DROP POLICY IF EXISTS "anon_update_projects" ON public.projects;
DROP POLICY IF EXISTS "anon_delete_projects" ON public.projects;

CREATE POLICY "anon_select_projects" ON public.projects FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_projects" ON public.projects FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_projects" ON public.projects FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_projects" ON public.projects FOR DELETE TO anon USING (true);

DROP POLICY IF EXISTS "anon_select_tasks" ON public.tasks;
DROP POLICY IF EXISTS "anon_insert_tasks" ON public.tasks;
DROP POLICY IF EXISTS "anon_update_tasks" ON public.tasks;
DROP POLICY IF EXISTS "anon_delete_tasks" ON public.tasks;

CREATE POLICY "anon_select_tasks" ON public.tasks FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_tasks" ON public.tasks FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_tasks" ON public.tasks FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_tasks" ON public.tasks FOR DELETE TO anon USING (true);

DROP POLICY IF EXISTS "anon_select_interactions" ON public.interactions;
DROP POLICY IF EXISTS "anon_insert_interactions" ON public.interactions;
DROP POLICY IF EXISTS "anon_update_interactions" ON public.interactions;
DROP POLICY IF EXISTS "anon_delete_interactions" ON public.interactions;

CREATE POLICY "anon_select_interactions" ON public.interactions FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_interactions" ON public.interactions FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_interactions" ON public.interactions FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_interactions" ON public.interactions FOR DELETE TO anon USING (true);

DROP POLICY IF EXISTS "anon_select_invoices" ON public.invoices;
DROP POLICY IF EXISTS "anon_insert_invoices" ON public.invoices;
DROP POLICY IF EXISTS "anon_update_invoices" ON public.invoices;
DROP POLICY IF EXISTS "anon_delete_invoices" ON public.invoices;

CREATE POLICY "anon_select_invoices" ON public.invoices FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_invoices" ON public.invoices FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_invoices" ON public.invoices FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_invoices" ON public.invoices FOR DELETE TO anon USING (true);

DROP POLICY IF EXISTS "anon_select_calendar_events" ON public.calendar_events;
DROP POLICY IF EXISTS "anon_insert_calendar_events" ON public.calendar_events;
DROP POLICY IF EXISTS "anon_update_calendar_events" ON public.calendar_events;
DROP POLICY IF EXISTS "anon_delete_calendar_events" ON public.calendar_events;

CREATE POLICY "anon_select_calendar_events" ON public.calendar_events FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_calendar_events" ON public.calendar_events FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_calendar_events" ON public.calendar_events FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_calendar_events" ON public.calendar_events FOR DELETE TO anon USING (true);

DROP POLICY IF EXISTS "anon_select_opportunities" ON public.opportunities;
DROP POLICY IF EXISTS "anon_insert_opportunities" ON public.opportunities;
DROP POLICY IF EXISTS "anon_update_opportunities" ON public.opportunities;
DROP POLICY IF EXISTS "anon_delete_opportunities" ON public.opportunities;

CREATE POLICY "anon_select_opportunities" ON public.opportunities FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_opportunities" ON public.opportunities FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_opportunities" ON public.opportunities FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_opportunities" ON public.opportunities FOR DELETE TO anon USING (true);

DROP POLICY IF EXISTS "anon_select_quotes" ON public.quotes;
DROP POLICY IF EXISTS "anon_insert_quotes" ON public.quotes;
DROP POLICY IF EXISTS "anon_update_quotes" ON public.quotes;
DROP POLICY IF EXISTS "anon_delete_quotes" ON public.quotes;

CREATE POLICY "anon_select_quotes" ON public.quotes FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_quotes" ON public.quotes FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_quotes" ON public.quotes FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_quotes" ON public.quotes FOR DELETE TO anon USING (true);

DROP POLICY IF EXISTS "anon_select_project_checklist_items" ON public.project_checklist_items;
DROP POLICY IF EXISTS "anon_insert_project_checklist_items" ON public.project_checklist_items;
DROP POLICY IF EXISTS "anon_update_project_checklist_items" ON public.project_checklist_items;
DROP POLICY IF EXISTS "anon_delete_project_checklist_items" ON public.project_checklist_items;

CREATE POLICY "anon_select_project_checklist_items" ON public.project_checklist_items FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_project_checklist_items" ON public.project_checklist_items FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_project_checklist_items" ON public.project_checklist_items FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_project_checklist_items" ON public.project_checklist_items FOR DELETE TO anon USING (true);
