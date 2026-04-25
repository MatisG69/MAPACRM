/*
  Projects.type — ajout de la valeur 'automation'
  ------------------------------------------------
  La contrainte CHECK initiale (migration 20260411212316) limite la colonne
  `type` aux 7 valeurs : website, ecommerce, webapp, redesign, maintenance,
  seo, other.

  L'application autorise désormais une 8ᵉ valeur 'automation' (logiciels
  d'automatisation, scripts, intégrations API). Sans cette mise à jour de
  contrainte, toute tentative de UPDATE ou INSERT avec type = 'automation'
  est rejetée silencieusement par PostgreSQL.
*/

-- Suppression de l'ancienne contrainte (auto-nommée par PostgreSQL)
ALTER TABLE public.projects
  DROP CONSTRAINT IF EXISTS projects_type_check;

-- Recréation de la contrainte avec 'automation' inclus
ALTER TABLE public.projects
  ADD CONSTRAINT projects_type_check
  CHECK (type IN (
    'website',
    'ecommerce',
    'webapp',
    'redesign',
    'maintenance',
    'seo',
    'automation',
    'other'
  ));
