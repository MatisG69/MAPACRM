-- ════════════════════════════════════════════════════════════════════════
-- Boîte de réception emails synchronisée depuis Hostinger via IMAP
--
-- Une Vercel API Function `/api/cron/sync-emails` est planifiée (cron 5min)
-- et upserte ici chaque message non-lu de l'IMAP. La colonne `message_id`
-- (RFC 5322) est UNIQUE pour garantir l'idempotence des polls.
-- ════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  /** RFC 5322 Message-ID — unique pour empêcher les doublons à chaque poll. */
  message_id text NOT NULL UNIQUE,
  from_email text NOT NULL,
  from_name text,
  to_email text,
  subject text,
  body_text text,
  body_html text,
  received_at timestamptz NOT NULL,
  /** Liaison automatique vers un client si from_email matche clients.email. */
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  read boolean NOT NULL DEFAULT false,
  archived boolean NOT NULL DEFAULT false,
  /** Pièces jointes : tableau d'objets {filename, contentType, size, contentId?}. */
  attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index orientés usage : tri chronologique + filtre non-lus + jointure client
CREATE INDEX IF NOT EXISTS idx_emails_received_desc ON public.emails (received_at DESC);
CREATE INDEX IF NOT EXISTS idx_emails_client ON public.emails (client_id) WHERE client_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_emails_unread ON public.emails (received_at DESC) WHERE read = false AND archived = false;
CREATE INDEX IF NOT EXISTS idx_emails_from_email_lc ON public.emails (lower(from_email));

ALTER TABLE public.emails ENABLE ROW LEVEL SECURITY;

-- Accès anon (CRM admin) — aligné avec la posture sécurité actuelle
-- (RLS ouverte, contrôle d'accès au niveau App + 2FA à venir)
CREATE POLICY "anon_select_emails" ON public.emails FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_emails" ON public.emails FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_emails" ON public.emails FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_emails" ON public.emails FOR DELETE TO anon USING (true);

-- Le portail client n'a aucun accès aux emails (boîte interne MAPA)
-- → pas de policy authenticated, par défaut tout est refusé.
