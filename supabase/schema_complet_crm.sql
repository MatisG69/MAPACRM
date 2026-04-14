-- =============================================================================
-- MAPACRM — Schéma SQL complet (toutes les tables + relations + RLS)
-- =============================================================================
-- À exécuter dans l’éditeur SQL Supabase, Bolt, ou psql sur une base vide
-- (ou après avoir vidé les tables concernées).
--
-- Graphe des relations :
--   clients ◄── projects.client_id
--   clients ◄── interactions.client_id  (CASCADE si client supprimé)
--   clients ◄── invoices.client_id
--   clients ◄── calendar_events.client_id
--   clients ◄── opportunities.client_id (CASCADE)
--   clients ◄── quotes.client_id       (CASCADE)
--   projects ◄── tasks.project_id       (CASCADE si projet supprimé)
--   projects ◄── invoices.project_id
--   projects ◄── calendar_events.project_id
--   projects ◄── opportunities.project_id
--   projects ◄── quotes.project_id
--   projects ◄── project_checklist_items.project_id (CASCADE)
--   opportunities ◄── quotes.opportunity_id
--   quotes ◄── invoices.source_quote_id
--
-- RLS : politiques « anon » en lecture/écriture (outil interne avec clé anon).
-- En production avec utilisateurs authentifiés, remplacez ces politiques.
-- =============================================================================

-- Extensions utiles (gen_random_uuid) — souvent déjà activée sur Supabase
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -----------------------------------------------------------------------------
-- Tables
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text,
  phone text,
  company text,
  address text,
  city text,
  website text,
  status text NOT NULL DEFAULT 'prospect' CHECK (
    status IN ('prospect', 'telephoned', 'in_discussion', 'interested', 'not_interested')
  ),
  source text,
  notes text,
  satisfaction_rating integer CHECK (satisfaction_rating IS NULL OR (satisfaction_rating >= 1 AND satisfaction_rating <= 5)),
  feedback text,
  avatar_color text DEFAULT '#2563EB',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
  name text NOT NULL,
  site_url text,
  description text,
  status text NOT NULL DEFAULT 'planning' CHECK (status IN ('planning', 'in_progress', 'review', 'completed', 'on_hold')),
  budget numeric(10,2),
  start_date date,
  end_date date,
  progress integer DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  type text CHECK (type IN ('website', 'ecommerce', 'webapp', 'redesign', 'maintenance', 'seo', 'other')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'completed')),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  due_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('call', 'email', 'meeting', 'note', 'demo')),
  description text NOT NULL,
  date timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
  invoice_number text,
  amount numeric(10,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
  due_date date,
  paid_date date,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  start_at timestamptz NOT NULL,
  end_at timestamptz,
  all_day boolean NOT NULL DEFAULT false,
  recurrence text NOT NULL DEFAULT 'none' CHECK (recurrence IN ('none', 'daily', 'weekly', 'monthly')),
  recurrence_until date,
  client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  color text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  name text NOT NULL,
  stage text NOT NULL DEFAULT 'lead_detected' CHECK (
    stage IN (
      'lead_detected',
      'contacted',
      'meeting_scheduled',
      'quote_sent',
      'follow_up',
      'won',
      'lost'
    )
  ),
  probability integer NOT NULL DEFAULT 10 CHECK (probability >= 0 AND probability <= 100),
  estimated_amount numeric(10, 2),
  expected_close_date date,
  lost_reason text CHECK (
    lost_reason IS NULL
    OR lost_reason IN ('too_expensive', 'not_priority', 'competitor', 'no_budget', 'ghosted', 'other')
  ),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  opportunity_id uuid REFERENCES opportunities(id) ON DELETE SET NULL,
  title text NOT NULL,
  quote_number text,
  amount numeric(10, 2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'signed', 'refused', 'expired')),
  valid_until date,
  deposit_requested boolean NOT NULL DEFAULT false,
  deposit_amount numeric(10, 2),
  version integer NOT NULL DEFAULT 1,
  parent_quote_id uuid REFERENCES quotes(id) ON DELETE SET NULL,
  notes text,
  signed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS project_checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  label text NOT NULL,
  done boolean NOT NULL DEFAULT false,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Lien facture → devis (conversion)
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS source_quote_id uuid REFERENCES quotes(id) ON DELETE SET NULL;

-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_checklist_items ENABLE ROW LEVEL SECURITY;

-- clients
DROP POLICY IF EXISTS "anon_select_clients" ON clients;
DROP POLICY IF EXISTS "anon_insert_clients" ON clients;
DROP POLICY IF EXISTS "anon_update_clients" ON clients;
DROP POLICY IF EXISTS "anon_delete_clients" ON clients;
CREATE POLICY "anon_select_clients" ON clients FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_clients" ON clients FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_clients" ON clients FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_clients" ON clients FOR DELETE TO anon USING (true);

-- projects
DROP POLICY IF EXISTS "anon_select_projects" ON projects;
DROP POLICY IF EXISTS "anon_insert_projects" ON projects;
DROP POLICY IF EXISTS "anon_update_projects" ON projects;
DROP POLICY IF EXISTS "anon_delete_projects" ON projects;
CREATE POLICY "anon_select_projects" ON projects FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_projects" ON projects FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_projects" ON projects FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_projects" ON projects FOR DELETE TO anon USING (true);

-- tasks
DROP POLICY IF EXISTS "anon_select_tasks" ON tasks;
DROP POLICY IF EXISTS "anon_insert_tasks" ON tasks;
DROP POLICY IF EXISTS "anon_update_tasks" ON tasks;
DROP POLICY IF EXISTS "anon_delete_tasks" ON tasks;
CREATE POLICY "anon_select_tasks" ON tasks FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_tasks" ON tasks FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_tasks" ON tasks FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_tasks" ON tasks FOR DELETE TO anon USING (true);

-- interactions
DROP POLICY IF EXISTS "anon_select_interactions" ON interactions;
DROP POLICY IF EXISTS "anon_insert_interactions" ON interactions;
DROP POLICY IF EXISTS "anon_update_interactions" ON interactions;
DROP POLICY IF EXISTS "anon_delete_interactions" ON interactions;
CREATE POLICY "anon_select_interactions" ON interactions FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_interactions" ON interactions FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_interactions" ON interactions FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_interactions" ON interactions FOR DELETE TO anon USING (true);

-- invoices
DROP POLICY IF EXISTS "anon_select_invoices" ON invoices;
DROP POLICY IF EXISTS "anon_insert_invoices" ON invoices;
DROP POLICY IF EXISTS "anon_update_invoices" ON invoices;
DROP POLICY IF EXISTS "anon_delete_invoices" ON invoices;
CREATE POLICY "anon_select_invoices" ON invoices FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_invoices" ON invoices FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_invoices" ON invoices FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_invoices" ON invoices FOR DELETE TO anon USING (true);

-- calendar_events
DROP POLICY IF EXISTS "anon_select_calendar_events" ON calendar_events;
DROP POLICY IF EXISTS "anon_insert_calendar_events" ON calendar_events;
DROP POLICY IF EXISTS "anon_update_calendar_events" ON calendar_events;
DROP POLICY IF EXISTS "anon_delete_calendar_events" ON calendar_events;
CREATE POLICY "anon_select_calendar_events" ON calendar_events FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_calendar_events" ON calendar_events FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_calendar_events" ON calendar_events FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_calendar_events" ON calendar_events FOR DELETE TO anon USING (true);

-- opportunities
DROP POLICY IF EXISTS "anon_select_opportunities" ON opportunities;
DROP POLICY IF EXISTS "anon_insert_opportunities" ON opportunities;
DROP POLICY IF EXISTS "anon_update_opportunities" ON opportunities;
DROP POLICY IF EXISTS "anon_delete_opportunities" ON opportunities;
CREATE POLICY "anon_select_opportunities" ON opportunities FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_opportunities" ON opportunities FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_opportunities" ON opportunities FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_opportunities" ON opportunities FOR DELETE TO anon USING (true);

-- quotes
DROP POLICY IF EXISTS "anon_select_quotes" ON quotes;
DROP POLICY IF EXISTS "anon_insert_quotes" ON quotes;
DROP POLICY IF EXISTS "anon_update_quotes" ON quotes;
DROP POLICY IF EXISTS "anon_delete_quotes" ON quotes;
CREATE POLICY "anon_select_quotes" ON quotes FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_quotes" ON quotes FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_quotes" ON quotes FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_quotes" ON quotes FOR DELETE TO anon USING (true);

-- project_checklist_items
DROP POLICY IF EXISTS "anon_select_project_checklist_items" ON project_checklist_items;
DROP POLICY IF EXISTS "anon_insert_project_checklist_items" ON project_checklist_items;
DROP POLICY IF EXISTS "anon_update_project_checklist_items" ON project_checklist_items;
DROP POLICY IF EXISTS "anon_delete_project_checklist_items" ON project_checklist_items;
CREATE POLICY "anon_select_project_checklist_items" ON project_checklist_items FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_project_checklist_items" ON project_checklist_items FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_project_checklist_items" ON project_checklist_items FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_project_checklist_items" ON project_checklist_items FOR DELETE TO anon USING (true);

-- -----------------------------------------------------------------------------
-- Trigger : mise à jour automatique de updated_at
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_clients_updated_at ON clients;
CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;
CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_tasks_updated_at ON tasks;
CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_invoices_updated_at ON invoices;
CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_calendar_events_updated_at ON calendar_events;
CREATE TRIGGER update_calendar_events_updated_at
  BEFORE UPDATE ON calendar_events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_opportunities_updated_at ON opportunities;
CREATE TRIGGER update_opportunities_updated_at
  BEFORE UPDATE ON opportunities
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_quotes_updated_at ON quotes;
CREATE TRIGGER update_quotes_updated_at
  BEFORE UPDATE ON quotes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_project_checklist_items_updated_at ON project_checklist_items;
CREATE TRIGGER update_project_checklist_items_updated_at
  BEFORE UPDATE ON project_checklist_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Si EXECUTE FUNCTION échoue (Postgres < 14), remplacer par :
--   EXECUTE PROCEDURE update_updated_at();

-- =============================================================================
-- Fin du schéma
-- =============================================================================
