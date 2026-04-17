-- Champs de prospection automatisée (import Apify / Google Maps)
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS is_scraped boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS source_platform text NULL,
  ADD COLUMN IF NOT EXISTS source_url text NULL,
  ADD COLUMN IF NOT EXISTS website_raw text NULL,
  ADD COLUMN IF NOT EXISTS website_status text NULL CHECK (
    website_status IS NULL OR website_status IN (
      'no_website', 'broken_website', 'social_only', 'directory_only',
      'outdated_website', 'low_visibility', 'website_ok'
    )
  ),
  ADD COLUMN IF NOT EXISTS digital_score integer NULL CHECK (
    digital_score IS NULL OR (digital_score >= 0 AND digital_score <= 100)
  ),
  ADD COLUMN IF NOT EXISTS scraped_at timestamptz NULL;

COMMENT ON COLUMN clients.is_scraped IS 'true si importé via scraping Apify';
COMMENT ON COLUMN clients.source_platform IS 'plateforme source (google_maps, …)';
COMMENT ON COLUMN clients.source_url IS 'URL Google Maps ou source de la fiche';
COMMENT ON COLUMN clients.website_raw IS 'URL brute du site trouvée par le scraper';
COMMENT ON COLUMN clients.website_status IS 'classification digitale du prospect';
COMMENT ON COLUMN clients.digital_score IS 'score commercial 0–100 (plus haut = plus prioritaire)';
COMMENT ON COLUMN clients.scraped_at IS 'date du dernier import scraping';
