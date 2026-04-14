import type { ClientStatus } from './types';

/** Bandeau gauche des cartes client (aligné sur le statut). */
export const CLIENT_CARD_STRIP: Record<ClientStatus, string> = {
  prospect: 'border-l-amber-500/70',
  telephoned: 'border-l-sky-500/70',
  in_discussion: 'border-l-violet-500/65',
  interested: 'border-l-emerald-500/70',
  not_interested: 'border-l-red-500/60',
};

/** Migre les anciens statuts (active / inactive) et valeurs inconnues. */
export function normalizeClientStatus(raw: string | undefined | null): ClientStatus {
  if (raw === 'active') return 'interested';
  if (raw === 'inactive') return 'not_interested';
  if (raw === 'contacted') return 'in_discussion';
  if (
    raw === 'prospect' ||
    raw === 'telephoned' ||
    raw === 'in_discussion' ||
    raw === 'interested' ||
    raw === 'not_interested'
  ) {
    return raw;
  }
  return 'prospect';
}
