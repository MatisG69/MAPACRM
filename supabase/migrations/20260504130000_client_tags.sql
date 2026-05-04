/*
  Client Tags — système de classification manuelle libre des clients.

  Distinct des badges auto :
    - `clients.status` (statut commercial du tunnel)
    - `clients.profession` (texte libre du secteur)
    - `clients.is_scraped`, `clients.website_status` (auto-générés par le scraper)

  Choix d'architecture :
    - Table `client_tags` : référentiel global de labels réutilisables avec
      couleur personnalisée. UNIQUE sur label pour éviter les doublons.
    - Table de jonction `client_tag_assignments` (m2m) : un client a 0..n tags,
      un tag peut être assigné à 0..n clients. PK composite + cascade delete.
    - Permet le rename global d'un tag (1 update, propagation auto à tous les
      clients) et facilite plus tard le filtrage / les analytics par tag.

  Migration 100 % idempotente.
*/

/* 1. Table référentiel des tags. */
CREATE TABLE IF NOT EXISTS client_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  color text NOT NULL DEFAULT '#b8973a',
  position int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

/* Unique label (case-insensitive) : pas deux tags "VIP" / "vip". */
CREATE UNIQUE INDEX IF NOT EXISTS client_tags_label_unique_ci
  ON client_tags (lower(label));

/* 2. Jonction m2m client ↔ tag. */
CREATE TABLE IF NOT EXISTS client_tag_assignments (
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  tag_id    uuid NOT NULL REFERENCES client_tags(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (client_id, tag_id)
);

CREATE INDEX IF NOT EXISTS client_tag_assignments_client_id_idx
  ON client_tag_assignments (client_id);
CREATE INDEX IF NOT EXISTS client_tag_assignments_tag_id_idx
  ON client_tag_assignments (tag_id);

/* 3. Trigger updated_at sur client_tags. */
CREATE OR REPLACE FUNCTION update_client_tags_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_client_tags_updated_at_trigger ON client_tags;
CREATE TRIGGER update_client_tags_updated_at_trigger
  BEFORE UPDATE ON client_tags
  FOR EACH ROW EXECUTE FUNCTION update_client_tags_updated_at();

/* 4. RLS — aligné anon-* sur le reste du schéma. */
ALTER TABLE client_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_tag_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_client_tags" ON client_tags;
DROP POLICY IF EXISTS "anon_insert_client_tags" ON client_tags;
DROP POLICY IF EXISTS "anon_update_client_tags" ON client_tags;
DROP POLICY IF EXISTS "anon_delete_client_tags" ON client_tags;

CREATE POLICY "anon_select_client_tags" ON client_tags FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_client_tags" ON client_tags FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_client_tags" ON client_tags FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_client_tags" ON client_tags FOR DELETE TO anon USING (true);

DROP POLICY IF EXISTS "anon_select_client_tag_assignments" ON client_tag_assignments;
DROP POLICY IF EXISTS "anon_insert_client_tag_assignments" ON client_tag_assignments;
DROP POLICY IF EXISTS "anon_delete_client_tag_assignments" ON client_tag_assignments;

CREATE POLICY "anon_select_client_tag_assignments" ON client_tag_assignments FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_client_tag_assignments" ON client_tag_assignments FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_delete_client_tag_assignments" ON client_tag_assignments FOR DELETE TO anon USING (true);

/* 5. Tags pré-installés pour démarrer rapidement.
      ON CONFLICT DO NOTHING : si l'admin a déjà créé un tag avec le même
      label, on respecte sa version (couleur incluse). */
INSERT INTO client_tags (label, color, position) VALUES
  ('Pas de site web',  '#e85d5d', 0),
  ('SEO à travailler', '#d4a574', 1),
  ('VIP',              '#c98a4c', 2),
  ('Récurrent',        '#7ac28b', 3),
  ('À relancer',       '#7a98c2', 4),
  ('Partenaire',       '#a07ac2', 5),
  ('Apporteur',        '#c27a7a', 6)
ON CONFLICT DO NOTHING;
