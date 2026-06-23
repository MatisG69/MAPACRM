-- =====================================================================
-- MAPA — Tracking des prospects emailés (lien /r/TOKEN -> parcours site)
-- À exécuter UNE fois dans Supabase (SQL Editor) sur le projet partagé
-- site + CRM (jxnjpwysrsdmuvdgxkqr).
--
-- Idempotent : ré-exécutable sans casse.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- 1. Registre des prospects emailés (1 ligne = 1 destinataire = 1 token)
--    PII (email, contact) : lecture réservée aux utilisateurs connectés.
-- ---------------------------------------------------------------------
create table if not exists public.email_leads (
  id               uuid primary key default gen_random_uuid(),
  token            uuid unique not null default gen_random_uuid(),
  company          text,
  contact_name     text,
  email            text,
  -- lien optionnel vers la fiche CRM (clients.id) si le prospect existe déjà
  client_id        uuid references public.clients(id) on delete set null,
  source           text not null default 'cold_email',
  -- cycle de vie
  email_sent_at    timestamptz,
  first_clicked_at timestamptz,
  last_seen_at     timestamptz,
  click_count      integer not null default 0,
  created_at       timestamptz not null default now()
);

comment on table public.email_leads is
  'Prospects destinataires d''un email MAPA. token = identifiant unique utilisé dans le lien https://mapa-developpement.fr/r/<token>.';

create index if not exists email_leads_token_idx       on public.email_leads (token);
create index if not exists email_leads_client_idx      on public.email_leads (client_id);
create index if not exists email_leads_clicked_idx     on public.email_leads (first_clicked_at);
create index if not exists email_leads_last_seen_idx   on public.email_leads (last_seen_at desc);

-- ---------------------------------------------------------------------
-- 2. Rattacher chaque vue de page au prospect (sans casser l'existant)
--    Colonne nullable : les visiteurs anonymes restent à lead_token NULL.
-- ---------------------------------------------------------------------
alter table public.page_views
  add column if not exists lead_token uuid;

create index if not exists page_views_lead_token_idx
  on public.page_views (lead_token) where lead_token is not null;

-- ---------------------------------------------------------------------
-- 3. RLS
--    email_leads : contient des emails (PII) -> lecture/écriture uniquement
--    pour une session Supabase authentifiée (le CRM passe par AuthGate).
--    Les écritures de tracking passent par la fonction SECURITY DEFINER
--    track_email_click (point 4), donc anon n'a AUCUN accès direct.
-- ---------------------------------------------------------------------
alter table public.email_leads enable row level security;

drop policy if exists email_leads_select_auth on public.email_leads;
create policy email_leads_select_auth
  on public.email_leads for select
  to authenticated using (true);

drop policy if exists email_leads_write_auth on public.email_leads;
create policy email_leads_write_auth
  on public.email_leads for all
  to authenticated using (true) with check (true);

-- ---------------------------------------------------------------------
-- 4. Enregistrement d'un clic email (appelée par la fonction Vercel /r)
--    SECURITY DEFINER : écrit dans email_leads + page_views même appelée
--    avec la clé anon publique. Ne fait RIEN si le token est inconnu
--    (protège contre les appels aléatoires : les tokens sont des UUID).
-- ---------------------------------------------------------------------
create or replace function public.track_email_click(
  p_token   uuid,
  p_session text,
  p_device  text default null,
  p_browser text default null
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_found boolean := false;
begin
  update public.email_leads
     set first_clicked_at = coalesce(first_clicked_at, now()),
         last_seen_at     = now(),
         click_count      = click_count + 1
   where token = p_token
  returning true into v_found;

  if not coalesce(v_found, false) then
    return false; -- token inconnu : on ne logge rien
  end if;

  insert into public.page_views (session_id, page, lead_token, referrer, ua_device, ua_browser)
  values (coalesce(p_session, gen_random_uuid()::text), 'email_clicked', p_token, 'email', p_device, p_browser);

  return true;
end;
$$;

revoke all on function public.track_email_click(uuid, text, text, text) from public;
grant execute on function public.track_email_click(uuid, text, text, text)
  to anon, authenticated, service_role;

-- ---------------------------------------------------------------------
-- 5. Vue de confort : synthèse parcours par prospect cliqué
--    (le dashboard CRM peut aussi recomposer côté client ; cette vue
--     reste pratique pour des exports SQL rapides.)
-- ---------------------------------------------------------------------
create or replace view public.lead_journey_summary as
select
  l.id,
  l.token,
  l.company,
  l.contact_name,
  l.email,
  l.client_id,
  l.source,
  l.email_sent_at,
  l.first_clicked_at,
  l.last_seen_at,
  l.click_count,
  count(pv.*) filter (where pv.page <> 'email_clicked')              as page_events,
  bool_or(pv.page = 'realisations')                                  as saw_realisations,
  bool_or(pv.page = 'services')                                      as saw_services,
  bool_or(pv.page = 'offres')                                        as saw_tarifs,
  bool_or(pv.page = 'contact')                                       as saw_contact,
  bool_or(pv.page = 'rdv')                                           as saw_rdv,
  bool_or(pv.page = 'conversion')                                    as sent_form
from public.email_leads l
left join public.page_views pv on pv.lead_token = l.token
where l.first_clicked_at is not null
group by l.id;

-- La vue hérite des droits de l'appelant ; lecture réservée aux connectés.
revoke all on public.lead_journey_summary from anon;
grant select on public.lead_journey_summary to authenticated;
