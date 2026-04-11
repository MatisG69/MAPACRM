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
  prospect: 'bg-ws-gold-dim text-ws-gold border-ws-gold/25',
  active: 'bg-ws-bull-dim text-ws-bull border-ws-bull/30',
  inactive: 'bg-ws-deep text-ws-mist border-ws-line',
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
};

const variantLabels: Record<string, string> = {
  prospect: 'Prospect',
  active: 'Actif',
  inactive: 'Inactif',
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
