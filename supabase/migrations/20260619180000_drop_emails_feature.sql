-- ════════════════════════════════════════════════════════════════════════
-- Suppression du feature « Boîte de réception emails »
--
-- Retire la chaîne complète introduite par :
--   · 20260429140000_emails_inbox.sql
--   · 20260429160000_pg_cron_email_sync.sql
--   · 20260429170000_emails_direction.sql
--
-- L'historique des migrations de création est conservé ; cette migration
-- joue le rôle de « down » appliqué en avant pour aligner la prod.
-- ════════════════════════════════════════════════════════════════════════

-- ── 1. Cron pg_cron ─────────────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'sync-hostinger-emails') THEN
    PERFORM cron.unschedule('sync-hostinger-emails');
  END IF;
END $$;

-- ── 2. Fonction de déclenchement ────────────────────────────────────────
DROP FUNCTION IF EXISTS public.trigger_email_sync();

-- ── 3. Table de la boîte de réception ───────────────────────────────────
DROP TABLE IF EXISTS public.emails CASCADE;

-- ════════════════════════════════════════════════════════════════════════
-- ÉTAPE OPÉRATEUR (manuelle, Supabase Studio → SQL Editor) :
--   Supprimer le secret Vault devenu inutile :
--     SELECT vault.delete_secret('cron_sync_emails_secret');
-- ════════════════════════════════════════════════════════════════════════
