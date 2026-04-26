/*
  Projets — étendre le CHECK constraint sur status pour inclure 'quote_sent'
  ----------------------------------------------------------------------------
  Permet de marquer un projet comme « Devis envoyé » dans le pipeline interne,
  entre 'planning' (cadrage) et 'in_progress' (démarrage des travaux après
  acceptation du devis).
*/

ALTER TABLE public.projects DROP CONSTRAINT IF EXISTS projects_status_check;

ALTER TABLE public.projects
  ADD CONSTRAINT projects_status_check
  CHECK (status IN ('planning', 'quote_sent', 'in_progress', 'review', 'completed', 'on_hold'));
