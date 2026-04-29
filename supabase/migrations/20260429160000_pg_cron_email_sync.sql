-- ════════════════════════════════════════════════════════════════════════
-- Cron Postgres : sync emails Hostinger toutes les minutes
--
-- Remplace le cron Vercel (limité à 1×/jour sur plan Hobby) par un cron
-- côté Supabase via pg_cron + pg_net, avec granularité 1 minute.
--
-- Le `CRON_SECRET` n'est JAMAIS écrit en clair dans cette migration : il
-- est lu depuis Supabase Vault à chaque exécution. Le secret doit avoir
-- été créé au préalable (cf. note opérationnelle en bas de fichier).
-- ════════════════════════════════════════════════════════════════════════

-- ── 1. Extensions requises ──────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- ── 2. Helper sécurisé : POST à l'endpoint Vercel ───────────────────────
-- Encapsule la lecture du Vault pour ne pas la dupliquer dans cron.schedule
-- et pour bénéficier de SECURITY DEFINER (le job pg_cron tourne en
-- postgres role, qui doit pouvoir lire vault.decrypted_secrets).
CREATE OR REPLACE FUNCTION public.trigger_email_sync()
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, vault
AS $$
DECLARE
  bearer text;
  request_id bigint;
BEGIN
  SELECT decrypted_secret
    INTO bearer
    FROM vault.decrypted_secrets
    WHERE name = 'cron_sync_emails_secret'
    LIMIT 1;

  IF bearer IS NULL THEN
    RAISE EXCEPTION 'Secret "cron_sync_emails_secret" introuvable dans le Vault Supabase. '
      'Créer via : SELECT vault.create_secret(''<TON_CRON_SECRET>'', ''cron_sync_emails_secret'', ''Bearer token Vercel'');';
  END IF;

  SELECT net.http_post(
    url := 'https://mapacrm.vercel.app/api/cron/sync-emails',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || bearer,
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  ) INTO request_id;

  RETURN request_id;
END;
$$;

-- Permet aux roles d'exécuter la fonction (utile pour les déclenchements
-- manuels via le SQL Editor en cas de besoin).
REVOKE ALL ON FUNCTION public.trigger_email_sync() FROM public;
GRANT EXECUTE ON FUNCTION public.trigger_email_sync() TO postgres, service_role;

-- ── 3. Désinscription préalable (idempotence migration) ─────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'sync-hostinger-emails') THEN
    PERFORM cron.unschedule('sync-hostinger-emails');
  END IF;
END $$;

-- ── 4. Programmation : toutes les minutes ───────────────────────────────
SELECT cron.schedule(
  'sync-hostinger-emails',
  '* * * * *',
  $cron$ SELECT public.trigger_email_sync(); $cron$
);

-- ════════════════════════════════════════════════════════════════════════
-- ÉTAPE OPÉRATEUR (à faire UNE FOIS dans Supabase Studio → SQL Editor) :
--
--   SELECT vault.create_secret(
--     'ddff5753-371e-465c-8930-8129315a1e61',
--     'cron_sync_emails_secret',
--     'Bearer token pour /api/cron/sync-emails sur Vercel'
--   );
--
-- → À LANCER AVANT cette migration. Sans ce secret, le cron lancera des
--   exceptions toutes les minutes mais aucun mail ne sera importé.
-- ════════════════════════════════════════════════════════════════════════
