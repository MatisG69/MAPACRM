/*
  Clients — étendre le CHECK constraint sur status pour inclure 'quote_sent'
  --------------------------------------------------------------------------
  Permet de marquer un client comme « Devis envoyé », état d'attente de
  signature placé entre 'interested' et 'not_interested' dans le tunnel.
*/

ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_status_check;

ALTER TABLE clients ADD CONSTRAINT clients_status_check CHECK (
  status IN ('prospect', 'telephoned', 'in_discussion', 'interested', 'quote_sent', 'not_interested')
);
