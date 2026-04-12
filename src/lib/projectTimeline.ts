import type {
  CalendarEvent,
  Interaction,
  Invoice,
  Project,
  Quote,
  Task,
} from './types';
import { formatCurrency, formatDate, formatDateTime } from './utils';

export type TimelineKind = 'project' | 'task' | 'interaction' | 'invoice' | 'quote' | 'calendar';

export interface TimelineRow {
  id: string;
  at: string;
  sortTs: number;
  label: string;
  sub: string;
  kind: TimelineKind;
}

export function buildProjectTimeline(
  project: Project,
  tasks: Task[],
  interactions: Interaction[],
  invoices: Invoice[],
  quotes: Quote[],
  events: CalendarEvent[]
): TimelineRow[] {
  const rows: TimelineRow[] = [];

  rows.push({
    id: `p-created-${project.id}`,
    at: project.created_at,
    sortTs: new Date(project.created_at).getTime(),
    label: 'Projet créé',
    sub: project.name,
    kind: 'project',
  });

  if (project.updated_at !== project.created_at) {
    rows.push({
      id: `p-upd-${project.id}-${project.updated_at}`,
      at: project.updated_at,
      sortTs: new Date(project.updated_at).getTime(),
      label: 'Projet mis à jour',
      sub: `Statut · ${project.status}`,
      kind: 'project',
    });
  }

  for (const t of tasks) {
    rows.push({
      id: `t-${t.id}-c`,
      at: t.created_at,
      sortTs: new Date(t.created_at).getTime(),
      label: `Tâche · ${t.title}`,
      sub: `Créée · ${t.status}`,
      kind: 'task',
    });
    if (t.status === 'completed' && t.updated_at && t.updated_at !== t.created_at) {
      rows.push({
        id: `t-${t.id}-d`,
        at: t.updated_at,
        sortTs: new Date(t.updated_at).getTime(),
        label: `Tâche terminée · ${t.title}`,
        sub: formatDate(t.due_date),
        kind: 'task',
      });
    }
  }

  for (const i of interactions) {
    rows.push({
      id: `i-${i.id}`,
      at: i.date,
      sortTs: new Date(i.date).getTime(),
      label: `Interaction · ${i.type}`,
      sub: i.description.slice(0, 120) + (i.description.length > 120 ? '…' : ''),
      kind: 'interaction',
    });
  }

  for (const q of quotes) {
    rows.push({
      id: `q-${q.id}`,
      at: q.created_at,
      sortTs: new Date(q.created_at).getTime(),
      label: `Devis · ${q.title}`,
      sub: `${q.quote_number || '—'} · ${q.status}`,
      kind: 'quote',
    });
  }

  for (const inv of invoices) {
    rows.push({
      id: `inv-${inv.id}`,
      at: inv.created_at,
      sortTs: new Date(inv.created_at).getTime(),
      label: `Facture · ${inv.invoice_number || inv.id.slice(0, 8)}`,
        sub: `${inv.status} · ${formatCurrency(inv.amount)}`,
      kind: 'invoice',
    });
    if (inv.paid_date) {
      rows.push({
        id: `inv-paid-${inv.id}`,
        at: inv.paid_date,
        sortTs: new Date(inv.paid_date).getTime(),
        label: 'Paiement enregistré',
        sub: inv.invoice_number || '',
        kind: 'invoice',
      });
    }
  }

  for (const ev of events) {
    rows.push({
      id: `cal-${ev.id}`,
      at: ev.start_at,
      sortTs: new Date(ev.start_at).getTime(),
      label: `Agenda · ${ev.title}`,
      sub: ev.all_day ? 'Journée' : formatDateTime(ev.start_at),
      kind: 'calendar',
    });
  }

  rows.sort((a, b) => b.sortTs - a.sortTs);
  return rows;
}
