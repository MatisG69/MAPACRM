/*
  Demandes de ressources client
  ------------------------------
  Étend `client_documents` avec un mode « demande » : l'admin crée un
  emplacement vide ("Logo HD à fournir") avec une deadline ; le client le
  voit dans son espace, peut uploader, et le statut passe automatiquement
  de "demandé" à "reçu".

  Cycle de vie :
    requested → received (client a uploadé)
              → validated (admin a validé)
              → rejected  (admin demande un nouvel envoi)

  Rétrocompatibilité : les uploads existants (avant cette migration) ont
  `is_request = false` par défaut → comportement identique à aujourd'hui.

  Les uploads CLIENT côté portail nécessitent une policy RLS spécifique :
  on n'autorise que l'UPDATE du `file_path` / `mime_type` / `file_size` /
  `status` sur les lignes `is_request = true` qui appartiennent au client
  connecté.
*/

ALTER TABLE public.client_documents
  ADD COLUMN IF NOT EXISTS is_request boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS request_status text
    CHECK (request_status IN ('requested', 'received', 'validated', 'rejected')),
  ADD COLUMN IF NOT EXISTS request_due_date date,
  ADD COLUMN IF NOT EXISTS request_priority text NOT NULL DEFAULT 'normal'
    CHECK (request_priority IN ('low', 'normal', 'high', 'urgent')),
  ADD COLUMN IF NOT EXISTS request_admin_notes text,
  ADD COLUMN IF NOT EXISTS received_at timestamptz,
  ADD COLUMN IF NOT EXISTS validated_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejection_reason text;

-- Index pour la vue "demandes en attente côté client"
CREATE INDEX IF NOT EXISTS idx_client_documents_is_request
  ON public.client_documents(is_request, request_status)
  WHERE is_request = true;

CREATE INDEX IF NOT EXISTS idx_client_documents_due_date
  ON public.client_documents(request_due_date)
  WHERE request_due_date IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────────
-- Permettre file_path NULL pour les demandes sans fichier encore uploadé
-- ─────────────────────────────────────────────────────────────────────
ALTER TABLE public.client_documents
  ALTER COLUMN file_path DROP NOT NULL;

-- Contrainte : un document non-demande DOIT avoir un file_path
ALTER TABLE public.client_documents
  DROP CONSTRAINT IF EXISTS client_documents_file_path_required;

ALTER TABLE public.client_documents
  ADD CONSTRAINT client_documents_file_path_required
    CHECK (
      is_request = true
      OR file_path IS NOT NULL
    );

-- ─────────────────────────────────────────────────────────────────────
-- RLS : permettre au client connecté d'UPDATE les demandes qui le concernent
-- ─────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "auth_update_own_request" ON public.client_documents;
CREATE POLICY "auth_update_own_request"
  ON public.client_documents FOR UPDATE TO authenticated
  USING (
    is_request = true
    AND client_id IN (
      SELECT client_id FROM public.portal_users
      WHERE auth_user_id = auth.uid() AND client_id IS NOT NULL
    )
  );

COMMENT ON COLUMN public.client_documents.is_request IS
  'true = ligne créée par l''admin pour réclamer un document au client. false = upload simple par l''admin.';
COMMENT ON COLUMN public.client_documents.request_status IS
  'État du cycle : requested → received (client uploadé) → validated/rejected (admin).';

-- ─────────────────────────────────────────────────────────────────────
-- Storage : permettre au client authentifié d'UPLOADER des fichiers
-- pour répondre à une demande qui le concerne.
-- ─────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "client_documents_owner_upload" ON storage.objects;
CREATE POLICY "client_documents_owner_upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'client-documents'
    AND EXISTS (
      SELECT 1 FROM public.portal_users pu
      WHERE pu.auth_user_id = auth.uid()
        AND pu.client_id IS NOT NULL
        -- Le path doit commencer par le client_id du portal_user
        AND storage.objects.name LIKE pu.client_id::text || '/%'
    )
  );

-- Permettre aussi UPDATE / DELETE sur les fichiers du même client
-- (pour ré-uploader une nouvelle version d'une demande rejetée)
DROP POLICY IF EXISTS "client_documents_owner_update" ON storage.objects;
CREATE POLICY "client_documents_owner_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'client-documents'
    AND EXISTS (
      SELECT 1 FROM public.portal_users pu
      WHERE pu.auth_user_id = auth.uid()
        AND pu.client_id IS NOT NULL
        AND storage.objects.name LIKE pu.client_id::text || '/%'
    )
  );
