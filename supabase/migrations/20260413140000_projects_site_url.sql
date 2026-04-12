-- URL du site pour aperçu visuel (Open Graph / capture) sur les cartes projet
ALTER TABLE projects ADD COLUMN IF NOT EXISTS site_url text;
