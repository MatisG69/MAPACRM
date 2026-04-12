import type {
  Client,
  Project,
  Task,
  Interaction,
  Invoice,
  CalendarEvent,
  Opportunity,
  Quote,
  ProjectChecklistItem,
} from './types';
import { generateInvoiceNumber } from './utils';

const STORAGE_KEY = 'mapa-crm-v1';

interface CRMData {
  clients: Client[];
  projects: Project[];
  tasks: Task[];
  interactions: Interaction[];
  invoices: Invoice[];
  calendar_events: CalendarEvent[];
  opportunities: Opportunity[];
  quotes: Quote[];
  checklist_items: ProjectChecklistItem[];
}

const empty = (): CRMData => ({
  clients: [],
  projects: [],
  tasks: [],
  interactions: [],
  invoices: [],
  calendar_events: [],
  opportunities: [],
  quotes: [],
  checklist_items: [],
});

function load(): CRMData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return empty();
    const p = JSON.parse(raw) as CRMData;
    return {
      clients: Array.isArray(p.clients) ? p.clients : [],
      projects: Array.isArray(p.projects)
        ? p.projects.map((proj) => ({
            ...proj,
            site_url: (proj as Project).site_url ?? null,
          }))
        : [],
      tasks: Array.isArray(p.tasks) ? p.tasks : [],
      interactions: Array.isArray(p.interactions) ? p.interactions : [],
      invoices: Array.isArray(p.invoices)
        ? p.invoices.map((inv) => ({
            ...inv,
            source_quote_id: (inv as Invoice).source_quote_id ?? null,
          }))
        : [],
      calendar_events: Array.isArray(p.calendar_events) ? p.calendar_events : [],
      opportunities: Array.isArray((p as CRMData).opportunities) ? (p as CRMData).opportunities : [],
      quotes: Array.isArray((p as CRMData).quotes) ? (p as CRMData).quotes : [],
      checklist_items: Array.isArray((p as CRMData).checklist_items) ? (p as CRMData).checklist_items : [],
    };
  } catch {
    return empty();
  }
}

function save(data: CRMData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

const now = () => new Date().toISOString();
const newId = () => crypto.randomUUID();

function clientById(data: CRMData, id: string | null): Client | undefined {
  if (!id) return undefined;
  return data.clients.find((c) => c.id === id);
}

function projectSlice(data: CRMData, id: string | null): Pick<Project, 'id' | 'name'> | undefined {
  if (!id) return undefined;
  const p = data.projects.find((x) => x.id === id);
  return p ? { id: p.id, name: p.name } : undefined;
}

function hydrateProject(data: CRMData, p: Project): Project {
  const c = clientById(data, p.client_id);
  return { ...p, client: c };
}

function hydrateTask(data: CRMData, t: Task): Task {
  const proj = projectSlice(data, t.project_id);
  return { ...t, project: proj };
}

function hydrateInteraction(data: CRMData, i: Interaction): Interaction {
  const c = clientById(data, i.client_id);
  if (!c) return { ...i };
  return {
    ...i,
    client: { id: c.id, name: c.name, avatar_color: c.avatar_color },
  };
}

function hydrateCalendarEvent(data: CRMData, row: CalendarEvent): CalendarEvent {
  const c = clientById(data, row.client_id);
  const proj = projectSlice(data, row.project_id);
  return {
    ...row,
    client: c ? { id: c.id, name: c.name, avatar_color: c.avatar_color } : undefined,
    project: proj,
  };
}

function hydrateInvoice(data: CRMData, inv: Invoice): Invoice {
  const c = clientById(data, inv.client_id);
  const proj = inv.project_id ? data.projects.find((x) => x.id === inv.project_id) : undefined;
  return {
    ...inv,
    source_quote_id: inv.source_quote_id ?? null,
    client: c
      ? { id: c.id, name: c.name, company: c.company, avatar_color: c.avatar_color }
      : undefined,
    project: proj ? { id: proj.id, name: proj.name } : undefined,
  };
}

function opportunitySlice(data: CRMData, id: string | null): Pick<Opportunity, 'id' | 'name'> | undefined {
  if (!id) return undefined;
  const o = data.opportunities.find((x) => x.id === id);
  return o ? { id: o.id, name: o.name } : undefined;
}

function hydrateOpportunity(data: CRMData, row: Opportunity): Opportunity {
  const c = clientById(data, row.client_id);
  const proj = projectSlice(data, row.project_id);
  return {
    ...row,
    client: c ? { id: c.id, name: c.name, avatar_color: c.avatar_color } : undefined,
    project: proj,
  };
}

function hydrateQuote(data: CRMData, row: Quote): Quote {
  const c = clientById(data, row.client_id);
  const proj = projectSlice(data, row.project_id);
  const opp = opportunitySlice(data, row.opportunity_id);
  return {
    ...row,
    deposit_requested: Boolean(row.deposit_requested),
    version: row.version ?? 1,
    client: c
      ? { id: c.id, name: c.name, company: c.company, avatar_color: c.avatar_color }
      : undefined,
    project: proj,
    opportunity: opp,
  };
}

export function localListClients(): Client[] {
  const data = load();
  return [...data.clients].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

export function localCreateClient(
  values: Omit<Client, 'id' | 'created_at' | 'updated_at'>
): Client {
  const data = load();
  const row: Client = { ...values, id: newId(), created_at: now(), updated_at: now() };
  data.clients.unshift(row);
  save(data);
  return row;
}

export function localUpdateClient(id: string, values: Partial<Client>): Client {
  const data = load();
  const idx = data.clients.findIndex((c) => c.id === id);
  if (idx < 0) throw new Error('Client introuvable');
  const merged = { ...data.clients[idx], ...values, updated_at: now() };
  data.clients[idx] = merged;
  save(data);
  return merged;
}

export function localDeleteClient(id: string): void {
  const data = load();
  data.clients = data.clients.filter((c) => c.id !== id);
  data.projects = data.projects.map((p) =>
    p.client_id === id ? { ...p, client_id: null, updated_at: now() } : p
  );
  data.invoices = data.invoices.map((inv) =>
    inv.client_id === id ? { ...inv, client_id: null, updated_at: now() } : inv
  );
  data.interactions = data.interactions.filter((i) => i.client_id !== id);
  data.calendar_events = data.calendar_events.map((ev) =>
    ev.client_id === id ? { ...ev, client_id: null, updated_at: now() } : ev
  );
  data.opportunities = data.opportunities.filter((o) => o.client_id !== id);
  data.quotes = data.quotes.filter((q) => q.client_id !== id);
  save(data);
}

export function localListProjects(clientId?: string): Project[] {
  const data = load();
  let list = data.projects;
  if (clientId) list = list.filter((p) => p.client_id === clientId);
  return list
    .map((p) => hydrateProject(data, p))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export function localCreateProject(
  values: Omit<Project, 'id' | 'created_at' | 'updated_at' | 'client'>
): Project {
  const data = load();
  const row: Project = {
    ...values,
    id: newId(),
    created_at: now(),
    updated_at: now(),
  };
  data.projects.unshift(row);
  save(data);
  return hydrateProject(load(), row);
}

export function localUpdateProject(id: string, values: Partial<Project>): Project {
  const data = load();
  const idx = data.projects.findIndex((p) => p.id === id);
  if (idx < 0) throw new Error('Projet introuvable');
  const { client: _c, ...rest } = values as Partial<Project & { client?: unknown }>;
  const merged = { ...data.projects[idx], ...rest, updated_at: now() };
  data.projects[idx] = merged;
  save(data);
  return hydrateProject(load(), merged);
}

/** Met à jour `progress` du projet selon le ratio tâches terminées / total (aucune action si 0 tâche). */
export function localSyncProjectProgressFromTasks(projectId: string): void {
  const data = load();
  const tasks = data.tasks.filter((t) => t.project_id === projectId);
  if (tasks.length === 0) return;
  const done = tasks.filter((t) => t.status === 'completed').length;
  const pct = Math.round((done / tasks.length) * 100);
  const idx = data.projects.findIndex((p) => p.id === projectId);
  if (idx < 0) return;
  if (data.projects[idx].progress === pct) return;
  data.projects[idx] = { ...data.projects[idx], progress: pct, updated_at: now() };
  save(data);
}

export function localDeleteProject(id: string): void {
  const data = load();
  data.projects = data.projects.filter((p) => p.id !== id);
  data.tasks = data.tasks.map((t) =>
    t.project_id === id ? { ...t, project_id: null, updated_at: now() } : t
  );
  data.invoices = data.invoices.map((inv) =>
    inv.project_id === id ? { ...inv, project_id: null, updated_at: now() } : inv
  );
  data.calendar_events = data.calendar_events.map((ev) =>
    ev.project_id === id ? { ...ev, project_id: null, updated_at: now() } : ev
  );
  data.checklist_items = data.checklist_items.filter((c) => c.project_id !== id);
  data.opportunities = data.opportunities.map((o) =>
    o.project_id === id ? { ...o, project_id: null, updated_at: now() } : o
  );
  data.quotes = data.quotes.map((q) =>
    q.project_id === id ? { ...q, project_id: null, updated_at: now() } : q
  );
  save(data);
}

export function localListCalendarEvents(): CalendarEvent[] {
  const data = load();
  return [...data.calendar_events]
    .map((e) => hydrateCalendarEvent(data, e))
    .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime());
}

export function localCreateCalendarEvent(
  values: Omit<CalendarEvent, 'id' | 'created_at' | 'updated_at' | 'client' | 'project'>
): CalendarEvent {
  const data = load();
  const row: CalendarEvent = {
    ...values,
    id: newId(),
    created_at: now(),
    updated_at: now(),
  };
  data.calendar_events.push(row);
  save(data);
  return hydrateCalendarEvent(load(), row);
}

export function localUpdateCalendarEvent(id: string, values: Partial<CalendarEvent>): CalendarEvent {
  const data = load();
  const idx = data.calendar_events.findIndex((e) => e.id === id);
  if (idx < 0) throw new Error('Événement introuvable');
  const { client: _c, project: _p, ...rest } = values as Partial<
    CalendarEvent & { client?: unknown; project?: unknown }
  >;
  const merged = { ...data.calendar_events[idx], ...rest, updated_at: now() };
  data.calendar_events[idx] = merged;
  save(data);
  return hydrateCalendarEvent(load(), merged);
}

export function localDeleteCalendarEvent(id: string): void {
  const data = load();
  data.calendar_events = data.calendar_events.filter((e) => e.id !== id);
  save(data);
}

export function localListTasks(projectId?: string): Task[] {
  const data = load();
  let list = data.tasks;
  if (projectId) list = list.filter((t) => t.project_id === projectId);
  return list
    .map((t) => hydrateTask(data, t))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export function localCreateTask(
  values: Omit<Task, 'id' | 'created_at' | 'updated_at' | 'project'>
): Task {
  const data = load();
  const row: Task = {
    ...values,
    id: newId(),
    created_at: now(),
    updated_at: now(),
  };
  data.tasks.unshift(row);
  save(data);
  return hydrateTask(load(), row);
}

export function localUpdateTask(id: string, values: Partial<Task>): Task {
  const data = load();
  const idx = data.tasks.findIndex((t) => t.id === id);
  if (idx < 0) throw new Error('Tâche introuvable');
  const { project: _p, ...rest } = values as Partial<Task & { project?: unknown }>;
  const merged = { ...data.tasks[idx], ...rest, updated_at: now() };
  data.tasks[idx] = merged;
  save(data);
  return hydrateTask(load(), merged);
}

export function localDeleteTask(id: string): void {
  const data = load();
  data.tasks = data.tasks.filter((t) => t.id !== id);
  save(data);
}

function normalizeInteractionDate(d: string): string {
  if (!d) return now();
  if (d.length === 16 && d.includes('T')) return new Date(d).toISOString();
  return d;
}

export function localListInteractions(clientId?: string): Interaction[] {
  const data = load();
  let list = data.interactions;
  if (clientId) list = list.filter((i) => i.client_id === clientId);
  return list
    .map((i) => hydrateInteraction(data, i))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function localCreateInteraction(
  values: Omit<Interaction, 'id' | 'created_at' | 'client'>
): Interaction {
  const data = load();
  const row: Interaction = {
    ...values,
    date: normalizeInteractionDate(values.date),
    id: newId(),
    created_at: now(),
  };
  data.interactions.unshift(row);
  save(data);
  return hydrateInteraction(load(), row);
}

export function localDeleteInteraction(id: string): void {
  const data = load();
  data.interactions = data.interactions.filter((i) => i.id !== id);
  save(data);
}

export function localListInvoices(clientId?: string): Invoice[] {
  const data = load();
  let list = data.invoices;
  if (clientId) list = list.filter((i) => i.client_id === clientId);
  return list
    .map((inv) => hydrateInvoice(data, inv))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export function localCreateInvoice(
  values: Omit<Invoice, 'id' | 'created_at' | 'updated_at' | 'client' | 'project'>
): Invoice {
  const data = load();
  const row: Invoice = {
    ...values,
    source_quote_id: values.source_quote_id ?? null,
    invoice_number: values.invoice_number || generateInvoiceNumber(),
    id: newId(),
    created_at: now(),
    updated_at: now(),
  };
  data.invoices.unshift(row);
  save(data);
  return hydrateInvoice(load(), row);
}

export function localUpdateInvoice(id: string, values: Partial<Invoice>): Invoice {
  const data = load();
  const idx = data.invoices.findIndex((i) => i.id === id);
  if (idx < 0) throw new Error('Facture introuvable');
  const { client: _c, project: _p, ...rest } = values as Partial<
    Invoice & { client?: unknown; project?: unknown }
  >;
  const merged = { ...data.invoices[idx], ...rest, updated_at: now() };
  data.invoices[idx] = merged;
  save(data);
  return hydrateInvoice(load(), merged);
}

export function localDeleteInvoice(id: string): void {
  const data = load();
  data.invoices = data.invoices.filter((i) => i.id !== id);
  save(data);
}

export function localListOpportunities(): Opportunity[] {
  const data = load();
  return [...data.opportunities]
    .map((o) => hydrateOpportunity(data, o))
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
}

export function localCreateOpportunity(
  values: Omit<Opportunity, 'id' | 'created_at' | 'updated_at' | 'client' | 'project'>
): Opportunity {
  const data = load();
  const row: Opportunity = {
    ...values,
    project_id: values.project_id ?? null,
    estimated_amount: values.estimated_amount ?? null,
    expected_close_date: values.expected_close_date ?? null,
    lost_reason: values.lost_reason ?? null,
    notes: values.notes ?? null,
    probability: Math.min(100, Math.max(0, values.probability)),
    id: newId(),
    created_at: now(),
    updated_at: now(),
  };
  data.opportunities.unshift(row);
  save(data);
  return hydrateOpportunity(load(), row);
}

export function localUpdateOpportunity(id: string, values: Partial<Opportunity>): Opportunity {
  const data = load();
  const idx = data.opportunities.findIndex((o) => o.id === id);
  if (idx < 0) throw new Error('Opportunité introuvable');
  const { client: _c, project: _p, ...rest } = values as Partial<Opportunity & { client?: unknown; project?: unknown }>;
  const merged = {
    ...data.opportunities[idx],
    ...rest,
    updated_at: now(),
  };
  if (typeof merged.probability === 'number') {
    merged.probability = Math.min(100, Math.max(0, merged.probability));
  }
  data.opportunities[idx] = merged;
  save(data);
  return hydrateOpportunity(load(), merged);
}

export function localDeleteOpportunity(id: string): void {
  const data = load();
  data.opportunities = data.opportunities.filter((o) => o.id !== id);
  data.quotes = data.quotes.map((q) =>
    q.opportunity_id === id ? { ...q, opportunity_id: null, updated_at: now() } : q
  );
  save(data);
}

export function localListQuotes(clientId?: string): Quote[] {
  const data = load();
  let list = data.quotes;
  if (clientId) list = list.filter((q) => q.client_id === clientId);
  return list
    .map((q) => hydrateQuote(data, q))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export function localCreateQuote(
  values: Omit<Quote, 'id' | 'created_at' | 'updated_at' | 'client' | 'project' | 'opportunity'>
): Quote {
  const data = load();
  const row: Quote = {
    ...values,
    project_id: values.project_id ?? null,
    opportunity_id: values.opportunity_id ?? null,
    quote_number: values.quote_number ?? null,
    valid_until: values.valid_until ?? null,
    deposit_amount: values.deposit_amount ?? null,
    parent_quote_id: values.parent_quote_id ?? null,
    notes: values.notes ?? null,
    signed_at: values.signed_at ?? null,
    version: values.version ?? 1,
    deposit_requested: Boolean(values.deposit_requested),
    id: newId(),
    created_at: now(),
    updated_at: now(),
  };
  data.quotes.unshift(row);
  save(data);
  return hydrateQuote(load(), row);
}

export function localUpdateQuote(id: string, values: Partial<Quote>): Quote {
  const data = load();
  const idx = data.quotes.findIndex((q) => q.id === id);
  if (idx < 0) throw new Error('Devis introuvable');
  const { client: _c, project: _p, opportunity: _o, ...rest } = values as Partial<
    Quote & { client?: unknown; project?: unknown; opportunity?: unknown }
  >;
  const merged = { ...data.quotes[idx], ...rest, updated_at: now() };
  data.quotes[idx] = merged;
  save(data);
  return hydrateQuote(load(), merged);
}

export function localDeleteQuote(id: string): void {
  const data = load();
  data.quotes = data.quotes.filter((q) => q.id !== id);
  data.invoices = data.invoices.map((inv) =>
    inv.source_quote_id === id ? { ...inv, source_quote_id: null, updated_at: now() } : inv
  );
  save(data);
}

export function localListChecklistItems(projectId?: string): ProjectChecklistItem[] {
  const data = load();
  let list = data.checklist_items;
  if (projectId) list = list.filter((c) => c.project_id === projectId);
  return [...list].sort((a, b) => a.position - b.position || a.label.localeCompare(b.label));
}

export function localBulkCreateChecklistItems(projectId: string, labels: string[]): void {
  if (labels.length === 0) return;
  const data = load();
  let pos =
    data.checklist_items.filter((c) => c.project_id === projectId).reduce((m, c) => Math.max(m, c.position), -1) + 1;
  for (const label of labels) {
    const row: ProjectChecklistItem = {
      id: newId(),
      project_id: projectId,
      label,
      done: false,
      position: pos++,
      created_at: now(),
      updated_at: now(),
    };
    data.checklist_items.push(row);
  }
  save(data);
}

export function localUpdateChecklistItem(id: string, values: Partial<ProjectChecklistItem>): ProjectChecklistItem {
  const data = load();
  const idx = data.checklist_items.findIndex((c) => c.id === id);
  if (idx < 0) throw new Error('Élément checklist introuvable');
  const merged = { ...data.checklist_items[idx], ...values, updated_at: now() };
  data.checklist_items[idx] = merged;
  save(data);
  return merged;
}
