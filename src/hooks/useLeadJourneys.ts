import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase, isSupabaseEnabled } from '../lib/supabase';

/**
 * Parcours des prospects emailés.
 *
 * Source : table `email_leads` (1 ligne = 1 destinataire d'email avec un token
 * unique) + `page_views` rattachées via `lead_token`. Le site envoie un
 * `page_view` par section atteinte ; la fonction /r/<token> ajoute l'étape
 * `email_clicked`. On recompose ici la timeline ordonnée par prospect.
 */

export interface EmailLeadRow {
  id: string;
  token: string;
  company: string | null;
  contact_name: string | null;
  email: string | null;
  client_id: string | null;
  source: string | null;
  email_sent_at: string | null;
  first_clicked_at: string | null;
  last_seen_at: string | null;
  click_count: number;
  created_at: string;
}

interface LeadPageView {
  page: string;
  lead_token: string | null;
  created_at: string;
}

/** Étapes du parcours dans l'ordre, après l'envoi/clic de l'email. */
export const LEAD_STEPS: { key: string; label: string }[] = [
  { key: 'email_sent', label: 'Email envoyé' },
  { key: 'email_clicked', label: 'Email cliqué' },
  { key: 'accueil', label: 'Accueil' },
  { key: 'realisations', label: 'Réalisations' },
  { key: 'services', label: 'Services' },
  { key: 'offres', label: 'Tarifs' },
  { key: 'contact', label: 'Contact' },
  { key: 'rdv', label: 'Rendez-vous' },
  { key: 'conversion', label: 'Demande envoyée' },
];

export interface JourneyStep {
  key: string;
  label: string;
  reached: boolean;
  at: string | null;
}

export interface LeadJourney {
  lead: EmailLeadRow;
  steps: JourneyStep[];
  /** Index de l'étape la plus avancée atteinte (dans LEAD_STEPS). */
  deepestIndex: number;
  deepestLabel: string;
  /** A envoyé le formulaire de contact/RDV. */
  converted: boolean;
  lastActivity: string | null;
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

export function useLeadJourneys(windowDays = 90) {
  const [leads, setLeads] = useState<EmailLeadRow[]>([]);
  const [views, setViews] = useState<LeadPageView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tableExists, setTableExists] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (!isSupabaseEnabled() || !supabase) {
        setLeads([]);
        setViews([]);
        return;
      }
      // Prospects ayant cliqué au moins une fois.
      const { data: leadRows, error: leadErr } = await supabase
        .from('email_leads')
        .select('*')
        .not('first_clicked_at', 'is', null)
        .order('last_seen_at', { ascending: false });

      if (leadErr) {
        if (leadErr.message?.includes('does not exist') || leadErr.code === '42P01') {
          setTableExists(false);
          setLeads([]);
          setViews([]);
          return;
        }
        throw leadErr;
      }
      setTableExists(true);
      const ls = (leadRows || []) as EmailLeadRow[];
      setLeads(ls);

      if (ls.length === 0) {
        setViews([]);
        return;
      }

      // Vues rattachées à un prospect sur la fenêtre choisie.
      const { data: pvRows, error: pvErr } = await supabase
        .from('page_views')
        .select('page,lead_token,created_at')
        .not('lead_token', 'is', null)
        .gte('created_at', daysAgo(windowDays))
        .order('created_at', { ascending: true });
      if (pvErr) throw pvErr;
      setViews((pvRows || []) as LeadPageView[]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [windowDays]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const journeys = useMemo<LeadJourney[]>(() => {
    // Regroupe les vues par token : 1ère occurrence (la plus ancienne) par étape.
    const firstAtByToken: Record<string, Record<string, string>> = {};
    for (const v of views) {
      if (!v.lead_token) continue;
      const bag = (firstAtByToken[v.lead_token] ||= {});
      if (!bag[v.page]) bag[v.page] = v.created_at;
    }

    return leads.map((lead) => {
      const bag = firstAtByToken[lead.token] || {};
      const steps: JourneyStep[] = LEAD_STEPS.map((s) => {
        if (s.key === 'email_sent') {
          return { ...s, reached: !!lead.email_sent_at, at: lead.email_sent_at };
        }
        if (s.key === 'email_clicked') {
          return {
            ...s,
            reached: !!lead.first_clicked_at,
            at: lead.first_clicked_at || bag['email_clicked'] || null,
          };
        }
        return { ...s, reached: !!bag[s.key], at: bag[s.key] || null };
      });

      let deepestIndex = 0;
      steps.forEach((s, i) => {
        if (s.reached) deepestIndex = i;
      });

      const timestamps = steps
        .map((s) => s.at)
        .filter((x): x is string => !!x)
        .concat(lead.last_seen_at ? [lead.last_seen_at] : []);
      const lastActivity =
        timestamps.length > 0
          ? timestamps.reduce((a, b) => (a > b ? a : b))
          : lead.last_seen_at;

      return {
        lead,
        steps,
        deepestIndex,
        deepestLabel: LEAD_STEPS[deepestIndex]?.label ?? '—',
        converted: steps.find((s) => s.key === 'conversion')?.reached ?? false,
        lastActivity,
      };
    });
  }, [leads, views]);

  const stats = useMemo(() => {
    const clicked = journeys.length;
    const converted = journeys.filter((j) => j.converted).length;
    const reachedTarifs = journeys.filter(
      (j) => j.steps.find((s) => s.key === 'offres')?.reached
    ).length;
    return { clicked, converted, reachedTarifs };
  }, [journeys]);

  return { journeys, stats, loading, error, tableExists, refetch: fetchAll };
}
