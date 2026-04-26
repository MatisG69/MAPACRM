/*
  Devis — calendrier prévisionnel persistant
  -------------------------------------------
  Ajoute deux dates contractuelles au record `quotes` :
    - expected_acompte_date  : date prévue d'encaissement de l'acompte
                               (= démarrage du projet, date de signature)
    - expected_delivery_date : date prévue de livraison du projet
                               (= émission de la facture de solde)

  Ces deux dates sont :
    1. Saisies à la génération du devis (modal CRM)
    2. Imprimées sur le PDF du devis (bloc « Calendrier prévisionnel »)
    3. Re-utilisées automatiquement à la génération de la facture liée
       (date de prestation page acompte + page solde).

  Champs DATE (sans timezone), nullable — ne casse pas les devis existants.
*/

ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS expected_acompte_date date,
  ADD COLUMN IF NOT EXISTS expected_delivery_date date;

COMMENT ON COLUMN public.quotes.expected_acompte_date IS
  'Date prévue d''encaissement de l''acompte — démarrage du projet';
COMMENT ON COLUMN public.quotes.expected_delivery_date IS
  'Date prévue de livraison du projet — émission de la facture de solde';
