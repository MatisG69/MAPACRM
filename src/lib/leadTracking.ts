import { supabase } from './supabase';

/**
 * Génération des liens email trackés MAPA.
 *
 * Pour chaque prospect, on crée une ligne `email_leads` (token unique) et on
 * construit le lien réel `https://mapa-developpement.fr/r/<token>`.
 * Dans l'email, ce lien est posé sur un texte neutre (« https://mapa-developpement.fr »
 * ou « Voir mon portfolio ») : le prospect ne voit jamais le token.
 *
 * À appeler au moment de la génération des brouillons (1 token par destinataire).
 */

export const SITE_URL = 'https://mapa-developpement.fr';

export interface LeadInput {
  company?: string | null;
  contact_name?: string | null;
  email?: string | null;
  /** Fiche CRM liée si le prospect existe déjà dans `clients`. */
  client_id?: string | null;
  source?: string | null;
  /** Date d'envoi de l'email (sinon laissée nulle, à compléter à l'envoi). */
  email_sent_at?: string | null;
}

export interface MintedLead {
  token: string;
  /** Lien réel à mettre dans le href de l'email. */
  url: string;
}

export function trackedUrl(token: string): string {
  return `${SITE_URL}/r/${token}`;
}

/**
 * Crée un token pour un prospect et renvoie le lien tracké.
 * Nécessite une session Supabase authentifiée (le CRM passe par AuthGate).
 */
export async function createLeadToken(input: LeadInput): Promise<MintedLead | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('email_leads')
    .insert({
      company: input.company ?? null,
      contact_name: input.contact_name ?? null,
      email: input.email ?? null,
      client_id: input.client_id ?? null,
      source: input.source ?? 'cold_email',
      email_sent_at: input.email_sent_at ?? null,
    })
    .select('token')
    .single();

  if (error || !data) return null;
  return { token: data.token as string, url: trackedUrl(data.token as string) };
}

/**
 * Crée des tokens en lot (un par prospect). Renvoie une map email -> lien tracké
 * pour brancher facilement la génération des brouillons.
 */
export async function createLeadTokensBulk(
  inputs: LeadInput[]
): Promise<Record<string, MintedLead>> {
  const out: Record<string, MintedLead> = {};
  if (!supabase || inputs.length === 0) return out;

  const { data, error } = await supabase
    .from('email_leads')
    .insert(
      inputs.map((i) => ({
        company: i.company ?? null,
        contact_name: i.contact_name ?? null,
        email: i.email ?? null,
        client_id: i.client_id ?? null,
        source: i.source ?? 'cold_email',
        email_sent_at: i.email_sent_at ?? null,
      }))
    )
    .select('token,email');

  if (error || !data) return out;
  for (const row of data as { token: string; email: string | null }[]) {
    const key = row.email || row.token;
    out[key] = { token: row.token, url: trackedUrl(row.token) };
  }
  return out;
}
