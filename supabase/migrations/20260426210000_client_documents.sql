/*
  Documents clients (espace portail)
  -----------------------------------
  Table pour stocker les documents arbitraires uploadés par l'admin et
  visibles par le client connecté à l'espace portail. Vient en complément
  des devis/factures déjà gérés (qui sont leurs propres tables).

  Use-cases : compte-rendu de réunion, charte graphique, doc d'usage,
  contrat signé scanné, livrable annexe…

  Stockage des fichiers : bucket Supabase `client-documents` (à créer).
  La colonne `file_path` contient le chemin relatif dans ce bucket.
*/

CREATE TABLE IF NOT EXISTS public.client_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,

  /** Catégorie libre (ex. 'contrat', 'livrable', 'compte-rendu', 'charte') */
  category text NOT NULL DEFAULT 'autre'
    CHECK (category IN ('contrat', 'livrable', 'compte-rendu', 'charte', 'autre')),

  /** Nom affiché du document */
  name text NOT NULL,
  /** Description / commentaire pour le client */
  description text,

  /** Chemin du fichier dans Supabase Storage (bucket `client-documents`) */
  file_path text NOT NULL,
  /** Type MIME (ex. application/pdf) — pour servir les bons headers */
  mime_type text,
  /** Taille en octets — pour affichage UI */
  file_size bigint,

  /** Auteur de l'upload (auth user id de l'admin) */
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_documents_client ON public.client_documents(client_id);
CREATE INDEX IF NOT EXISTS idx_client_documents_project ON public.client_documents(project_id);
CREATE INDEX IF NOT EXISTS idx_client_documents_created ON public.client_documents(created_at DESC);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.touch_client_documents_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
DROP TRIGGER IF EXISTS trg_client_documents_updated_at ON public.client_documents;
CREATE TRIGGER trg_client_documents_updated_at
  BEFORE UPDATE ON public.client_documents
  FOR EACH ROW EXECUTE FUNCTION public.touch_client_documents_updated_at();

-- ─────────────────────────────────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────────────────────────────────
ALTER TABLE public.client_documents ENABLE ROW LEVEL SECURITY;

-- 1) Admin (clé anon CRM) : tout
DROP POLICY IF EXISTS "anon_all_client_documents" ON public.client_documents;
CREATE POLICY "anon_all_client_documents"
  ON public.client_documents
  FOR ALL TO anon
  USING (true) WITH CHECK (true);

-- 2) Client authentifié (portail) : lecture seule de SES documents
--    (via portal_users.client_id)
DROP POLICY IF EXISTS "auth_read_own_documents" ON public.client_documents;
CREATE POLICY "auth_read_own_documents"
  ON public.client_documents
  FOR SELECT TO authenticated
  USING (
    client_id IN (
      SELECT client_id FROM public.portal_users
      WHERE auth_user_id = auth.uid()
        AND client_id IS NOT NULL
    )
  );

-- ─────────────────────────────────────────────────────────────────────
-- Storage : bucket privé pour les fichiers
-- ─────────────────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('client-documents', 'client-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Politiques storage : admin upload/lit/supprime, client lit ses propres docs.
DROP POLICY IF EXISTS "client_documents_admin_all" ON storage.objects;
CREATE POLICY "client_documents_admin_all"
  ON storage.objects FOR ALL TO anon
  USING (bucket_id = 'client-documents')
  WITH CHECK (bucket_id = 'client-documents');

DROP POLICY IF EXISTS "client_documents_owner_read" ON storage.objects;
CREATE POLICY "client_documents_owner_read"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'client-documents'
    AND EXISTS (
      SELECT 1
      FROM public.client_documents cd
      JOIN public.portal_users pu ON pu.client_id = cd.client_id
      WHERE cd.file_path = storage.objects.name
        AND pu.auth_user_id = auth.uid()
    )
  );

COMMENT ON TABLE public.client_documents IS
  'Documents arbitraires uploadés par l''admin pour un client (visible côté portail)';
