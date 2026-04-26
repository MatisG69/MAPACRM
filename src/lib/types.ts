export type WebsiteStatus =
  | 'no_website'
  | 'broken_website'
  | 'social_only'
  | 'directory_only'
  | 'outdated_website'
  | 'low_visibility'
  | 'website_ok';

export type ClientStatus =
  | 'prospect'
  | 'telephoned'
  /** Contacté — clé distincte du stade pipeline `contacted` */
  | 'in_discussion'
  | 'interested'
  | 'not_interested';
export type ProjectStatus = 'planning' | 'quote_sent' | 'in_progress' | 'review' | 'completed' | 'on_hold';
export type ProjectType = 'website' | 'ecommerce' | 'webapp' | 'redesign' | 'maintenance' | 'seo' | 'automation' | 'other';
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
  /** Note de satisfaction client (1–5), optionnelle */
  satisfaction_rating: number | null;
  /** Témoignage, retour ou citation client */
  feedback: string | null;
  /** Secteur d'activité ou métier du client — ex: Restaurant, Charpentier */
  profession: string | null;
  /** Forme juridique — SAS, SARL, EI, EURL, association, etc. */
  legal_form: string | null;
  /** N° SIRET (14 chiffres) */
  siret: string | null;
  /** N° TVA intracommunautaire — ex. FR12345678901 */
  vat_number: string | null;
  /** Fonction du décisionnaire — ex. Gérant, DG, Responsable communication */
  contact_role: string | null;
  avatar_color: string;
  /** Champs enrichissement scraping — optionnels, définis uniquement pour les leads importés via Apify */
  is_scraped?: boolean;
  source_platform?: string | null;
  source_url?: string | null;
  website_raw?: string | null;
  website_status?: WebsiteStatus | null;
  digital_score?: number | null;
  scraped_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  client_id: string | null;
  name: string;
  description: string | null;
  /** URL du site livré ou en cours (aperçu visuel sur la carte) */
  site_url: string | null;
  status: ProjectStatus;
  budget: number | null;
  start_date: string | null;
  end_date: string | null;
  progress: number;
  type: ProjectType | null;
  /** Le projet inclut un suivi mensuel après-vente (récurrent) */
  has_recurring_support?: boolean;
  /** Montant mensuel HT du suivi en euros */
  recurring_support_amount?: number | null;
  /** Libellé du suivi (ex. "SEO + statistiques", "Supervision automatisations") */
  recurring_support_label?: string | null;
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
  /** Devis d’origine après conversion devis → facture */
  source_quote_id: string | null;
  created_at: string;
  updated_at: string;
  client?: Pick<Client, 'id' | 'name' | 'company' | 'avatar_color'>;
  project?: Pick<Project, 'id' | 'name'>;
}

export type CalendarRecurrence = 'none' | 'daily' | 'weekly' | 'monthly';

/** Événement agenda — tout est saisi par l’utilisateur (titres, types, récurrences). */
export interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  /** ISO 8601 */
  start_at: string;
  end_at: string | null;
  all_day: boolean;
  recurrence: CalendarRecurrence;
  /** Date limite de la série (ISO date), si récurrence */
  recurrence_until: string | null;
  client_id: string | null;
  project_id: string | null;
  /** Couleur d’affichage (#hex), optionnelle */
  color: string | null;
  created_at: string;
  updated_at: string;
  client?: Pick<Client, 'id' | 'name' | 'avatar_color'>;
  project?: Pick<Project, 'id' | 'name'>;
}

/** Étapes du tunnel commercial MAPA */
export type DealStage =
  | 'lead_detected'
  | 'contacted'
  | 'meeting_scheduled'
  | 'quote_sent'
  | 'follow_up'
  | 'won'
  | 'lost';

export type LostReason =
  | 'too_expensive'
  | 'not_priority'
  | 'competitor'
  | 'no_budget'
  | 'ghosted'
  | 'other';

export interface Opportunity {
  id: string;
  client_id: string;
  project_id: string | null;
  name: string;
  stage: DealStage;
  probability: number;
  estimated_amount: number | null;
  expected_close_date: string | null;
  lost_reason: LostReason | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  client?: Pick<Client, 'id' | 'name' | 'avatar_color'>;
  project?: Pick<Project, 'id' | 'name'>;
}

export type QuoteStatus = 'draft' | 'sent' | 'signed' | 'refused' | 'expired';

export interface Quote {
  id: string;
  client_id: string;
  project_id: string | null;
  opportunity_id: string | null;
  title: string;
  quote_number: string | null;
  amount: number;
  status: QuoteStatus;
  valid_until: string | null;
  deposit_requested: boolean;
  deposit_amount: number | null;
  version: number;
  parent_quote_id: string | null;
  notes: string | null;
  signed_at: string | null;
  created_at: string;
  updated_at: string;
  client?: Pick<Client, 'id' | 'name' | 'company' | 'avatar_color'>;
  project?: Pick<Project, 'id' | 'name'>;
  opportunity?: Pick<Opportunity, 'id' | 'name'>;
}

export interface ProjectChecklistItem {
  id: string;
  project_id: string;
  label: string;
  done: boolean;
  position: number;
  created_at: string;
  updated_at: string;
}

export type Page =
  | 'dashboard'
  | 'clients'
  | 'client-detail'
  | 'projects'
  | 'project-detail'
  | 'tasks'
  | 'calendar'
  | 'analytics'
  | 'invoices'
  /** Pipeline opportunités (tunnel commercial) */
  | 'pipeline'
  /** Devis / propositions */
  | 'quotes'
  /** Suggestions de relance */
  | 'relances'
  /** Guide méthode & cadre MAPA (usage interne partenaires) */
  | 'playbook'
  /** Annuaire enrichi : coordonnées, satisfaction, historique d'échanges */
  | 'contacts'
  /** Demandes de prestation reçues depuis le site vitrine */
  | 'demandes'
  /** Analyse de trafic et performances du site vitrine */
  | 'analyse'
  /** Identifiants clients pour l'espace suivi projet */
  | 'identifiants';

export type ServiceRequestStatus = 'new' | 'read' | 'in_progress' | 'converted' | 'archived';

export interface ServiceRequest {
  id: string;
  name: string;
  email: string;
  company: string | null;
  project_type: string | null;
  message: string | null;
  status: ServiceRequestStatus;
  source: string | null;
  created_at: string;
  updated_at: string;
}

/* ─────────────────────────────────────────────
 * Espace client (portail suivi projet)
 * ───────────────────────────────────────────── */

export type ProjectStepStatus = 'pending' | 'in_progress' | 'done';

/** Identifiant client permettant l'accès au portail de suivi projet */
export interface PortalUser {
  id: string;
  auth_user_id: string | null;
  email: string;
  name: string | null;
  project_id: string | null;
  created_at: string;
  project?: Pick<Project, 'id' | 'name' | 'status'>;
}

/** Étape de suivi projet visible par le client */
export interface ProjectStep {
  id: string;
  project_id: string;
  order_index: number;
  title: string;
  description: string | null;
  status: ProjectStepStatus;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export type PortalMessageSender = 'client' | 'team';

/** Message échangé entre le client et l'équipe via l'espace client */
export interface PortalMessage {
  id: string;
  project_id: string;
  sender: PortalMessageSender;
  content: string;
  read_by_admin: boolean;
  read_by_client: boolean;
  created_at: string;
}
