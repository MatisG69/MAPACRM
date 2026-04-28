/*
  Enrichissement project_steps : phases, dates prévisionnelles, livrables, validations
  -------------------------------------------------------------------------------------
  Étend la table existante avec :
    - phase                  : groupe d'appartenance ('analyse', 'conception',
                               'dev', 'ajustements', 'livraison')
    - planned_start          : date prévue de début (frise Gantt)
    - planned_end            : date prévue de fin
    - deliverable_url        : lien vers un livrable consultable par le client
                               (staging URL, maquette Figma, etc.)
    - requires_validation    : si true, le client doit valider l'étape
    - validated_at           : timestamp de validation client
    - validated_signature    : nom complet tapé par le client (preuve)
    - validated_by_ip        : IP du client à la validation
*/

ALTER TABLE public.project_steps
  ADD COLUMN IF NOT EXISTS phase text
    CHECK (phase IS NULL OR phase IN ('analyse', 'conception', 'dev', 'ajustements', 'livraison')),
  ADD COLUMN IF NOT EXISTS planned_start date,
  ADD COLUMN IF NOT EXISTS planned_end date,
  ADD COLUMN IF NOT EXISTS deliverable_url text,
  ADD COLUMN IF NOT EXISTS requires_validation boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS validated_at timestamptz,
  ADD COLUMN IF NOT EXISTS validated_signature text,
  ADD COLUMN IF NOT EXISTS validated_by_ip text;

CREATE INDEX IF NOT EXISTS idx_project_steps_phase
  ON public.project_steps(project_id, phase);

CREATE INDEX IF NOT EXISTS idx_project_steps_validation
  ON public.project_steps(project_id, requires_validation, validated_at)
  WHERE requires_validation = true;

-- ─────────────────────────────────────────────────────────────────────
-- RLS : permettre au client authentifié d'UPDATE la validation de SES étapes
-- ─────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "auth_validate_own_step" ON public.project_steps;
CREATE POLICY "auth_validate_own_step"
  ON public.project_steps FOR UPDATE TO authenticated
  USING (
    project_id IN (
      SELECT p.id FROM public.projects p
      JOIN public.portal_users pu ON pu.client_id = p.client_id
      WHERE pu.auth_user_id = auth.uid()
    )
  );

COMMENT ON COLUMN public.project_steps.phase IS
  'Phase macro du projet pour grouper les étapes dans la frise Gantt visuelle.';
COMMENT ON COLUMN public.project_steps.requires_validation IS
  'Si true, le client doit valider explicitement cette étape (preuve juridique de réception).';
