-- ════════════════════════════════════════════════════════════════════════
-- Système de réservation de RDV depuis l'espace client
--
-- Phase 1 : modèle de données + RLS + seed
--   1. Nouvelle table availability_rules (règles de dispo Matis,
--      éditable plus tard via CalendarSettingsModal côté CRM).
--   2. calendar_events.booking_source ('admin' | 'portal') + portal_user_id.
--   3. Vue calendar_busy_ranges exposant uniquement les plages occupées
--      (sans titre/client) — utilisée par le portail pour le calcul de
--      slots, sans fuiter les autres clients.
--   4. RLS portail : INSERT scoped à son client_id / portal_user_id ;
--      SELECT limité à ses propres bookings.
--   5. Seed : Lundi-Vendredi 9h-12h + 14h-18h, créneaux 30 min.
-- ════════════════════════════════════════════════════════════════════════

-- ── 1. availability_rules ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.availability_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  weekday smallint NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  start_time time NOT NULL,
  end_time time NOT NULL CHECK (end_time > start_time),
  slot_duration_min int NOT NULL DEFAULT 30 CHECK (slot_duration_min > 0),
  buffer_min int NOT NULL DEFAULT 0 CHECK (buffer_min >= 0),
  meeting_label text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_availability_rules_weekday_active
  ON public.availability_rules (weekday) WHERE active;

ALTER TABLE public.availability_rules ENABLE ROW LEVEL SECURITY;

-- Lecture : anon (CRM) + authenticated (portail) — nécessaire pour calculer les slots
CREATE POLICY "anon_select_availability_rules"
  ON public.availability_rules FOR SELECT TO anon USING (true);
CREATE POLICY "auth_select_availability_rules"
  ON public.availability_rules FOR SELECT TO authenticated USING (true);

-- Écriture : anon CRM uniquement (Matis admin)
CREATE POLICY "anon_insert_availability_rules"
  ON public.availability_rules FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_availability_rules"
  ON public.availability_rules FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_availability_rules"
  ON public.availability_rules FOR DELETE TO anon USING (true);

CREATE TRIGGER update_availability_rules_updated_at
  BEFORE UPDATE ON public.availability_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── 2. calendar_events : provenance + portal_user_id ────────────────────
ALTER TABLE public.calendar_events
  ADD COLUMN IF NOT EXISTS booking_source text NOT NULL DEFAULT 'admin'
    CHECK (booking_source IN ('admin', 'portal'));

ALTER TABLE public.calendar_events
  ADD COLUMN IF NOT EXISTS portal_user_id uuid
    REFERENCES public.portal_users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_calendar_events_portal_source
  ON public.calendar_events (booking_source) WHERE booking_source = 'portal';

-- ── 3. Vue calendar_busy_ranges (lecture portail sans fuite) ────────────
CREATE OR REPLACE VIEW public.calendar_busy_ranges AS
SELECT id, start_at, end_at
FROM public.calendar_events
WHERE end_at IS NOT NULL;

GRANT SELECT ON public.calendar_busy_ranges TO anon, authenticated;

-- ── 4. RLS portail authentifié sur calendar_events ──────────────────────
-- INSERT : seulement ses propres bookings, scope strictement son client.
DROP POLICY IF EXISTS "portal_insert_own_calendar_events" ON public.calendar_events;
CREATE POLICY "portal_insert_own_calendar_events"
  ON public.calendar_events FOR INSERT TO authenticated
  WITH CHECK (
    booking_source = 'portal'
    AND portal_user_id IN (
      SELECT id FROM public.portal_users WHERE auth_user_id = auth.uid()
    )
    AND client_id IN (
      SELECT client_id FROM public.portal_users WHERE auth_user_id = auth.uid()
    )
  );

-- SELECT : un portal user voit uniquement ses propres bookings.
DROP POLICY IF EXISTS "portal_select_own_calendar_events" ON public.calendar_events;
CREATE POLICY "portal_select_own_calendar_events"
  ON public.calendar_events FOR SELECT TO authenticated
  USING (
    portal_user_id IN (
      SELECT id FROM public.portal_users WHERE auth_user_id = auth.uid()
    )
  );

-- DELETE : un portal user peut annuler son propre booking (≥ 24h avant).
DROP POLICY IF EXISTS "portal_delete_own_calendar_events" ON public.calendar_events;
CREATE POLICY "portal_delete_own_calendar_events"
  ON public.calendar_events FOR DELETE TO authenticated
  USING (
    portal_user_id IN (
      SELECT id FROM public.portal_users WHERE auth_user_id = auth.uid()
    )
    AND start_at > now() + interval '24 hours'
  );

-- ── 5. Seed : règles par défaut (Lundi-Vendredi, 9-12h + 14-18h, 30min) ─
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.availability_rules) THEN
    INSERT INTO public.availability_rules
      (weekday, start_time, end_time, slot_duration_min, meeting_label)
    VALUES
      (1, '09:00', '12:00', 30, 'Matin'),
      (1, '14:00', '18:00', 30, 'Après-midi'),
      (2, '09:00', '12:00', 30, 'Matin'),
      (2, '14:00', '18:00', 30, 'Après-midi'),
      (3, '09:00', '12:00', 30, 'Matin'),
      (3, '14:00', '18:00', 30, 'Après-midi'),
      (4, '09:00', '12:00', 30, 'Matin'),
      (4, '14:00', '18:00', 30, 'Après-midi'),
      (5, '09:00', '12:00', 30, 'Matin'),
      (5, '14:00', '18:00', 30, 'Après-midi');
  END IF;
END $$;
