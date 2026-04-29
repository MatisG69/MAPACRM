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
  /** Devis envoyé au client, en attente de signature */
  | 'quote_sent'
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
  /**
   * Prénom du contact — utilisé pour la convention typographique française
   * sur les devis et factures (prénom en cas mixte, NOM en majuscules).
   * Si null, le générateur retombe sur `name` avec heuristique « dernier mot ».
   */
  first_name: string | null;
  /**
   * Nom de famille du contact — affiché en MAJUSCULES sur les devis et factures.
   * Si null, le générateur retombe sur `name` avec heuristique « dernier mot ».
   */
  last_name: string | null;
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
  /** @deprecated Conservé pour rétrocompatibilité. Utiliser `recurring_support_scope` désormais. */
  recurring_support_label?: string | null;
  /**
   * Périmètre détaillé de la prestation de suivi mensuel (texte multi-ligne,
   * une ligne = un bullet point sur le devis abonnement).
   */
  recurring_support_scope?: string | null;
  /**
   * Titre custom du contrat de suivi (apparaît en titre du devis abonnement).
   * Si null, fallback sur « Contrat de suivi & maintenance ».
   */
  recurring_support_title?: string | null;
  /**
   * Description courte du contrat de suivi — affichée dans la table de
   * tarification du devis abonnement.
   */
  recurring_support_description?: string | null;
  /**
   * Périmètre de la prestation (texte multi-ligne, une ligne = un bullet point sur le devis).
   * Si null/vide → le générateur de devis utilise la liste catalogue par défaut selon le `type`.
   */
  prestation_scope?: string | null;
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
  /** Provenance : 'admin' = créé depuis le CRM, 'portal' = réservé depuis l'espace client. */
  booking_source?: 'admin' | 'portal' | null;
  /** Référence au portal_user qui a réservé (si booking_source = 'portal'). */
  portal_user_id?: string | null;
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
  /** Date prévue d'encaissement de l'acompte (ISO YYYY-MM-DD) — démarrage projet */
  expected_acompte_date: string | null;
  /** Date prévue de livraison (ISO YYYY-MM-DD) — émission facture de solde */
  expected_delivery_date: string | null;
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
  | 'identifiants'
  /** Calendrier personnel Matis synchronisé depuis Apple Calendar (ICS public) */
  | 'calendar-matis'
  /** Journal d'appels commerciaux (vue tableau) */
  | 'calls'
  /** Boîte de réception emails (sync IMAP Hostinger toutes les 5 min) */
  | 'emails';

/** Pièce jointe email serializable, dérivée de mailparser. */
export interface EmailAttachmentMeta {
  filename: string | null;
  contentType: string | null;
  size: number | null;
  contentId: string | null;
}

/** Email reçu sur la boîte Hostinger ou envoyé depuis le CRM. */
export interface Email {
  id: string;
  /** RFC 5322 Message-ID (unique en base). */
  message_id: string;
  from_email: string;
  from_name: string | null;
  to_email: string | null;
  subject: string | null;
  body_text: string | null;
  body_html: string | null;
  received_at: string;
  /** Auto-matché si l'expéditeur (inbound) ou le destinataire (outbound)
   *  correspond à un client connu. */
  client_id: string | null;
  read: boolean;
  archived: boolean;
  /** 'inbound' = reçu via IMAP · 'outbound' = envoyé depuis le CRM. */
  direction: 'inbound' | 'outbound';
  attachments: EmailAttachmentMeta[];
  created_at: string;
  client?: Pick<Client, 'id' | 'name' | 'avatar_color'> | null;
}

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
  /** Client lié — le portail affiche tous ses projets */
  client_id: string | null;
  /** @deprecated Conservé pour rétro-compatibilité. Utiliser client_id désormais. */
  project_id: string | null;
  created_at: string;
  client?: Pick<Client, 'id' | 'name' | 'company' | 'avatar_color'>;
  project?: Pick<Project, 'id' | 'name' | 'status'>;
}

/** Étape de suivi projet visible par le client */
export type ProjectPhase = 'analyse' | 'conception' | 'dev' | 'ajustements' | 'livraison';

export interface ProjectStep {
  id: string;
  project_id: string;
  order_index: number;
  title: string;
  description: string | null;
  status: ProjectStepStatus;
  started_at: string | null;
  completed_at: string | null;
  /** Phase macro pour grouper les étapes dans la timeline */
  phase?: ProjectPhase | null;
  /** Date prévue de début (frise prévisionnelle) */
  planned_start?: string | null;
  /** Date prévue de fin */
  planned_end?: string | null;
  /** Lien vers un livrable consultable par le client (staging, Figma, etc.) */
  deliverable_url?: string | null;
  /** Si true, l'étape requiert une validation explicite du client */
  requires_validation?: boolean;
  validated_at?: string | null;
  validated_signature?: string | null;
  validated_by_ip?: string | null;
  created_at: string;
  updated_at: string;
}

export type PortalMessageSender = 'client' | 'team';

export type ChangeRequestStatus =
  | 'submitted'
  | 'estimated'
  | 'approved'
  | 'rejected'
  | 'completed';
export type ChangeRequestUrgency = 'low' | 'normal' | 'high' | 'urgent';

export interface ChangeRequest {
  id: string;
  project_id: string;
  client_id: string;
  description: string;
  urgency: ChangeRequestUrgency;
  estimated_days: number | null;
  estimated_amount: number | null;
  status: ChangeRequestStatus;
  submitted_by_signature: string | null;
  submitted_at: string;
  approved_by_signature: string | null;
  approved_at: string | null;
  approved_by_ip: string | null;
  rejection_reason: string | null;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

export type MeetingKind = 'visio' | 'physique' | 'telephone' | 'autre';

export interface MeetingNote {
  id: string;
  project_id: string;
  client_id: string;
  meeting_date: string;
  meeting_duration_minutes: number | null;
  meeting_attendees: string | null;
  meeting_kind: MeetingKind;
  title: string;
  decisions: string | null;
  actions: string | null;
  next_steps: string | null;
  validated_at: string | null;
  validated_by_signature: string | null;
  validated_by_ip: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Notification in-app. `target_user_id` NULL = destinée à l'admin CRM,
 * sinon destinée à un client du portail.
 */
export interface Notification {
  id: string;
  target_user_id: string | null;
  kind: string;
  title: string;
  message: string | null;
  link_path: string | null;
  read_at: string | null;
  created_at: string;
}

/**
 * Brief & spécifications d'un projet (1:1 avec `projects`).
 * Visible par le client via le portail. Le client peut signer numériquement
 * pour valider le périmètre — protection juridique anti-litige scope.
 */
export interface ProjectBrief {
  id: string;
  project_id: string;
  /** Objectifs business (texte multi-ligne) */
  objectives: string | null;
  /** Périmètre inclus (texte multi-ligne, 1 ligne = 1 puce) */
  scope_in: string | null;
  /** Hors périmètre explicite (texte multi-ligne) */
  scope_out: string | null;
  /** Contraintes techniques, légales, calendrier */
  constraints: string | null;
  /** Livrables attendus */
  deliverables: string | null;
  /** Lien vers maquettes Figma (URL ou embed) */
  figma_url: string | null;
  /** Notes libres */
  notes: string | null;
  /** Timestamp de validation client */
  validated_at: string | null;
  /** IP du client au moment de la validation */
  validated_by_ip: string | null;
  /** Signature texte du client (nom complet tapé) */
  validated_signature: string | null;
  created_at: string;
  updated_at: string;
}

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

/** Catégories de documents arbitraires partagés au client via le portail */
export type ClientDocumentCategory =
  | 'contrat'
  | 'livrable'
  | 'compte-rendu'
  | 'charte'
  | 'autre';

/**
 * Document arbitraire uploadé par l'admin pour un client (visible côté portail).
 * Stockage : bucket Supabase `client-documents`. RLS scope par `client_id`.
 */
export type RequestStatus = 'requested' | 'received' | 'validated' | 'rejected';
export type RequestPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface ClientDocument {
  id: string;
  client_id: string;
  project_id: string | null;
  category: ClientDocumentCategory;
  name: string;
  description: string | null;
  /** Null si c'est une demande pas encore remplie par le client. */
  file_path: string | null;
  mime_type: string | null;
  file_size: number | null;
  uploaded_by: string | null;
  /** true → l'admin attend un fichier du client (ressource demandée). */
  is_request: boolean;
  request_status: RequestStatus | null;
  request_due_date: string | null;
  request_priority: RequestPriority;
  request_admin_notes: string | null;
  received_at: string | null;
  validated_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Call — ligne de journal d'appel commercial.
 * Les coordonnées (téléphone, email, site web) NE sont PAS stockées ici :
 * elles sont lues à la volée depuis la fiche `clients` via la jointure.
 */
export interface Call {
  id: string;
  client_id: string;
  /** Appel passé oui/non */
  called: boolean;
  /** Timestamp de l'appel (auto-rempli côté UI quand `called` passe à true) */
  called_at: string | null;
  /** Intéressé : null tant que non évalué */
  interested: boolean | null;
  /** Notes libres */
  notes: string | null;
  created_at: string;
  updated_at: string;
  /** Relation jointe (lecture seule) — auto-fill UI */
  client?: {
    id: string;
    name: string;
    company: string | null;
    email: string | null;
    phone: string | null;
    website: string | null;
    avatar_color?: string;
  } | null;
}

/* ─── Sprint 7 : Témoignages, NDA, Suggestions ─── */

export interface Testimonial {
  id: string;
  project_id: string;
  client_id: string;
  rating: number;
  content: string;
  author_signature: string;
  author_role: string | null;
  allow_public: boolean;
  allow_logo: boolean;
  approved: boolean;
  approved_at: string | null;
  rejection_reason: string | null;
  signed_at: string;
  signed_by_ip: string | null;
  created_at: string;
  updated_at: string;
}

export type NdaStatus = 'draft' | 'sent' | 'signed' | 'expired' | 'cancelled';

export interface NdaAgreement {
  id: string;
  project_id: string;
  client_id: string;
  title: string;
  content: string;
  expires_at: string | null;
  signed_at: string | null;
  signed_by_signature: string | null;
  signed_by_ip: string | null;
  status: NdaStatus;
  created_at: string;
  updated_at: string;
}

export type SuggestionKind = 'feature' | 'improvement' | 'bug' | 'question' | 'other';
export type SuggestionStatus = 'new' | 'considering' | 'planned' | 'done' | 'declined';

export interface ProjectSuggestion {
  id: string;
  project_id: string;
  client_id: string;
  title: string;
  description: string | null;
  kind: SuggestionKind;
  status: SuggestionStatus;
  admin_response: string | null;
  submitted_by_signature: string | null;
  created_at: string;
  updated_at: string;
}

/** Site en production (1:1 avec un projet livré). Sprint 6. */
export type UptimeStatus = 'up' | 'down' | 'unknown' | 'maintenance';

export interface ProjectProduction {
  id: string;
  project_id: string;
  prod_url: string | null;
  hosting_provider: string | null;
  hosting_dashboard_url: string | null;
  repo_url: string | null;
  cms_url: string | null;
  launch_date: string | null;
  lighthouse_performance: number | null;
  lighthouse_accessibility: number | null;
  lighthouse_seo: number | null;
  lighthouse_best_practices: number | null;
  cwv_lcp_seconds: number | null;
  cwv_cls: number | null;
  cwv_inp_ms: number | null;
  lighthouse_checked_at: string | null;
  lighthouse_report_url: string | null;
  uptime_status: UptimeStatus;
  uptime_checked_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}
