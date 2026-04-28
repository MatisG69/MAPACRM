/*
  Site en production + Performance analytics
  ------------------------------------------
  Table 1:1 avec un projet livré.
  Contient :
    - URL prod + repo + dashboard hébergeur
    - date de mise en ligne
    - dernière mesure Lighthouse (perf/a11y/seo/best practices)
    - scores Core Web Vitals (LCP, CLS, INP)
    - état uptime (manuel ou batch)
    - notes admin

  Pas de credentials sensibles ici (à stocker dans le coffre du client/admin).
  Le client peut LIRE pour son projet ; seul l'admin peut écrire.
*/

CREATE TABLE IF NOT EXISTS public.project_production (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL UNIQUE REFERENCES public.projects(id) ON DELETE CASCADE,

  /** URL canonique de la production (ex. https://mapa-developpement.fr) */
  prod_url text,
  /** Dashboard hébergeur (Vercel, Netlify, OVH…) — lien rapide pour l'admin */
  hosting_provider text,
  hosting_dashboard_url text,
  /** Repo Git du projet livré */
  repo_url text,
  /** CMS administratif si applicable */
  cms_url text,
  /** Date officielle de mise en ligne */
  launch_date date,

  /** Dernière mesure Lighthouse — scores 0..100 */
  lighthouse_performance int CHECK (lighthouse_performance BETWEEN 0 AND 100),
  lighthouse_accessibility int CHECK (lighthouse_accessibility BETWEEN 0 AND 100),
  lighthouse_seo int CHECK (lighthouse_seo BETWEEN 0 AND 100),
  lighthouse_best_practices int CHECK (lighthouse_best_practices BETWEEN 0 AND 100),
  /** Core Web Vitals — LCP en s, CLS sans unité, INP en ms */
  cwv_lcp_seconds numeric(5, 2),
  cwv_cls numeric(5, 3),
  cwv_inp_ms int,
  lighthouse_checked_at timestamptz,
  lighthouse_report_url text,

  /** Uptime : up / down / unknown · mis à jour manuellement ou via cron externe */
  uptime_status text NOT NULL DEFAULT 'unknown'
    CHECK (uptime_status IN ('up', 'down', 'unknown', 'maintenance')),
  uptime_checked_at timestamptz,

  notes text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_production_project ON public.project_production(project_id);

CREATE OR REPLACE FUNCTION public.touch_project_production_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
DROP TRIGGER IF EXISTS trg_project_production_updated_at ON public.project_production;
CREATE TRIGGER trg_project_production_updated_at
  BEFORE UPDATE ON public.project_production
  FOR EACH ROW EXECUTE FUNCTION public.touch_project_production_updated_at();

ALTER TABLE public.project_production ENABLE ROW LEVEL SECURITY;

-- Admin (anon role)
DROP POLICY IF EXISTS "anon_all_project_production" ON public.project_production;
CREATE POLICY "anon_all_project_production"
  ON public.project_production FOR ALL TO anon
  USING (true) WITH CHECK (true);

-- Client : lecture uniquement sur ses projets
DROP POLICY IF EXISTS "auth_read_own_production" ON public.project_production;
CREATE POLICY "auth_read_own_production"
  ON public.project_production FOR SELECT TO authenticated
  USING (
    project_id IN (
      SELECT p.id FROM public.projects p
      WHERE p.client_id IN (
        SELECT client_id FROM public.portal_users
        WHERE auth_user_id = auth.uid() AND client_id IS NOT NULL
      )
    )
  );

COMMENT ON TABLE public.project_production IS
  'Module post-livraison : URL prod, repo, dashboard hébergeur, scores Lighthouse, uptime.';
