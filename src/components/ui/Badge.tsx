import {
  ClientStatus,
  ProjectStatus,
  TaskPriority,
  TaskStatus,
  InvoiceStatus,
  InteractionType,
} from '../../lib/types';

type BadgeVariant = ClientStatus | ProjectStatus | TaskPriority | TaskStatus | InvoiceStatus | InteractionType;

const variantStyles: Record<string, string> = {
  prospect: 'bg-amber-500/15 text-amber-200 border-amber-500/35',
  telephoned: 'bg-sky-500/15 text-sky-200 border-sky-500/35',
  in_discussion: 'bg-violet-500/15 text-violet-200 border-violet-500/35',
  interested: 'bg-emerald-500/15 text-emerald-200 border-emerald-500/35',
  not_interested: 'bg-red-500/12 text-red-300 border-red-500/35',
  planning: 'bg-ws-deep text-ws-ink border-ws-line',
  in_progress: 'bg-ws-wire/20 text-ws-highlight border-ws-wire/35',
  review: 'bg-ws-gold-dim text-ws-gold border-ws-gold/25',
  completed: 'bg-ws-bull-dim text-ws-bull border-ws-bull/25',
  on_hold: 'bg-ws-bear-dim text-ws-bear border-ws-bear/30',
  todo: 'bg-ws-deep text-ws-mist border-ws-line',
  low: 'bg-ws-deep text-ws-mist border-ws-line',
  medium: 'bg-ws-wire/20 text-ws-highlight border-ws-wire/30',
  high: 'bg-ws-gold-dim text-ws-gold border-ws-gold/25',
  urgent: 'bg-ws-bear-dim text-ws-bear border-ws-bear/35',
  draft: 'bg-ws-deep text-ws-mist border-ws-line',
  sent: 'bg-ws-wire/20 text-ws-highlight border-ws-wire/30',
  paid: 'bg-ws-bull-dim text-ws-bull border-ws-bull/30',
  overdue: 'bg-ws-bear-dim text-ws-bear border-ws-bear/35',
  cancelled: 'bg-ws-deep text-ws-mist/70 border-ws-line line-through',
  call: 'bg-ws-wire/15 text-ws-highlight border-ws-wire/25',
  email: 'bg-purple-500/10 text-purple-300 border-purple-500/25',
  meeting: 'bg-ws-bull-dim text-ws-bull border-ws-bull/20',
  note: 'bg-ws-gold-dim text-ws-gold border-ws-gold/20',
  demo: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/25',
  website: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/25',
  ecommerce: 'bg-violet-500/10 text-violet-300 border-violet-500/25',
  webapp: 'bg-sky-500/10 text-sky-300 border-sky-500/25',
  redesign: 'bg-ws-accent-muted/20 text-ws-accent-soft border-ws-accent/25',
  maintenance: 'bg-teal-500/10 text-teal-300 border-teal-500/25',
  seo: 'bg-lime-500/10 text-lime-300 border-lime-500/25',
  other: 'bg-ws-deep text-ws-mist border-ws-line',
  lead_detected: 'bg-slate-500/15 text-slate-300 border-slate-500/25',
  contacted: 'bg-ws-wire/15 text-ws-highlight border-ws-wire/30',
  meeting_scheduled: 'bg-violet-500/12 text-violet-200 border-violet-500/25',
  quote_sent: 'bg-amber-500/12 text-amber-200 border-amber-500/30',
  follow_up: 'bg-orange-500/12 text-orange-200 border-orange-500/25',
  won: 'bg-emerald-500/15 text-emerald-200 border-emerald-500/30',
  lost: 'bg-ws-bear-dim text-ws-bear border-ws-bear/35',
  signed: 'bg-emerald-500/15 text-emerald-200 border-emerald-500/30',
  refused: 'bg-red-500/12 text-red-300 border-red-500/30',
  expired: 'bg-ws-deep text-ws-mist/80 border-ws-line',
  too_expensive: 'bg-ws-deep text-ws-mist border-ws-line',
  not_priority: 'bg-ws-deep text-ws-mist border-ws-line',
  competitor: 'bg-ws-bear-dim/50 text-ws-bear border-ws-bear/25',
  no_budget: 'bg-ws-deep text-ws-mist border-ws-line',
  ghosted: 'bg-zinc-500/12 text-zinc-300 border-zinc-500/25',
  // Scraping
  scrapping: 'bg-violet-600/20 text-violet-200 border-violet-500/50',
  // Website status
  no_website: 'bg-red-500/15 text-red-300 border-red-500/35',
  broken_website: 'bg-orange-500/15 text-orange-300 border-orange-500/35',
  social_only: 'bg-sky-500/15 text-sky-300 border-sky-500/35',
  directory_only: 'bg-slate-500/15 text-slate-300 border-slate-500/35',
  outdated_website: 'bg-yellow-500/15 text-yellow-200 border-yellow-500/35',
  low_visibility: 'bg-amber-500/15 text-amber-200 border-amber-500/35',
  website_ok: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/35',
};

const variantLabels: Record<string, string> = {
  prospect: 'Prospect',
  telephoned: 'Téléphoné',
  in_discussion: 'Contacté',
  interested: 'Intéressé',
  not_interested: 'Pas intéressé',
  planning: 'Planification',
  in_progress: 'En cours',
  review: 'En révision',
  completed: 'Terminé',
  on_hold: 'En pause',
  todo: 'À faire',
  low: 'Faible',
  medium: 'Moyen',
  high: 'Élevé',
  urgent: 'Urgent',
  draft: 'Brouillon',
  sent: 'Envoyée',
  paid: 'Payée',
  overdue: 'En retard',
  cancelled: 'Annulée',
  call: 'Appel',
  email: 'Email',
  meeting: 'Réunion',
  note: 'Note',
  demo: 'Démo',
  website: 'Site vitrine',
  ecommerce: 'E-commerce',
  webapp: 'App web',
  redesign: 'Refonte',
  maintenance: 'Maintenance',
  seo: 'SEO',
  other: 'Autre',
  lead_detected: 'Lead',
  contacted: 'Contacté',
  meeting_scheduled: 'RDV prévu',
  quote_sent: 'Devis envoyé',
  follow_up: 'Relance',
  won: 'Gagné',
  lost: 'Perdu',
  signed: 'Signé',
  refused: 'Refusé',
  expired: 'Expiré',
  too_expensive: 'Trop cher',
  not_priority: 'Pas prioritaire',
  competitor: 'Concurrent',
  no_budget: 'Pas de budget',
  ghosted: 'Sans réponse',
  // Scraping
  scrapping: 'Scrapping',
  // Website status
  no_website: 'Pas de site',
  broken_website: 'Site cassé',
  social_only: 'Réseaux seuls',
  directory_only: 'Annuaire seul',
  outdated_website: 'Site obsolète',
  low_visibility: 'Faible visibilité',
  website_ok: 'Site présent',
};

interface BadgeProps {
  value: BadgeVariant | string;
  className?: string;
}

export function Badge({ value, className = '' }: BadgeProps) {
  const style = variantStyles[value] || 'bg-ws-deep text-ws-mist border-ws-line';
  const label = variantLabels[value] || value;
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded border text-[10px] font-mono font-semibold uppercase tracking-wide ${style} ${className}`}
    >
      {label}
    </span>
  );
}
