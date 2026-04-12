import type { Client, Interaction, Invoice, Project, Quote, Task, Page } from './types';
import { isOverdue } from './utils';

export interface RelanceSuggestion {
  id: string;
  kind: 'quote' | 'invoice' | 'prospect' | 'project_stale';
  title: string;
  description: string;
  navigate?: { page: Page; id?: string };
}

const MS_DAY = 86_400_000;

function daysSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / MS_DAY);
}

/** Suggestions de relance (règles simples, extensibles). */
export function buildRelanceSuggestions(
  clients: Client[],
  interactions: Interaction[],
  projects: Project[],
  tasks: Task[],
  invoices: Invoice[],
  quotes: Quote[]
): RelanceSuggestion[] {
  const out: RelanceSuggestion[] = [];

  for (const q of quotes) {
    if (q.status === 'sent' && daysSince(q.created_at) >= 3) {
      out.push({
        id: `quote-${q.id}`,
        kind: 'quote',
        title: `Relancer le devis ${q.quote_number || q.title}`,
        description: `Envoyé il y a ${daysSince(q.created_at)} j · ${q.client?.name || 'Client'}`,
        navigate: { page: 'quotes' },
      });
    }
  }

  for (const inv of invoices) {
    if (inv.status === 'sent' && inv.due_date && isOverdue(inv.due_date)) {
      out.push({
        id: `inv-${inv.id}`,
        kind: 'invoice',
        title: `Facture en attente de paiement`,
        description: `${inv.invoice_number || inv.id.slice(0, 8)} · échue le ${inv.due_date} · ${inv.client?.name || ''}`,
        navigate: { page: 'invoices' },
      });
    }
  }

  const lastInteractionByClient = new Map<string, number>();
  for (const i of interactions) {
    const t = new Date(i.date).getTime();
    const prev = lastInteractionByClient.get(i.client_id);
    if (prev == null || t > prev) lastInteractionByClient.set(i.client_id, t);
  }

  for (const c of clients) {
    if (c.status !== 'prospect') continue;
    const last = lastInteractionByClient.get(c.id);
    const staleDays = last == null ? 999 : Math.floor((Date.now() - last) / MS_DAY);
    if (staleDays >= 7) {
      out.push({
        id: `prospect-${c.id}`,
        kind: 'prospect',
        title: `Prospect sans nouvelles : ${c.name}`,
        description:
          last == null
            ? 'Aucune interaction enregistrée — reprendre le contact'
            : `Dernière interaction il y a ${staleDays} j`,
        navigate: { page: 'client-detail', id: c.id },
      });
    }
  }

  for (const p of projects) {
    if (p.status !== 'in_progress' && p.status !== 'review') continue;
    const projTasks = tasks.filter((t) => t.project_id === p.id);
    const allDone = projTasks.length > 0 && projTasks.every((t) => t.status === 'completed');
    if (allDone) continue;
    if (daysSince(p.updated_at) >= 14) {
      out.push({
        id: `proj-${p.id}`,
        kind: 'project_stale',
        title: `Projet sans activité récente : ${p.name}`,
        description: `Pas de mise à jour depuis ${daysSince(p.updated_at)} j — faire un point ou avancer les tâches`,
        navigate: { page: 'project-detail', id: p.id },
      });
    }
  }

  return out;
}
