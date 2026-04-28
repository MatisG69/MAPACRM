/*
  Périmètre de la prestation de suivi mensuel
  --------------------------------------------
  Ajoute une colonne `recurring_support_scope` à `projects`. Texte multi-ligne
  (une ligne = un bullet point) qui détaille la prestation du suivi mensuel
  sur le devis abonnement créé en complément du devis ponctuel.

  Remplace fonctionnellement le champ `recurring_support_label` (qui était
  une simple ligne libre) par un vrai périmètre détaillé. `recurring_support_label`
  reste en BDD pour la rétrocompatibilité mais n'est plus utilisé côté UI.
*/

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS recurring_support_scope text;

COMMENT ON COLUMN public.projects.recurring_support_scope IS
  'Périmètre de la prestation de suivi mensuel (texte multi-ligne). Une ligne = un bullet point sur le devis abonnement.';
