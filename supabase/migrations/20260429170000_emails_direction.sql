-- ════════════════════════════════════════════════════════════════════════
-- Sens des emails : 'inbound' (reçu via IMAP) | 'outbound' (envoyé via SMTP)
--
-- Permet d'afficher les mails envoyés depuis le CRM dans la même page que
-- les mails reçus, avec un onglet de filtre dédié.
-- ════════════════════════════════════════════════════════════════════════

ALTER TABLE public.emails
  ADD COLUMN IF NOT EXISTS direction text NOT NULL DEFAULT 'inbound'
    CHECK (direction IN ('inbound', 'outbound'));

CREATE INDEX IF NOT EXISTS idx_emails_direction_received
  ON public.emails (direction, received_at DESC);

-- Note : la fonction de sync IMAP (api/cron/sync-emails.ts) hérite du
-- défaut 'inbound' sans modification. La fonction d'envoi SMTP
-- (api/emails/send.ts) insérera explicitement direction = 'outbound'.
