/*
  Folders — système de classification hiérarchique pour devis et factures.

  Choix d'architecture :
    - Une seule table `folders` partagée entre devis et factures : un dossier
      peut contenir simultanément des quotes ET des invoices (vue client unifiée).
    - `parent_id` self-référence avec ON DELETE CASCADE → supprimer un dossier
      supprime aussi ses sous-dossiers ; les items remontent à folder_id NULL
      via ON DELETE SET NULL sur quotes.folder_id / invoices.folder_id.
    - Trigger anti-cycle : empêche A.parent = B lorsque B est descendant de A.
    - RLS anon-* aligné sur le reste du schéma (instance interne single-tenant).

  Migration 100 % idempotente : peut être rejouée sans erreur même si un run
  précédent s'est interrompu en cours d'exécution.
*/

/* 1. Table folders — colonnes minimales d'abord. */
CREATE TABLE IF NOT EXISTS folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

/* 2. Colonnes optionnelles ajoutées séparément : ALTER ... ADD COLUMN IF NOT
      EXISTS rattrape une table créée partiellement par un run précédent. */
ALTER TABLE folders ADD COLUMN IF NOT EXISTS parent_id uuid;
ALTER TABLE folders ADD COLUMN IF NOT EXISTS color    text    NOT NULL DEFAULT '#b8973a';
ALTER TABLE folders ADD COLUMN IF NOT EXISTS position int     NOT NULL DEFAULT 0;

/* 3. Contrainte FK self-reference idempotente. */
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'folders_parent_id_fkey' AND conrelid = 'folders'::regclass
  ) THEN
    ALTER TABLE folders
      ADD CONSTRAINT folders_parent_id_fkey
      FOREIGN KEY (parent_id) REFERENCES folders(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS folders_parent_id_idx ON folders(parent_id);

/* 4. folder_id sur quotes & invoices. */
ALTER TABLE quotes
  ADD COLUMN IF NOT EXISTS folder_id uuid REFERENCES folders(id) ON DELETE SET NULL;
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS folder_id uuid REFERENCES folders(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS quotes_folder_id_idx   ON quotes(folder_id);
CREATE INDEX IF NOT EXISTS invoices_folder_id_idx ON invoices(folder_id);

/* 5. Anti-cycle : refuse parent_id = self ou ancêtre dans la chaîne. */
CREATE OR REPLACE FUNCTION folders_check_no_cycle() RETURNS trigger AS $$
DECLARE
  current_id uuid;
BEGIN
  IF NEW.parent_id IS NULL THEN
    RETURN NEW;
  END IF;
  IF NEW.parent_id = NEW.id THEN
    RAISE EXCEPTION 'Un dossier ne peut être son propre parent';
  END IF;
  current_id := NEW.parent_id;
  WHILE current_id IS NOT NULL LOOP
    IF current_id = NEW.id THEN
      RAISE EXCEPTION 'Cycle détecté dans la hiérarchie des dossiers';
    END IF;
    SELECT parent_id INTO current_id FROM folders WHERE id = current_id;
  END LOOP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS folders_no_cycle_trigger ON folders;
CREATE TRIGGER folders_no_cycle_trigger
  BEFORE INSERT OR UPDATE OF parent_id ON folders
  FOR EACH ROW EXECUTE FUNCTION folders_check_no_cycle();

/* 6. updated_at automatique. */
CREATE OR REPLACE FUNCTION update_folders_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_folders_updated_at_trigger ON folders;
CREATE TRIGGER update_folders_updated_at_trigger
  BEFORE UPDATE ON folders
  FOR EACH ROW EXECUTE FUNCTION update_folders_updated_at();

/* 7. RLS. */
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_folders" ON folders;
DROP POLICY IF EXISTS "anon_insert_folders" ON folders;
DROP POLICY IF EXISTS "anon_update_folders" ON folders;
DROP POLICY IF EXISTS "anon_delete_folders" ON folders;

CREATE POLICY "anon_select_folders" ON folders FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_folders" ON folders FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_folders" ON folders FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_folders" ON folders FOR DELETE TO anon USING (true);
