export type ClientStatus = 'prospect' | 'active' | 'inactive';
export type ProjectStatus = 'planning' | 'in_progress' | 'review' | 'completed' | 'on_hold';
export type ProjectType = 'website' | 'ecommerce' | 'webapp' | 'redesign' | 'maintenance' | 'seo' | 'other';
export type TaskStatus = 'todo' | 'in_progress' | 'completed';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type InteractionType = 'call' | 'email' | 'meeting' | 'note' | 'demo';
export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';

export interface Client {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  address: string | null;
  city: string | null;
  website: string | null;
  status: ClientStatus;
  source: string | null;
  notes: string | null;
  avatar_color: string;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  client_id: string | null;
  name: string;
  description: string | null;
  status: ProjectStatus;
  budget: number | null;
  start_date: string | null;
  end_date: string | null;
  progress: number;
  type: ProjectType | null;
  created_at: string;
  updated_at: string;
  client?: Client;
}

export interface Task {
  id: string;
  project_id: string | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  created_at: string;
  updated_at: string;
  project?: Pick<Project, 'id' | 'name'>;
}

export interface Interaction {
  id: string;
  client_id: string;
  type: InteractionType;
  description: string;
  date: string;
  created_at: string;
  client?: Pick<Client, 'id' | 'name' | 'avatar_color'>;
}

export interface Invoice {
  id: string;
  project_id: string | null;
  client_id: string | null;
  invoice_number: string | null;
  amount: number;
  status: InvoiceStatus;
  due_date: string | null;
  paid_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  client?: Pick<Client, 'id' | 'name' | 'company' | 'avatar_color'>;
  project?: Pick<Project, 'id' | 'name'>;
}

export type Page =
  | 'dashboard'
  | 'clients'
  | 'client-detail'
  | 'projects'
  | 'project-detail'
  | 'tasks'
  | 'analytics'
  | 'invoices';
