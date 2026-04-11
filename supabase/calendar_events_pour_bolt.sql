-- Coller tout ce fichier dans l’éditeur SQL de Bolt / Supabase (une seule exécution).
-- Crée la table agenda + RLS. Recrée la fonction trigger si besoin.

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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

ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_calendar_events" ON calendar_events;
DROP POLICY IF EXISTS "anon_insert_calendar_events" ON calendar_events;
DROP POLICY IF EXISTS "anon_update_calendar_events" ON calendar_events;
DROP POLICY IF EXISTS "anon_delete_calendar_events" ON calendar_events;

CREATE POLICY "anon_select_calendar_events" ON calendar_events FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_calendar_events" ON calendar_events FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_calendar_events" ON calendar_events FOR UPDATE TO anon USING (true);
CREATE POLICY "anon_delete_calendar_events" ON calendar_events FOR DELETE TO anon USING (true);

DROP TRIGGER IF EXISTS update_calendar_events_updated_at ON calendar_events;
CREATE TRIGGER update_calendar_events_updated_at
  BEFORE UPDATE ON calendar_events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
