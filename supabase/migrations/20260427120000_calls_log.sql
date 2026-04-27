/*
  Calls — journal d'appels commerciaux
  -------------------------------------
  Tableau opérationnel pour le commercial : chaque ligne = un appel à passer
  ou à journaliser. Connecté à la table clients pour l'auto-remplissage des
  coordonnées (téléphone, email, site web).

  Champs saisis par le commercial :
    - client_id       : sélection client (FK obligatoire)
    - called          : appel passé oui/non
    - interested      : intéressé oui/non (peut rester null avant l'appel)
    - notes           : texte libre
    - called_at       : timestamp de l'appel (renseigné quand called passe à true)

  Les coordonnées (téléphone, email, site web) ne sont PAS dupliquées dans
  cette table — elles sont lues à la volée depuis `clients` côté UI.
*/

CREATE TABLE IF NOT EXISTS public.calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,

  /** Appel effectué oui/non */
  called boolean NOT NULL DEFAULT false,
  /** Date/heure de l'appel — auto-renseigné côté UI quand called passe à true */
  called_at timestamptz,

  /** Intéressé : null tant que pas évalué, true/false ensuite */
  interested boolean,

  /** Notes libres prises pendant ou après l'appel */
  notes text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_calls_client ON public.calls(client_id);
CREATE INDEX IF NOT EXISTS idx_calls_created ON public.calls(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_calls_called ON public.calls(called);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.touch_calls_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
DROP TRIGGER IF EXISTS trg_calls_updated_at ON public.calls;
CREATE TRIGGER trg_calls_updated_at
  BEFORE UPDATE ON public.calls
  FOR EACH ROW EXECUTE FUNCTION public.touch_calls_updated_at();

-- ─────────────────────────────────────────────────────────────────────
-- RLS — admin (clé anon CRM) : tout
-- ─────────────────────────────────────────────────────────────────────
ALTER TABLE public.calls ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_all_calls" ON public.calls;
CREATE POLICY "anon_all_calls"
  ON public.calls
  FOR ALL TO anon
  USING (true) WITH CHECK (true);

COMMENT ON TABLE public.calls IS
  'Journal d''appels commerciaux : ligne par appel, lié à un client.';
