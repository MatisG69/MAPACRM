-- Satisfaction (1–5) et témoignage / retour client pour l’annuaire Contacts
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS satisfaction_rating integer
    CHECK (satisfaction_rating IS NULL OR (satisfaction_rating >= 1 AND satisfaction_rating <= 5));

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS feedback text;
