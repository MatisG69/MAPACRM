/*
  Change Requests + Comptes-rendus de réunion
  --------------------------------------------
  - change_requests : demandes de modification post-cadrage initial
    Le client peut en créer ; l'admin chiffre + valide ou refuse.
    Important pour facturation additionnelle traçable.

  - meeting_notes : compte-rendus de réunions
    Décisions prises + actions à mener avec responsable.
    Le client peut signer pour acter.
*/

-- ─── Change Requests ───
CREATE TABLE IF NOT EXISTS public.change_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,

  /** Description libre de la demande */
  description text NOT NULL,
  /** Urgence ressentie côté client */
  urgency text NOT NULL DEFAULT 'normal' CHECK (urgency IN ('low', 'normal', 'high', 'urgent')),

  /** Estimation en jours · null si pas encore évalué */
  estimated_days numeric(5, 2),
  /** Estimation tarifaire en € HT · null si pas encore évalué */
  estimated_amount numeric(10, 2),

  /** Cycle de vie : submitted → estimated → approved (client) ou rejected → completed */
  status text NOT NULL DEFAULT 'submitted'
    CHECK (status IN ('submitted', 'estimated', 'approved', 'rejected', 'completed')),

  /** Auteur de la demande */
  submitted_by_signature text,
  submitted_at timestamptz NOT NULL DEFAULT now(),

  /** Validation client de l'estimation */
  approved_by_signature text,
  approved_at timestamptz,
  approved_by_ip text,

  /** Refus client de l'estimation */
  rejection_reason text,

  admin_notes text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_change_requests_project ON public.change_requests(project_id);
CREATE INDEX IF NOT EXISTS idx_change_requests_status ON public.change_requests(status);

CREATE OR REPLACE FUNCTION public.touch_change_requests_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
DROP TRIGGER IF EXISTS trg_change_requests_updated_at ON public.change_requests;
CREATE TRIGGER trg_change_requests_updated_at
  BEFORE UPDATE ON public.change_requests
  FOR EACH ROW EXECUTE FUNCTION public.touch_change_requests_updated_at();

ALTER TABLE public.change_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_all_change_requests" ON public.change_requests;
CREATE POLICY "anon_all_change_requests"
  ON public.change_requests FOR ALL TO anon
  USING (true) WITH CHECK (true);

-- Client : SELECT + INSERT (créer une demande) + UPDATE (approuver/refuser estimation)
DROP POLICY IF EXISTS "auth_read_own_change_requests" ON public.change_requests;
CREATE POLICY "auth_read_own_change_requests"
  ON public.change_requests FOR SELECT TO authenticated
  USING (
    client_id IN (
      SELECT client_id FROM public.portal_users
      WHERE auth_user_id = auth.uid() AND client_id IS NOT NULL
    )
  );

DROP POLICY IF EXISTS "auth_create_change_request" ON public.change_requests;
CREATE POLICY "auth_create_change_request"
  ON public.change_requests FOR INSERT TO authenticated
  WITH CHECK (
    client_id IN (
      SELECT client_id FROM public.portal_users
      WHERE auth_user_id = auth.uid() AND client_id IS NOT NULL
    )
  );

DROP POLICY IF EXISTS "auth_update_own_change_request" ON public.change_requests;
CREATE POLICY "auth_update_own_change_request"
  ON public.change_requests FOR UPDATE TO authenticated
  USING (
    client_id IN (
      SELECT client_id FROM public.portal_users
      WHERE auth_user_id = auth.uid() AND client_id IS NOT NULL
    )
  );

-- Trigger : notif admin sur nouvelle CR ou approbation/refus
CREATE OR REPLACE FUNCTION public.notify_admin_on_change_request()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  client_name text;
BEGIN
  SELECT c.name INTO client_name FROM clients c WHERE c.id = NEW.client_id;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.notifications (target_user_id, kind, title, message, link_path)
    VALUES (
      NULL,
      'change_request_new',
      'Nouvelle demande de modification',
      COALESCE(client_name, 'Un client') || ' a soumis une demande',
      '/project-detail?id=' || NEW.project_id::text
    );
  ELSIF TG_OP = 'UPDATE' AND NEW.status = 'approved' AND OLD.status != 'approved' THEN
    INSERT INTO public.notifications (target_user_id, kind, title, message, link_path)
    VALUES (
      NULL,
      'change_request_approved',
      'Demande de modif approuvée',
      COALESCE(client_name, 'Un client') || ' a approuvé l''estimation',
      '/project-detail?id=' || NEW.project_id::text
    );
  ELSIF TG_OP = 'UPDATE' AND NEW.status = 'rejected' AND OLD.status != 'rejected' THEN
    INSERT INTO public.notifications (target_user_id, kind, title, message, link_path)
    VALUES (
      NULL,
      'change_request_rejected',
      'Demande de modif refusée',
      COALESCE(client_name, 'Un client') || ' a refusé l''estimation',
      '/project-detail?id=' || NEW.project_id::text
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_admin_change_request ON public.change_requests;
CREATE TRIGGER trg_notify_admin_change_request
  AFTER INSERT OR UPDATE ON public.change_requests
  FOR EACH ROW EXECUTE FUNCTION public.notify_admin_on_change_request();

-- ─── Meeting notes ───
CREATE TABLE IF NOT EXISTS public.meeting_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,

  /** Date de la réunion */
  meeting_date date NOT NULL,
  meeting_duration_minutes int,
  meeting_attendees text,
  meeting_kind text NOT NULL DEFAULT 'visio'
    CHECK (meeting_kind IN ('visio', 'physique', 'telephone', 'autre')),

  title text NOT NULL,
  /** Contenu structuré : décisions, actions, prochaines étapes */
  decisions text,
  actions text,
  next_steps text,

  /** Validation client */
  validated_at timestamptz,
  validated_by_signature text,
  validated_by_ip text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_meeting_notes_project ON public.meeting_notes(project_id, meeting_date DESC);

CREATE OR REPLACE FUNCTION public.touch_meeting_notes_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
DROP TRIGGER IF EXISTS trg_meeting_notes_updated_at ON public.meeting_notes;
CREATE TRIGGER trg_meeting_notes_updated_at
  BEFORE UPDATE ON public.meeting_notes
  FOR EACH ROW EXECUTE FUNCTION public.touch_meeting_notes_updated_at();

ALTER TABLE public.meeting_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_all_meeting_notes" ON public.meeting_notes;
CREATE POLICY "anon_all_meeting_notes"
  ON public.meeting_notes FOR ALL TO anon
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_read_own_meeting_notes" ON public.meeting_notes;
CREATE POLICY "auth_read_own_meeting_notes"
  ON public.meeting_notes FOR SELECT TO authenticated
  USING (
    client_id IN (
      SELECT client_id FROM public.portal_users
      WHERE auth_user_id = auth.uid() AND client_id IS NOT NULL
    )
  );

-- Client peut UPDATE pour signer le CR
DROP POLICY IF EXISTS "auth_validate_meeting_note" ON public.meeting_notes;
CREATE POLICY "auth_validate_meeting_note"
  ON public.meeting_notes FOR UPDATE TO authenticated
  USING (
    client_id IN (
      SELECT client_id FROM public.portal_users
      WHERE auth_user_id = auth.uid() AND client_id IS NOT NULL
    )
  );

COMMENT ON TABLE public.change_requests IS
  'Demandes de modification post-cadrage. Le client soumet, l''admin chiffre, le client approuve.';
COMMENT ON TABLE public.meeting_notes IS
  'Comptes-rendus de réunion projet. Le client peut valider numériquement (preuve écrite des décisions).';
