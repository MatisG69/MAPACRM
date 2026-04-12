import type { DealStage } from './types';

export const PIPELINE_STAGES: { id: DealStage; label: string; short: string }[] = [
  { id: 'lead_detected', label: 'Lead détecté', short: 'Lead' },
  { id: 'contacted', label: 'Contacté', short: 'Contact' },
  { id: 'meeting_scheduled', label: 'RDV prévu', short: 'RDV' },
  { id: 'quote_sent', label: 'Devis envoyé', short: 'Devis' },
  { id: 'follow_up', label: 'Relance', short: 'Relance' },
  { id: 'won', label: 'Gagné', short: 'Gagné' },
  { id: 'lost', label: 'Perdu', short: 'Perdu' },
];

export function stageLabel(id: DealStage): string {
  return PIPELINE_STAGES.find((s) => s.id === id)?.label ?? id;
}
