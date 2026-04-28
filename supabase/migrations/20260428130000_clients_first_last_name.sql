/*
  Séparation prénom / nom de famille sur la fiche client
  --------------------------------------------------------
  Ajoute deux colonnes optionnelles `first_name` et `last_name` à la table
  `clients`. Permet d'appliquer la convention typographique française sur les
  devis et factures :
    - Prénom en cas mixte (« Matis »)
    - NOM DE FAMILLE en majuscules (« GOUYET »)

  Si ces colonnes sont vides pour un client existant, les générateurs
  (devisGenerator / invoiceGenerator) retombent sur `name` avec l'heuristique
  actuelle (`upperLastName()` qui MAJ-uscule le dernier mot).

  Cette migration est non-destructive — elle n'altère pas le champ `name`
  existant (qui reste source de vérité pour la liste, la recherche et le
  fallback). Le commercial peut remplir au fur et à mesure.
*/

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS last_name text;

COMMENT ON COLUMN public.clients.first_name IS
  'Prénom du contact (cas mixte). Utilisé sur devis/factures pour la convention typographique FR. Si null, fallback sur `name`.';

COMMENT ON COLUMN public.clients.last_name IS
  'Nom de famille du contact. Affiché en MAJUSCULES sur devis/factures. Si null, fallback sur `name` avec heuristique dernier mot.';
