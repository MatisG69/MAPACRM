/*
  Projets — suivi après-vente mensuel
  ------------------------------------
  Permet de cocher un projet en « suivi mensuel HT » avec montant et libellé,
  pour intégrer automatiquement la prestation récurrente dans le devis PDF
  (section Tarification mensuelle), même quand plusieurs projets sont combinés
  pour un seul client.

  Champs ajoutés :
    - has_recurring_support     : booléen, suivi mensuel activé ou non
    - recurring_support_amount  : montant mensuel HT (en euros)
    - recurring_support_label   : libellé optionnel ("SEO + statistiques",
                                  "Supervision automatisations", etc.)
*/

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS has_recurring_support boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS recurring_support_amount numeric(10,2),
  ADD COLUMN IF NOT EXISTS recurring_support_label text;

COMMENT ON COLUMN public.projects.has_recurring_support IS 'Le projet inclut un suivi mensuel après-vente';
COMMENT ON COLUMN public.projects.recurring_support_amount IS 'Montant mensuel HT du suivi en euros';
COMMENT ON COLUMN public.projects.recurring_support_label IS 'Libellé descriptif du suivi (SEO, supervision, etc.)';
