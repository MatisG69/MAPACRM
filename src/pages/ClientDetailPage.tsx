import { useState } from 'react';
import {
  ArrowLeft,
  Mail,
  Phone,
  Building2,
  Globe,
  MapPin,
  Pencil,
  Plus,
  MessageSquare,
  FolderKanban,
  CalendarCheck,
  Users,
  Radar,
  type LucideIcon,
} from 'lucide-react';
import { Header } from '../components/layout/Header';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { ClientForm } from '../components/clients/ClientForm';
import { InteractionForm } from '../components/interactions/InteractionForm';
import { ProjectForm } from '../components/projects/ProjectForm';
import { ProgressBar } from '../components/ui/ProgressBar';
import { Client, Interaction, Invoice, Project } from '../lib/types';
import { Page } from '../lib/types';
import { formatCurrency, formatDate, formatDateTime, getInitials } from '../lib/utils';

const INTERACTION_ICONS: Record<string, LucideIcon> = {
  call: Phone,
  email: Mail,
  meeting: CalendarCheck,
  note: MessageSquare,
  demo: Users,
};

interface ClientDetailPageProps {
  client: Client | undefined;
  projects: Project[];
  interactions: Interaction[];
  invoices: Invoice[];
  allClients: Client[];
  onBack: () => void;
  onNavigate: (page: Page, id?: string) => void;
  onUpdateClient: (id: string, data: Partial<Client>) => Promise<Client>;
  onDeleteClient: (id: string) => Promise<void>;
  onCreateInteraction: (
    data: Omit<Interaction, 'id' | 'created_at' | 'client'>
  ) => Promise<Interaction>;
  onDeleteInteraction: (id: string) => Promise<void>;
  onCreateProject: (data: Omit<Project, 'id' | 'created_at' | 'updated_at' | 'client'>) => Promise<Project>;
}

export function ClientDetailPage({
  client,
  projects,
  interactions,
  invoices,
  allClients,
  onBack,
  onNavigate,
  onUpdateClient,
  onDeleteClient,
  onCreateInteraction,
  onDeleteInteraction,
  onCreateProject,
}: ClientDetailPageProps) {
  const [showEdit, setShowEdit] = useState(false);
  const [showInteraction, setShowInteraction] = useState(false);
  const [showProject, setShowProject] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  if (!client) {
    return (
      <div className="px-4 py-6 md:p-8 bg-ws-deep/20">
        <p className="text-ws-mist font-mono text-sm">Client introuvable.</p>
        <Button variant="secondary" className="mt-4 normal-case tracking-normal" onClick={onBack}>
          Retour
        </Button>
      </div>
    );
  }

  const handleDelete = async () => {
    setDeleteLoading(true);
    await onDeleteClient(client.id);
    setDeleteLoading(false);
    setShowDelete(false);
    onBack();
  };

  const clientInvoices = invoices.filter((i) => i.client_id === client.id);
  const totalInvoiced = clientInvoices.reduce((s, i) => s + i.amount, 0);

  return (
    <div>
      <div className="px-4 md:px-8 pt-3 md:pt-4 bg-ws-deep/10">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-ws-ink hover:text-ws-gold mb-2 font-mono uppercase tracking-wider transition-colors"
        >
          <ArrowLeft size={16} />
          Registre clients
        </button>
      </div>
      <Header
        title={client.name}
        subtitle={client.company || 'Dossier contrepartie & historique de contact'}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              icon={<MessageSquare size={16} />}
              className="normal-case tracking-normal"
              onClick={() => setShowInteraction(true)}
            >
              Interaction
            </Button>
            <Button
              icon={<FolderKanban size={16} />}
              variant="secondary"
              className="normal-case tracking-normal"
              onClick={() => setShowProject(true)}
            >
              Nouveau projet
            </Button>
            <Button
              variant="secondary"
              icon={<Pencil size={16} />}
              className="normal-case tracking-normal"
              onClick={() => setShowEdit(true)}
            >
              Modifier
            </Button>
            <Button variant="danger" className="normal-case tracking-normal" onClick={() => setShowDelete(true)}>
              Supprimer
            </Button>
          </div>
        }
      />

      <div className="px-4 py-6 md:p-8 space-y-6 md:space-y-8 max-w-5xl bg-ws-deep/20 min-h-[calc(100vh-160px)]">
        <div className="flex flex-col md:flex-row gap-6">
          <div
            className="w-20 h-20 rounded-lg flex items-center justify-center text-ws-void text-xl font-bold flex-shrink-0 font-mono border border-white/10"
            style={{ backgroundColor: client.avatar_color }}
          >
            {getInitials(client.name)}
          </div>
          <div className="flex-1 space-y-3">
            <div className="flex flex-wrap gap-2 items-center">
              <Badge value={client.status} />
              {client.is_scraped && <Badge value="scrapping" />}
              {client.source && (
                <span className="text-[10px] font-mono uppercase tracking-wider text-ws-gold px-2 py-1 rounded border border-ws-gold/25 bg-ws-gold-dim">
                  Source : {client.source}
                </span>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-ws-ink">
              {client.email && (
                <div className="flex items-center gap-2">
                  <Mail size={14} className="text-ws-mist" />
                  <a href={`mailto:${client.email}`} className="text-ws-highlight hover:text-ws-gold font-mono text-xs truncate">
                    {client.email}
                  </a>
                </div>
              )}
              {client.phone && (
                <div className="flex items-center gap-2">
                  <Phone size={14} className="text-ws-mist" />
                  <a href={`tel:${client.phone}`} className="hover:text-ws-gold font-mono text-xs">
                    {client.phone}
                  </a>
                </div>
              )}
              {client.city && (
                <div className="flex items-center gap-2">
                  <Building2 size={14} className="text-ws-mist" />
                  {client.city}
                </div>
              )}
              {client.address && (
                <div className="flex items-center gap-2">
                  <MapPin size={14} className="text-ws-mist" />
                  {client.address}
                </div>
              )}
              {client.website && (
                <div className="flex items-center gap-2 sm:col-span-2">
                  <Globe size={14} className="text-ws-mist" />
                  <a
                    href={client.website.startsWith('http') ? client.website : `https://${client.website}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-ws-highlight hover:text-ws-gold truncate font-mono text-xs"
                  >
                    {client.website}
                  </a>
                </div>
              )}
            </div>
            {client.notes && (
              <div className="ws-card rounded-lg p-4 text-sm text-ws-ink whitespace-pre-wrap leading-relaxed">
                {client.notes}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="ws-card rounded-lg p-4">
            <p className="ws-section-title mb-1">Projets</p>
            <p className="text-2xl font-mono font-bold text-ws-paper tabular-nums">{projects.length}</p>
          </div>
          <div className="ws-card rounded-lg p-4">
            <p className="ws-section-title mb-1">Facturé</p>
            <p className="text-2xl font-mono font-bold text-ws-bull tabular-nums">{formatCurrency(totalInvoiced)}</p>
          </div>
          <div className="ws-card rounded-lg p-4">
            <p className="ws-section-title mb-1">Interactions</p>
            <p className="text-2xl font-mono font-bold text-ws-gold tabular-nums">{interactions.length}</p>
          </div>
        </div>

        {client.is_scraped && (
          <section className="ws-card rounded-lg p-5 border border-violet-500/20 bg-violet-600/5">
            <h2 className="font-display text-base font-bold text-ws-paper mb-4 flex items-center gap-2">
              <Radar size={16} className="text-violet-300" />
              Profil digital
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {client.website_status && (
                <div>
                  <p className="ws-section-title mb-1.5">Statut site web</p>
                  <Badge value={client.website_status} />
                </div>
              )}
              {client.digital_score != null && (
                <div>
                  <p className="ws-section-title mb-1.5">Score commercial</p>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-mono font-bold tabular-nums text-violet-300">
                      {client.digital_score}
                    </span>
                    <span className="text-xs text-ws-mist font-mono">/ 100</span>
                  </div>
                  <div className="mt-1.5 h-1.5 rounded-full bg-ws-line overflow-hidden">
                    <div
                      className="h-full bg-violet-500 rounded-full transition-all"
                      style={{ width: `${client.digital_score}%` }}
                    />
                  </div>
                </div>
              )}
              {client.scraped_at && (
                <div>
                  <p className="ws-section-title mb-1.5">Importé le</p>
                  <p className="text-xs font-mono text-ws-ink">
                    {new Date(client.scraped_at).toLocaleDateString('fr-FR', {
                      day: 'numeric', month: 'long', year: 'numeric',
                    })}
                  </p>
                </div>
              )}
            </div>
            {client.source_url && (
              <div className="mt-3 pt-3 border-t border-violet-500/15">
                <p className="ws-section-title mb-1">Source</p>
                <a
                  href={client.source_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-mono text-ws-highlight hover:text-ws-gold truncate block"
                >
                  {client.source_url}
                </a>
              </div>
            )}
          </section>
        )}

        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg font-bold text-ws-paper">Positions ouvertes</h2>
            <Button
              variant="secondary"
              icon={<Plus size={14} />}
              className="normal-case tracking-normal"
              onClick={() => setShowProject(true)}
            >
              Ajouter
            </Button>
          </div>
          {projects.length === 0 ? (
            <p className="text-sm text-ws-mist py-8 text-center ws-card rounded-lg font-mono">
              Aucun projet pour ce client
            </p>
          ) : (
            <div className="space-y-3">
              {projects.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onNavigate('project-detail', p.id)}
                  className="w-full text-left ws-card-hover rounded-lg p-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-ws-paper font-display tracking-tight">{p.name}</span>
                    <Badge value={p.status} />
                  </div>
                  <ProgressBar value={p.progress} size="sm" color="bull" />
                </button>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="font-display text-lg font-bold text-ws-paper mb-4">Historique commercial</h2>
          {interactions.length === 0 ? (
            <p className="text-sm text-ws-mist py-6 text-center ws-card rounded-lg font-mono">
              Aucune interaction — enregistrez appels, emails et réunions
            </p>
          ) : (
            <div className="space-y-3">
              {interactions.map((i) => {
                const Icon = INTERACTION_ICONS[i.type] || MessageSquare;
                return (
                  <div key={i.id} className="ws-card rounded-lg p-4 flex gap-4 border-ws-line/80">
                    <div className="w-10 h-10 rounded-md bg-ws-deep border border-ws-line flex items-center justify-center flex-shrink-0">
                      <Icon size={18} className="text-ws-highlight" strokeWidth={2} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <Badge value={i.type} />
                        <span className="text-[10px] font-mono text-ws-mist uppercase tracking-wider">
                          {formatDateTime(i.date)}
                        </span>
                      </div>
                      <p className="text-sm text-ws-ink whitespace-pre-wrap leading-relaxed">{i.description}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onDeleteInteraction(i.id)}
                      className="text-[10px] font-mono uppercase text-ws-mist hover:text-ws-bear self-start tracking-wider"
                    >
                      Supprimer
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section>
          <h2 className="font-display text-lg font-bold text-ws-paper mb-4">Factures</h2>
          {clientInvoices.length === 0 ? (
            <p className="text-sm text-ws-mist py-6 text-center ws-card rounded-lg font-mono">Aucune facture liée</p>
          ) : (
            <div className="ws-card rounded-lg divide-y divide-ws-line/60 overflow-hidden">
              {clientInvoices.map((inv) => (
                <div key={inv.id} className="px-4 py-3 flex items-center justify-between gap-4 hover:bg-ws-raised/30">
                  <div>
                    <p className="font-mono text-xs text-ws-gold/90">{inv.invoice_number}</p>
                    <p className="text-sm font-mono font-semibold text-ws-bull tabular-nums">{formatCurrency(inv.amount)}</p>
                  </div>
                  <Badge value={inv.status} />
                  <span className="text-xs font-mono text-ws-mist">{formatDate(inv.due_date)}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <Modal isOpen={showEdit} onClose={() => setShowEdit(false)} title="Modifier le client" size="lg">
        <ClientForm
          initial={client}
          onSubmit={async (data) => {
            await onUpdateClient(client.id, data);
            setShowEdit(false);
          }}
          onCancel={() => setShowEdit(false)}
        />
      </Modal>

      <Modal isOpen={showInteraction} onClose={() => setShowInteraction(false)} title="Nouvelle interaction" size="lg">
        <InteractionForm
          key={client.id}
          clients={allClients}
          defaultClientId={client.id}
          onSubmit={async (data) => {
            await onCreateInteraction(data);
            setShowInteraction(false);
          }}
          onCancel={() => setShowInteraction(false)}
        />
      </Modal>

      <Modal isOpen={showProject} onClose={() => setShowProject(false)} title="Nouveau projet" size="lg">
        <ProjectForm
          initial={{ client_id: client.id }}
          clients={allClients}
          onSubmit={async (data) => {
            await onCreateProject(data);
            setShowProject(false);
          }}
          onCancel={() => setShowProject(false)}
        />
      </Modal>

      <ConfirmDialog
        isOpen={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={handleDelete}
        title="Supprimer ce client ?"
        description="Les projets seront conservés sans lien client. Les factures seront dissociées."
        loading={deleteLoading}
      />
    </div>
  );
}
