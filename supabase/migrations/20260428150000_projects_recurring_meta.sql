/*
  Méta-informations du contrat de suivi mensuel
  ----------------------------------------------
  Ajoute deux colonnes textuelles au projet pour personnaliser le devis
  abonnement créé en complément du devis ponctuel :

    - recurring_support_title       : titre du contrat (ex. "Contrat de suivi
                                      & maintenance — Automatisation interne")
    - recurring_support_description : description courte affichée dans la
                                      table de tarification du devis suivi.

  Ces champs sont nullables — si vides, le générateur utilise un fallback
  cohérent (« Contrat de suivi & maintenance » + description générique).
*/

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS recurring_support_title text,
  ADD COLUMN IF NOT EXISTS recurring_support_description text;

COMMENT ON COLUMN public.projects.recurring_support_title IS
  'Titre du contrat de suivi mensuel — affiché en titre principal du devis abonnement.';

COMMENT ON COLUMN public.projects.recurring_support_description IS
  'Description courte du contrat de suivi mensuel — affichée dans la table de tarification du devis abonnement.';
