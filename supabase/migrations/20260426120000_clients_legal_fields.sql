/*
  Clients — champs juridiques et contact décisionnaire
  -----------------------------------------------------
  Ajoute les informations contractuelles à la fiche client, indispensables
  pour générer un devis et des CGV opposables :
    - legal_form         : forme juridique (SAS, SARL, EI, EURL, association…)
    - siret              : numéro SIRET (14 chiffres)
    - vat_number         : n° TVA intracommunautaire
    - contact_role       : fonction du contact / décisionnaire

  Ces champs sont alimentés depuis la fiche projet (section « Informations
  contractuelles du client ») et remontés dans le PDF devis + CGV signature.
*/

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS legal_form text,
  ADD COLUMN IF NOT EXISTS siret text,
  ADD COLUMN IF NOT EXISTS vat_number text,
  ADD COLUMN IF NOT EXISTS contact_role text;

COMMENT ON COLUMN public.clients.legal_form IS 'Forme juridique : SAS, SARL, EI, EURL, association, etc.';
COMMENT ON COLUMN public.clients.siret IS 'Numéro SIRET (14 chiffres)';
COMMENT ON COLUMN public.clients.vat_number IS 'N° TVA intracommunautaire (ex. FR12345678901)';
COMMENT ON COLUMN public.clients.contact_role IS 'Fonction du décisionnaire (Gérant, DG, Responsable communication, etc.)';
