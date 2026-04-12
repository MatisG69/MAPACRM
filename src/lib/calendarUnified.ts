import type {
  CalendarEvent,
  Client,
  Interaction,
  InteractionType,
  Invoice,
  Page,
  Project,
  Task,
  TaskPriority,
} from './types';
import { expandCalendarEvents, type CalendarOccurrence } from './calendarExpand';

export type UnifiedCalendarKind =
  | 'agenda'
  | 'project'
  | 'task'
  | 'client'
  | 'interaction'
  | 'invoice_due'
  | 'invoice_paid';

/** Une ligne affichable dans la grille (agenda + données CRM dérivées). */
export interface UnifiedCalendarOccurrence {
  kind: UnifiedCalendarKind;
  occurrenceKey: string;
  /** Texte court affiché sur la puce */
  title: string;
  startAt: Date;
  /** Dernier jour inclus (00:00 local) pour les plages all-day ; sinon null = point unique */
  endAt: Date | null;
  allDay: boolean;
  color: string;
  calendarEvent?: CalendarEvent;
  navigate?: { page: Page; id?: string };
}

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

export function dayKeyCal(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

/** Date-only ISO YYYY-MM-DD → minuit local */
export function parseISODateOnly(s: string): Date {
  const part = s.split('T')[0];
  const [y, m, d] = part.split('-').map(Number);
  if (!y || !m || !d) return new Date(s);
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

function overlapsRange(start: Date, end: Date, rangeStart: Date, rangeEnd: Date): boolean {
  return start <= rangeEnd && end >= rangeStart;
}

function truncate(s: string, max: number): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

const INTERACTION_LABEL: Record<InteractionType, string> = {
  call: 'Appel',
  email: 'E-mail',
  meeting: 'Réunion',
  note: 'Note',
  demo: 'Démo',
};

const TASK_PRIORITY_COLOR: Record<TaskPriority, string> = {
  low: '#7d6f62',
  medium: '#c98a4c',
  high: '#EA580C',
  urgent: '#DC2626',
};

function fromAgendaOccurrence(occ: CalendarOccurrence): UnifiedCalendarOccurrence {
  const ev = occ.event;
  const c = ev.color && /^#[0-9A-Fa-f]{6}$/.test(ev.color) ? ev.color : '#a8a2ff';
  return {
    kind: 'agenda',
    occurrenceKey: occ.occurrenceKey,
    title: ev.title,
    startAt: occ.startAt,
    endAt: occ.endAt,
    allDay: ev.all_day,
    color: c,
    calendarEvent: ev,
  };
}

function expandProjects(projects: Project[], rangeStart: Date, rangeEnd: Date): UnifiedCalendarOccurrence[] {
  const rs = startOfDay(rangeStart);
  const re = endOfDay(rangeEnd);
  const out: UnifiedCalendarOccurrence[] = [];

  for (const p of projects) {
    const hasStart = Boolean(p.start_date);
    const hasEnd = Boolean(p.end_date);
    if (!hasStart && !hasEnd) continue;

    if (hasStart && hasEnd) {
      let s = startOfDay(parseISODateOnly(p.start_date!));
      let e = startOfDay(parseISODateOnly(p.end_date!));
      if (e < s) [s, e] = [e, s];
      const spanEnd = endOfDay(e);
      if (!overlapsRange(s, spanEnd, rs, re)) continue;
      out.push({
        kind: 'project',
        occurrenceKey: `project-range-${p.id}`,
        title: p.name,
        startAt: s,
        endAt: e,
        allDay: true,
        color: '#af7037',
        navigate: { page: 'project-detail', id: p.id },
      });
    } else if (hasStart) {
      const s = startOfDay(parseISODateOnly(p.start_date!));
      if (!overlapsRange(s, endOfDay(s), rs, re)) continue;
      out.push({
        kind: 'project',
        occurrenceKey: `project-start-${p.id}`,
        title: `Début · ${p.name}`,
        startAt: s,
        endAt: s,
        allDay: true,
        color: '#8b572a',
        navigate: { page: 'project-detail', id: p.id },
      });
    } else if (hasEnd) {
      const e = startOfDay(parseISODateOnly(p.end_date!));
      if (!overlapsRange(e, endOfDay(e), rs, re)) continue;
      out.push({
        kind: 'project',
        occurrenceKey: `project-end-${p.id}`,
        title: `Échéance · ${p.name}`,
        startAt: e,
        endAt: e,
        allDay: true,
        color: '#c98a4c',
        navigate: { page: 'project-detail', id: p.id },
      });
    }
  }
  return out;
}

function expandTasks(tasks: Task[], rangeStart: Date, rangeEnd: Date): UnifiedCalendarOccurrence[] {
  const rs = startOfDay(rangeStart);
  const re = endOfDay(rangeEnd);
  const out: UnifiedCalendarOccurrence[] = [];
  for (const t of tasks) {
    if (!t.due_date) continue;
    const d = startOfDay(parseISODateOnly(t.due_date));
    if (!overlapsRange(d, endOfDay(d), rs, re)) continue;
    out.push({
      kind: 'task',
      occurrenceKey: `task-${t.id}`,
      title: t.title,
      startAt: d,
      endAt: d,
      allDay: true,
      color: TASK_PRIORITY_COLOR[t.priority] || TASK_PRIORITY_COLOR.medium,
      navigate: { page: 'tasks' },
    });
  }
  return out;
}

function expandClients(clients: Client[], rangeStart: Date, rangeEnd: Date): UnifiedCalendarOccurrence[] {
  const rs = startOfDay(rangeStart);
  const re = endOfDay(rangeEnd);
  const out: UnifiedCalendarOccurrence[] = [];
  for (const c of clients) {
    const d = startOfDay(new Date(c.created_at));
    if (!overlapsRange(d, endOfDay(d), rs, re)) continue;
    out.push({
      kind: 'client',
      occurrenceKey: `client-${c.id}`,
      title: `Client · ${c.name}`,
      startAt: d,
      endAt: d,
      allDay: true,
      color: c.avatar_color && /^#[0-9A-Fa-f]{6}$/i.test(c.avatar_color) ? c.avatar_color : '#059669',
      navigate: { page: 'client-detail', id: c.id },
    });
  }
  return out;
}

function expandInteractions(
  interactions: Interaction[],
  rangeStart: Date,
  rangeEnd: Date
): UnifiedCalendarOccurrence[] {
  const rs = startOfDay(rangeStart);
  const re = endOfDay(rangeEnd);
  const out: UnifiedCalendarOccurrence[] = [];
  for (const i of interactions) {
    const at = new Date(i.date);
    if (Number.isNaN(at.getTime())) continue;
    const dayS = startOfDay(at);
    const dayE = endOfDay(at);
    if (!overlapsRange(dayS, dayE, rs, re)) continue;
    const label = INTERACTION_LABEL[i.type] || i.type;
    out.push({
      kind: 'interaction',
      occurrenceKey: `interaction-${i.id}`,
      title: `${label} · ${truncate(i.description, 36)}`,
      startAt: at,
      endAt: null,
      allDay: false,
      color: '#0891B2',
      navigate: { page: 'client-detail', id: i.client_id },
    });
  }
  return out;
}

function expandInvoices(invoices: Invoice[], rangeStart: Date, rangeEnd: Date): UnifiedCalendarOccurrence[] {
  const rs = startOfDay(rangeStart);
  const re = endOfDay(rangeEnd);
  const out: UnifiedCalendarOccurrence[] = [];
  for (const inv of invoices) {
    if (inv.due_date) {
      const d = startOfDay(parseISODateOnly(inv.due_date));
      if (overlapsRange(d, endOfDay(d), rs, re)) {
        const num = inv.invoice_number || 'Sans n°';
        out.push({
          kind: 'invoice_due',
          occurrenceKey: `invoice-due-${inv.id}`,
          title: `Facture échéance · ${num}`,
          startAt: d,
          endAt: d,
          allDay: true,
          color: inv.status === 'overdue' ? '#e85d5d' : '#d4a574',
          navigate: { page: 'invoices' },
        });
      }
    }
    if (inv.paid_date) {
      const d = startOfDay(parseISODateOnly(inv.paid_date));
      if (overlapsRange(d, endOfDay(d), rs, re)) {
        const num = inv.invoice_number || 'Sans n°';
        out.push({
          kind: 'invoice_paid',
          occurrenceKey: `invoice-paid-${inv.id}`,
          title: `Paiement · ${num}`,
          startAt: d,
          endAt: d,
          allDay: true,
          color: '#059669',
          navigate: { page: 'invoices' },
        });
      }
    }
  }
  return out;
}

export function buildUnifiedCalendarOccurrences(
  rangeStart: Date,
  rangeEnd: Date,
  input: {
    events: CalendarEvent[];
    projects: Project[];
    tasks: Task[];
    clients: Client[];
    interactions: Interaction[];
    invoices: Invoice[];
  }
): UnifiedCalendarOccurrence[] {
  const agenda = expandCalendarEvents(input.events, rangeStart, rangeEnd).map(fromAgendaOccurrence);
  const merged = [
    ...agenda,
    ...expandProjects(input.projects, rangeStart, rangeEnd),
    ...expandTasks(input.tasks, rangeStart, rangeEnd),
    ...expandClients(input.clients, rangeStart, rangeEnd),
    ...expandInteractions(input.interactions, rangeStart, rangeEnd),
    ...expandInvoices(input.invoices, rangeStart, rangeEnd),
  ];
  return merged.sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
}

/** Regroupe les occurrences par jour (clé YYYY-MM-DD locale). */
export function bucketUnifiedByDay(
  occurrences: UnifiedCalendarOccurrence[]
): Map<string, UnifiedCalendarOccurrence[]> {
  const map = new Map<string, UnifiedCalendarOccurrence[]>();
  for (const occ of occurrences) {
    const start = startOfDay(occ.startAt);
    const endDay = occ.endAt ? startOfDay(occ.endAt) : start;
    for (let x = new Date(start); x.getTime() <= endDay.getTime(); x = addDays(x, 1)) {
      const k = dayKeyCal(x);
      const list = map.get(k) ?? [];
      if (!list.some((o) => o.occurrenceKey === occ.occurrenceKey)) list.push(occ);
      map.set(k, list);
    }
  }
  for (const [, list] of map) {
    list.sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
  }
  return map;
}
