/*
  Portail client v2 — extension RLS
  ---------------------------------
  Ajoute aux clients authentifiés la lecture (SELECT uniquement) des tables
  liées à leur projet : devis, factures, événements calendrier, checklist.

  Le CRM (clé anon) garde ses accès complets inchangés.
  Chaque client ne voit que les données liées à son project_id via portal_users.
*/

-- Activer RLS sur les tables concernées si ce n'est déjà fait
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_checklist_items ENABLE ROW LEVEL SECURITY;

-- Drop ancien si présent (idempotent)
DROP POLICY IF EXISTS "auth_read_own_quotes" ON public.quotes;
DROP POLICY IF EXISTS "auth_read_own_invoices" ON public.invoices;
DROP POLICY IF EXISTS "auth_read_own_events" ON public.calendar_events;
DROP POLICY IF EXISTS "auth_read_own_checklist" ON public.project_checklist_items;

-- Client authentifié : lecture seule des devis de son projet
CREATE POLICY "auth_read_own_quotes"
  ON public.quotes
  FOR SELECT TO authenticated
  USING (
    project_id IN (
      SELECT project_id FROM public.portal_users
      WHERE auth_user_id = auth.uid()
    )
  );

-- Client authentifié : lecture seule des factures de son projet
CREATE POLICY "auth_read_own_invoices"
  ON public.invoices
  FOR SELECT TO authenticated
  USING (
    project_id IN (
      SELECT project_id FROM public.portal_users
      WHERE auth_user_id = auth.uid()
    )
  );

-- Client authentifié : lecture seule des événements de son projet
CREATE POLICY "auth_read_own_events"
  ON public.calendar_events
  FOR SELECT TO authenticated
  USING (
    project_id IN (
      SELECT project_id FROM public.portal_users
      WHERE auth_user_id = auth.uid()
    )
  );

-- Client authentifié : lecture seule de la checklist de son projet
CREATE POLICY "auth_read_own_checklist"
  ON public.project_checklist_items
  FOR SELECT TO authenticated
  USING (
    project_id IN (
      SELECT project_id FROM public.portal_users
      WHERE auth_user_id = auth.uid()
    )
  );
