/*
  Notifications in-app
  --------------------
  Système simple de notifications visibles dans une cloche en haut de page.

  Modèle :
    - target_user_id (auth.users)  → null = notif destinée à l'admin (anon role CRM)
                                     non-null = notif client portail
    - kind                          → catégorie (message, brief_validated,
                                     step_validated, doc_received, etc.)
    - title / message               → texte lisible
    - link_path                     → chemin frontend (ex. /projects/{id})
    - read_at                       → timestamp de lecture (null = unread)

  Triggers automatiques :
    - portal_messages INSERT (sender='client')   → notif admin
    - client_documents UPDATE (received)         → notif admin
    - project_briefs UPDATE (validated)          → notif admin
    - project_steps UPDATE (validated_at SET)    → notif admin
*/

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  /** null = destinée à l'admin (anon CRM), sinon = destinée au client portail */
  target_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL,
  title text NOT NULL,
  message text,
  link_path text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_target
  ON public.notifications(target_user_id, read_at, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_admin_unread
  ON public.notifications(created_at DESC)
  WHERE target_user_id IS NULL AND read_at IS NULL;

-- ─────────────────────────────────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────────────────────────────────
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Admin (anon) : voit toutes les notifs admin (target_user_id IS NULL)
DROP POLICY IF EXISTS "anon_admin_notifications" ON public.notifications;
CREATE POLICY "anon_admin_notifications"
  ON public.notifications FOR ALL TO anon
  USING (true) WITH CHECK (target_user_id IS NULL);

-- Client authentifié : voit + update SES notifs uniquement
DROP POLICY IF EXISTS "auth_own_notifications_read" ON public.notifications;
CREATE POLICY "auth_own_notifications_read"
  ON public.notifications FOR SELECT TO authenticated
  USING (target_user_id = auth.uid());

DROP POLICY IF EXISTS "auth_own_notifications_update" ON public.notifications;
CREATE POLICY "auth_own_notifications_update"
  ON public.notifications FOR UPDATE TO authenticated
  USING (target_user_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────
-- Triggers : notif admin sur événements client
-- ─────────────────────────────────────────────────────────────────────

-- 1) Nouveau message client → notif admin
CREATE OR REPLACE FUNCTION public.notify_admin_on_client_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  client_name text;
BEGIN
  IF NEW.sender = 'client' THEN
    SELECT c.name INTO client_name
    FROM projects p
    JOIN clients c ON c.id = p.client_id
    WHERE p.id = NEW.project_id;

    INSERT INTO public.notifications (target_user_id, kind, title, message, link_path)
    VALUES (
      NULL,
      'client_message',
      'Nouveau message client',
      COALESCE(client_name, 'Un client') || ' a envoyé un message',
      '/project-detail?id=' || NEW.project_id::text
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_admin_client_message ON public.portal_messages;
CREATE TRIGGER trg_notify_admin_client_message
  AFTER INSERT ON public.portal_messages
  FOR EACH ROW EXECUTE FUNCTION public.notify_admin_on_client_message();

-- 2) Document client reçu (request_status passe à 'received') → notif admin
CREATE OR REPLACE FUNCTION public.notify_admin_on_doc_received()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  client_name text;
BEGIN
  IF NEW.is_request = true
     AND NEW.request_status = 'received'
     AND (OLD.request_status IS DISTINCT FROM 'received') THEN

    SELECT c.name INTO client_name FROM clients c WHERE c.id = NEW.client_id;

    INSERT INTO public.notifications (target_user_id, kind, title, message, link_path)
    VALUES (
      NULL,
      'doc_received',
      'Document reçu',
      COALESCE(client_name, 'Un client') || ' a fourni « ' || NEW.name || ' »',
      CASE WHEN NEW.project_id IS NOT NULL
           THEN '/project-detail?id=' || NEW.project_id::text
           ELSE '/client-detail?id=' || NEW.client_id::text
      END
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_admin_doc_received ON public.client_documents;
CREATE TRIGGER trg_notify_admin_doc_received
  AFTER UPDATE ON public.client_documents
  FOR EACH ROW EXECUTE FUNCTION public.notify_admin_on_doc_received();

-- 3) Brief validé par client → notif admin
CREATE OR REPLACE FUNCTION public.notify_admin_on_brief_validated()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  client_name text;
  project_name text;
BEGIN
  IF NEW.validated_at IS NOT NULL AND OLD.validated_at IS NULL THEN
    SELECT c.name, p.name INTO client_name, project_name
    FROM projects p JOIN clients c ON c.id = p.client_id
    WHERE p.id = NEW.project_id;

    INSERT INTO public.notifications (target_user_id, kind, title, message, link_path)
    VALUES (
      NULL,
      'brief_validated',
      'Brief validé',
      COALESCE(client_name, 'Un client') || ' a validé le brief de « ' || COALESCE(project_name, 'son projet') || ' »',
      '/project-detail?id=' || NEW.project_id::text
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_admin_brief_validated ON public.project_briefs;
CREATE TRIGGER trg_notify_admin_brief_validated
  AFTER UPDATE ON public.project_briefs
  FOR EACH ROW EXECUTE FUNCTION public.notify_admin_on_brief_validated();

-- 4) Étape validée par client → notif admin
CREATE OR REPLACE FUNCTION public.notify_admin_on_step_validated()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  client_name text;
BEGIN
  IF NEW.validated_at IS NOT NULL AND OLD.validated_at IS NULL THEN
    SELECT c.name INTO client_name
    FROM projects p JOIN clients c ON c.id = p.client_id
    WHERE p.id = NEW.project_id;

    INSERT INTO public.notifications (target_user_id, kind, title, message, link_path)
    VALUES (
      NULL,
      'step_validated',
      'Étape validée',
      COALESCE(client_name, 'Un client') || ' a validé l''étape « ' || NEW.title || ' »',
      '/project-detail?id=' || NEW.project_id::text
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_admin_step_validated ON public.project_steps;
CREATE TRIGGER trg_notify_admin_step_validated
  AFTER UPDATE ON public.project_steps
  FOR EACH ROW EXECUTE FUNCTION public.notify_admin_on_step_validated();

COMMENT ON TABLE public.notifications IS
  'Notifications in-app. target_user_id NULL = admin CRM, sinon = client portail.';
