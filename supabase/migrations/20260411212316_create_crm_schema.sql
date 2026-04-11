/*
  # Mapa Développement CRM - Schéma Complet

  ## Tables créées

  1. **clients** - Gestion des clients et prospects
     - id, name, email, phone, company, address, city, website
     - status: prospect | active | inactive
     - source, notes, avatar_color

  2. **projects** - Suivi des projets par client
     - id, client_id (FK), name, description
     - status: planning | in_progress | review | completed | on_hold
     - budget, start_date, end_date, progress (0-100)
     - type: website | ecommerce | webapp | redesign | maintenance | seo | other

  3. **tasks** - Tâches liées aux projets
     - id, project_id (FK), title, description
     - status: todo | in_progress | completed
     - priority: low | medium | high | urgent
     - due_date

  4. **interactions** - Historique des échanges avec les clients
     - id, client_id (FK), type (call/email/meeting/note/demo)
     - description, date

  5. **invoices** - Facturation
     - id, project_id (FK), client_id (FK), invoice_number
     - amount, status (draft/sent/paid/overdue/cancelled)
     - due_date, paid_date, notes

  ## Sécurité
  - RLS activé sur toutes les tables
  - Accès anon autorisé (outil interne sans authentification)
*/

CREATE TABLE IF NOT EXISTS clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text,
  phone text,
  company text,
  address text,
  city text,
  website text,
  status text NOT NULL DEFAULT 'prospect' CHECK (status IN ('prospect', 'active', 'inactive')),
  source text,
  notes text,
  avatar_color text DEFAULT '#2563EB',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
  name text NOT NULL,
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
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
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

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_select_clients" ON clients FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_clients" ON clients FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_clients" ON clients FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_clients" ON clients FOR DELETE TO anon USING (true);

CREATE POLICY "anon_select_projects" ON projects FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_projects" ON projects FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_projects" ON projects FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_projects" ON projects FOR DELETE TO anon USING (true);

CREATE POLICY "anon_select_tasks" ON tasks FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_tasks" ON tasks FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_tasks" ON tasks FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_tasks" ON tasks FOR DELETE TO anon USING (true);

CREATE POLICY "anon_select_interactions" ON interactions FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_interactions" ON interactions FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_interactions" ON interactions FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_interactions" ON interactions FOR DELETE TO anon USING (true);

CREATE POLICY "anon_select_invoices" ON invoices FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_invoices" ON invoices FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_invoices" ON invoices FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_invoices" ON invoices FOR DELETE TO anon USING (true);

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at();
