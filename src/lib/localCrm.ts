import type { Client, Project, Task, Interaction, Invoice } from './types';
import { generateInvoiceNumber } from './utils';

const STORAGE_KEY = 'mapa-crm-v1';

interface CRMData {
  clients: Client[];
  projects: Project[];
  tasks: Task[];
  interactions: Interaction[];
  invoices: Invoice[];
}

const empty = (): CRMData => ({
  clients: [],
  projects: [],
  tasks: [],
  interactions: [],
  invoices: [],
});

function load(): CRMData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return empty();
    const p = JSON.parse(raw) as CRMData;
    return {
      clients: Array.isArray(p.clients) ? p.clients : [],
      projects: Array.isArray(p.projects) ? p.projects : [],
      tasks: Array.isArray(p.tasks) ? p.tasks : [],
      interactions: Array.isArray(p.interactions) ? p.interactions : [],
      invoices: Array.isArray(p.invoices) ? p.invoices : [],
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

function hydrateInvoice(data: CRMData, inv: Invoice): Invoice {
  const c = clientById(data, inv.client_id);
  const proj = inv.project_id ? data.projects.find((x) => x.id === inv.project_id) : undefined;
  return {
    ...inv,
    client: c
      ? { id: c.id, name: c.name, company: c.company, avatar_color: c.avatar_color }
      : undefined,
    project: proj ? { id: proj.id, name: proj.name } : undefined,
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

export function localDeleteProject(id: string): void {
  const data = load();
  data.projects = data.projects.filter((p) => p.id !== id);
  data.tasks = data.tasks.map((t) =>
    t.project_id === id ? { ...t, project_id: null, updated_at: now() } : t
  );
  data.invoices = data.invoices.map((inv) =>
    inv.project_id === id ? { ...inv, project_id: null, updated_at: now() } : inv
  );
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
