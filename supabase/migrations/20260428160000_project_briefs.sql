/*
  Brief & Spécifications projet
  ------------------------------
  Une ligne par projet (1:1 stricte). Permet :
    - Au prestataire (CRM) : rédiger / mettre à jour le brief du projet
    - Au client (portail) : consulter le brief et VALIDER LE PÉRIMÈTRE
      avec timestamp + IP → preuve juridique en cas de litige scope.

  Champs structurés :
    - objectives           : objectifs business (texte multi-ligne)
    - scope_in             : ce qui est inclus dans la prestation (JSON array
                             pour itemiser, ou texte multi-ligne)
    - scope_out            : ce qui est explicitement HORS périmètre (idem)
    - constraints          : contraintes techniques, légales, calendrier
    - deliverables         : livrables attendus
    - figma_url            : lien vers maquettes Figma (iframe ou URL)
    - notes                : zone libre

  Validation client :
    - validated_at         : timestamp d'acceptation
    - validated_by_ip      : adresse IP du client au moment de la validation
    - validated_signature  : nom complet tapé par le client (preuve)

  Toute modification après validation INVALIDE la signature (déclenche un
  reset des champs `validated_*`) — l'admin doit alors redemander la
  validation au client.
*/

CREATE TABLE IF NOT EXISTS public.project_briefs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL UNIQUE REFERENCES public.projects(id) ON DELETE CASCADE,

  /* Contenu du brief */
  objectives text,
  scope_in text,
  scope_out text,
  constraints text,
  deliverables text,
  figma_url text,
  notes text,

  /* Validation client */
  validated_at timestamptz,
  validated_by_ip text,
  validated_signature text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_briefs_project ON public.project_briefs(project_id);
CREATE INDEX IF NOT EXISTS idx_project_briefs_validated ON public.project_briefs(validated_at DESC) WHERE validated_at IS NOT NULL;

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.touch_project_briefs_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
DROP TRIGGER IF EXISTS trg_project_briefs_updated_at ON public.project_briefs;
CREATE TRIGGER trg_project_briefs_updated_at
  BEFORE UPDATE ON public.project_briefs
  FOR EACH ROW EXECUTE FUNCTION public.touch_project_briefs_updated_at();

-- Trigger : invalider la signature si le contenu du brief change après validation
CREATE OR REPLACE FUNCTION public.invalidate_brief_signature_on_change()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  -- Si le brief avait été validé et qu'un champ de contenu change, on invalide
  IF OLD.validated_at IS NOT NULL AND (
    OLD.objectives IS DISTINCT FROM NEW.objectives OR
    OLD.scope_in IS DISTINCT FROM NEW.scope_in OR
    OLD.scope_out IS DISTINCT FROM NEW.scope_out OR
    OLD.constraints IS DISTINCT FROM NEW.constraints OR
    OLD.deliverables IS DISTINCT FROM NEW.deliverables OR
    OLD.figma_url IS DISTINCT FROM NEW.figma_url
  ) THEN
    -- Si l'admin n'a pas explicitement re-signé dans cette même update, on invalide
    IF NEW.validated_at = OLD.validated_at THEN
      NEW.validated_at = NULL;
      NEW.validated_by_ip = NULL;
      NEW.validated_signature = NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_brief_invalidate_signature ON public.project_briefs;
CREATE TRIGGER trg_brief_invalidate_signature
  BEFORE UPDATE ON public.project_briefs
  FOR EACH ROW EXECUTE FUNCTION public.invalidate_brief_signature_on_change();

-- ─────────────────────────────────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────────────────────────────────
ALTER TABLE public.project_briefs ENABLE ROW LEVEL SECURITY;

-- 1) Admin (clé anon CRM) : tout
DROP POLICY IF EXISTS "anon_all_project_briefs" ON public.project_briefs;
CREATE POLICY "anon_all_project_briefs"
  ON public.project_briefs
  FOR ALL TO anon
  USING (true) WITH CHECK (true);

-- 2) Client authentifié (portail) : lecture du brief de SES projets
DROP POLICY IF EXISTS "auth_read_own_brief" ON public.project_briefs;
CREATE POLICY "auth_read_own_brief"
  ON public.project_briefs FOR SELECT TO authenticated
  USING (
    project_id IN (
      SELECT p.id FROM public.projects p
      JOIN public.portal_users pu ON pu.client_id = p.client_id
      WHERE pu.auth_user_id = auth.uid()
    )
  );

-- 3) Client authentifié : peut UPDATE uniquement les champs de validation
--    (validated_at, validated_by_ip, validated_signature) sur SON brief.
--    Postgres RLS ne permet pas de restreindre les colonnes en UPDATE
--    nativement → on repose sur la logique côté UI portail (qui n'expose
--    que ces champs) + on bloque tout INSERT depuis le portail.
DROP POLICY IF EXISTS "auth_update_own_brief_validation" ON public.project_briefs;
CREATE POLICY "auth_update_own_brief_validation"
  ON public.project_briefs FOR UPDATE TO authenticated
  USING (
    project_id IN (
      SELECT p.id FROM public.projects p
      JOIN public.portal_users pu ON pu.client_id = p.client_id
      WHERE pu.auth_user_id = auth.uid()
    )
  );

COMMENT ON TABLE public.project_briefs IS
  'Brief & spécifications du projet. Une ligne par projet. Le client peut consulter et signer numériquement (validated_at + signature) — protection juridique anti-litige scope.';
