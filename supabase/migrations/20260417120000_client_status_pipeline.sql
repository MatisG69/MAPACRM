-- Nouveaux statuts client : prospect, téléphoné, contacté (in_discussion), intéressé, pas intéressé
UPDATE clients SET status = CASE
  WHEN status = 'active' THEN 'interested'
  WHEN status = 'inactive' THEN 'not_interested'
  WHEN status = 'contacted' THEN 'in_discussion'
  ELSE status
END
WHERE status IN ('active', 'inactive', 'contacted');

ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_status_check;

ALTER TABLE clients ADD CONSTRAINT clients_status_check CHECK (
  status IN ('prospect', 'telephoned', 'in_discussion', 'interested', 'not_interested')
);
