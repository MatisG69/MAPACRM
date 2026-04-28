/*
  Sprint 7 — Témoignages, NDA et Suggestions
  -------------------------------------------
  - testimonials : retour client en fin de projet, avec consentement public/logo.
  - nda_agreements : accord de confidentialité signable numériquement.
  - project_suggestions : boîte à idées du client avec workflow admin.

  Toutes les tables suivent les conventions du portail :
    · admin (anon role) → tous droits ;
    · client (authenticated) → scope par client_id via portal_users.
*/

-- ─── Témoignages ───
CREATE TABLE IF NOT EXISTS public.testimonials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,

  /** Note de 1 à 5 étoiles */
  rating int NOT NULL CHECK (rating BETWEEN 1 AND 5),
  /** Contenu libre du témoignage */
  content text NOT NULL,
  /** Auteur — signature du client (lui-même), affiché publiquement si autorisé */
  author_signature text NOT NULL,
  /** Rôle/poste affiché dans la signature publique */
  author_role text,

  /** Consentements explicites du client */
  allow_public boolean NOT NULL DEFAULT false,
  allow_logo boolean NOT NULL DEFAULT false,

  /** Modération côté admin : un témoignage approuvé peut être affiché */
  approved boolean NOT NULL DEFAULT false,
  approved_at timestamptz,
  rejection_reason text,

  /** Trace légale de la signature client */
  signed_at timestamptz NOT NULL DEFAULT now(),
  signed_by_ip text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_testimonials_project ON public.testimonials(project_id);
CREATE INDEX IF NOT EXISTS idx_testimonials_approved ON public.testimonials(approved) WHERE approved = true;

CREATE OR REPLACE FUNCTION public.touch_testimonials_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
DROP TRIGGER IF EXISTS trg_testimonials_updated_at ON public.testimonials;
CREATE TRIGGER trg_testimonials_updated_at
  BEFORE UPDATE ON public.testimonials
  FOR EACH ROW EXECUTE FUNCTION public.touch_testimonials_updated_at();

ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_all_testimonials" ON public.testimonials;
CREATE POLICY "anon_all_testimonials"
  ON public.testimonials FOR ALL TO anon
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_read_own_testimonials" ON public.testimonials;
CREATE POLICY "auth_read_own_testimonials"
  ON public.testimonials FOR SELECT TO authenticated
  USING (
    client_id IN (
      SELECT client_id FROM public.portal_users
      WHERE auth_user_id = auth.uid() AND client_id IS NOT NULL
    )
  );

DROP POLICY IF EXISTS "auth_create_testimonial" ON public.testimonials;
CREATE POLICY "auth_create_testimonial"
  ON public.testimonials FOR INSERT TO authenticated
  WITH CHECK (
    client_id IN (
      SELECT client_id FROM public.portal_users
      WHERE auth_user_id = auth.uid() AND client_id IS NOT NULL
    )
  );

-- Notif admin sur nouveau témoignage
CREATE OR REPLACE FUNCTION public.notify_admin_on_testimonial()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  client_name text;
BEGIN
  SELECT c.name INTO client_name FROM clients c WHERE c.id = NEW.client_id;
  INSERT INTO public.notifications (target_user_id, kind, title, message, link_path)
  VALUES (
    NULL,
    'testimonial_new',
    'Nouveau témoignage client',
    COALESCE(client_name, 'Un client') || ' a laissé un avis (' || NEW.rating || '/5)',
    '/project-detail?id=' || NEW.project_id::text
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_admin_testimonial ON public.testimonials;
CREATE TRIGGER trg_notify_admin_testimonial
  AFTER INSERT ON public.testimonials
  FOR EACH ROW EXECUTE FUNCTION public.notify_admin_on_testimonial();

-- ─── NDA ───
CREATE TABLE IF NOT EXISTS public.nda_agreements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,

  /** Titre de l'accord (ex. "NDA — projet refonte 2026") */
  title text NOT NULL,
  /** Texte intégral de l'accord, signé tel quel */
  content text NOT NULL,
  /** Date d'expiration (optionnelle) */
  expires_at date,

  /** Signature client */
  signed_at timestamptz,
  signed_by_signature text,
  signed_by_ip text,

  /** Statut visible : draft → sent → signed → expired */
  status text NOT NULL DEFAULT 'sent'
    CHECK (status IN ('draft', 'sent', 'signed', 'expired', 'cancelled')),

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_nda_project ON public.nda_agreements(project_id);
CREATE INDEX IF NOT EXISTS idx_nda_status ON public.nda_agreements(status);

CREATE OR REPLACE FUNCTION public.touch_nda_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
DROP TRIGGER IF EXISTS trg_nda_updated_at ON public.nda_agreements;
CREATE TRIGGER trg_nda_updated_at
  BEFORE UPDATE ON public.nda_agreements
  FOR EACH ROW EXECUTE FUNCTION public.touch_nda_updated_at();

ALTER TABLE public.nda_agreements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_all_nda" ON public.nda_agreements;
CREATE POLICY "anon_all_nda"
  ON public.nda_agreements FOR ALL TO anon
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_read_own_nda" ON public.nda_agreements;
CREATE POLICY "auth_read_own_nda"
  ON public.nda_agreements FOR SELECT TO authenticated
  USING (
    client_id IN (
      SELECT client_id FROM public.portal_users
      WHERE auth_user_id = auth.uid() AND client_id IS NOT NULL
    )
  );

DROP POLICY IF EXISTS "auth_sign_own_nda" ON public.nda_agreements;
CREATE POLICY "auth_sign_own_nda"
  ON public.nda_agreements FOR UPDATE TO authenticated
  USING (
    client_id IN (
      SELECT client_id FROM public.portal_users
      WHERE auth_user_id = auth.uid() AND client_id IS NOT NULL
    )
  );

-- Notif admin sur signature NDA
CREATE OR REPLACE FUNCTION public.notify_admin_on_nda_signed()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  client_name text;
BEGIN
  IF NEW.status = 'signed' AND (OLD.status IS DISTINCT FROM 'signed') THEN
    SELECT c.name INTO client_name FROM clients c WHERE c.id = NEW.client_id;
    INSERT INTO public.notifications (target_user_id, kind, title, message, link_path)
    VALUES (
      NULL,
      'nda_signed',
      'NDA signé',
      COALESCE(client_name, 'Un client') || ' a signé l''accord de confidentialité',
      '/project-detail?id=' || NEW.project_id::text
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_admin_nda_signed ON public.nda_agreements;
CREATE TRIGGER trg_notify_admin_nda_signed
  AFTER UPDATE ON public.nda_agreements
  FOR EACH ROW EXECUTE FUNCTION public.notify_admin_on_nda_signed();

-- ─── Suggestions / boîte à idées ───
CREATE TABLE IF NOT EXISTS public.project_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,

  title text NOT NULL,
  description text,
  /** Catégorisation libre côté client */
  kind text NOT NULL DEFAULT 'feature'
    CHECK (kind IN ('feature', 'improvement', 'bug', 'question', 'other')),

  /** Workflow admin */
  status text NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'considering', 'planned', 'done', 'declined')),
  admin_response text,

  /** Auteur (signature texte) */
  submitted_by_signature text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_suggestions_project ON public.project_suggestions(project_id);
CREATE INDEX IF NOT EXISTS idx_suggestions_status ON public.project_suggestions(status);

CREATE OR REPLACE FUNCTION public.touch_suggestions_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
DROP TRIGGER IF EXISTS trg_suggestions_updated_at ON public.project_suggestions;
CREATE TRIGGER trg_suggestions_updated_at
  BEFORE UPDATE ON public.project_suggestions
  FOR EACH ROW EXECUTE FUNCTION public.touch_suggestions_updated_at();

ALTER TABLE public.project_suggestions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_all_suggestions" ON public.project_suggestions;
CREATE POLICY "anon_all_suggestions"
  ON public.project_suggestions FOR ALL TO anon
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_read_own_suggestions" ON public.project_suggestions;
CREATE POLICY "auth_read_own_suggestions"
  ON public.project_suggestions FOR SELECT TO authenticated
  USING (
    client_id IN (
      SELECT client_id FROM public.portal_users
      WHERE auth_user_id = auth.uid() AND client_id IS NOT NULL
    )
  );

DROP POLICY IF EXISTS "auth_create_suggestion" ON public.project_suggestions;
CREATE POLICY "auth_create_suggestion"
  ON public.project_suggestions FOR INSERT TO authenticated
  WITH CHECK (
    client_id IN (
      SELECT client_id FROM public.portal_users
      WHERE auth_user_id = auth.uid() AND client_id IS NOT NULL
    )
  );

-- Notif admin sur nouvelle suggestion
CREATE OR REPLACE FUNCTION public.notify_admin_on_suggestion()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  client_name text;
BEGIN
  SELECT c.name INTO client_name FROM clients c WHERE c.id = NEW.client_id;
  INSERT INTO public.notifications (target_user_id, kind, title, message, link_path)
  VALUES (
    NULL,
    'suggestion_new',
    'Nouvelle suggestion',
    COALESCE(client_name, 'Un client') || ' : ' || NEW.title,
    '/project-detail?id=' || NEW.project_id::text
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_admin_suggestion ON public.project_suggestions;
CREATE TRIGGER trg_notify_admin_suggestion
  AFTER INSERT ON public.project_suggestions
  FOR EACH ROW EXECUTE FUNCTION public.notify_admin_on_suggestion();

COMMENT ON TABLE public.testimonials IS 'Témoignages clients en fin de projet (avec consentement public).';
COMMENT ON TABLE public.nda_agreements IS 'Accords de confidentialité signables numériquement (timestamp + IP).';
COMMENT ON TABLE public.project_suggestions IS 'Boîte à idées client avec workflow admin (new → planned → done).';
