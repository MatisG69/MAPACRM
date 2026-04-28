/*
  Périmètre de la prestation par projet
  --------------------------------------
  Ajoute une colonne `prestation_scope` à la table `projects`. Texte multi-ligne
  (chaque ligne = un bullet point) qui surcharge le périmètre par défaut généré
  selon le `type` du projet dans le PDF de devis.

  Si null/vide → le générateur retombe sur la liste catalogue par type (cf.
  `prestationsForType()` dans devisGenerator.ts).

  Saisie côté CRM : ProjectForm → champ textarea « Périmètre de la prestation ».
*/

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS prestation_scope text;

COMMENT ON COLUMN public.projects.prestation_scope IS
  'Périmètre de la prestation (texte multi-ligne). Une ligne = un bullet point dans le devis. Si null, le devis utilise le fallback catalogue par type.';
