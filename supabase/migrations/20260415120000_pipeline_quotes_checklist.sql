-- Opportunités (pipeline commercial), devis, checklist livrable projet, lien facture → devis
-- À exécuter une fois dans Supabase : SQL Editor → coller ce fichier → Run.
-- Si tu avais déjà cette fonction (schéma complet), CREATE OR REPLACE est sans effet nocif.

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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

ALTER TABLE invoices ADD COLUMN IF NOT EXISTS source_quote_id uuid REFERENCES quotes(id) ON DELETE SET NULL;

ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_checklist_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_opportunities" ON opportunities;
DROP POLICY IF EXISTS "anon_insert_opportunities" ON opportunities;
DROP POLICY IF EXISTS "anon_update_opportunities" ON opportunities;
DROP POLICY IF EXISTS "anon_delete_opportunities" ON opportunities;
CREATE POLICY "anon_select_opportunities" ON opportunities FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_opportunities" ON opportunities FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_opportunities" ON opportunities FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_opportunities" ON opportunities FOR DELETE TO anon USING (true);

DROP POLICY IF EXISTS "anon_select_quotes" ON quotes;
DROP POLICY IF EXISTS "anon_insert_quotes" ON quotes;
DROP POLICY IF EXISTS "anon_update_quotes" ON quotes;
DROP POLICY IF EXISTS "anon_delete_quotes" ON quotes;
CREATE POLICY "anon_select_quotes" ON quotes FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_quotes" ON quotes FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_quotes" ON quotes FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_quotes" ON quotes FOR DELETE TO anon USING (true);

DROP POLICY IF EXISTS "anon_select_project_checklist_items" ON project_checklist_items;
DROP POLICY IF EXISTS "anon_insert_project_checklist_items" ON project_checklist_items;
DROP POLICY IF EXISTS "anon_update_project_checklist_items" ON project_checklist_items;
DROP POLICY IF EXISTS "anon_delete_project_checklist_items" ON project_checklist_items;
CREATE POLICY "anon_select_project_checklist_items" ON project_checklist_items FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_project_checklist_items" ON project_checklist_items FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_project_checklist_items" ON project_checklist_items FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_project_checklist_items" ON project_checklist_items FOR DELETE TO anon USING (true);

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
