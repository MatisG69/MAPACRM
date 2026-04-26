import { useMemo, useState } from 'react';
import { Plus, Search, Users, Phone, Mail, Building2, Globe, Trash2, CreditCard as Edit2, Radar } from 'lucide-react';
import { Header } from '../components/layout/Header';
import type { AppNotification } from '../components/layout/Header';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { EmptyState } from '../components/ui/EmptyState';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { ClientForm } from '../components/clients/ClientForm';
import { ScrapingImportModal } from '../components/scraping/ScrapingImportModal';
import { CLIENT_CARD_STRIP, clientMatchesStatusFilter } from '../lib/clientStatus';
import { Client, ClientStatus } from '../lib/types';
import { getInitials } from '../lib/utils';

type SourceFilter = 'all' | 'scrapping';

const statusFilters: { value: ClientStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Tous' },
  { value: 'prospect', label: 'Pistes' },
  { value: 'telephoned', label: 'Téléphoné' },
  { value: 'in_discussion', label: 'Contacté' },
  { value: 'interested', label: 'Intéressé' },
  { value: 'quote_sent', label: 'Devis envoyé' },
  { value: 'not_interested', label: 'Pas intéressé' },
];

interface ClientsPageProps {
  clients: Client[];
  onCreate: (data: Omit<Client, 'id' | 'created_at' | 'updated_at'>) => Promise<Client>;
  onUpdate: (id: string, data: Partial<Client>) => Promise<Client>;
  onDelete: (id: string) => Promise<void>;
  onSelect: (id: string) => void;
  onImportSuccess: () => void;
}

export function ClientsPage({ clients, onCreate, onUpdate, onDelete, onSelect, onImportSuccess }: ClientsPageProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ClientStatus | 'all'>('all');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
  const [showCreate, setShowCreate] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editClient, setEditClient] = useState<Client | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const notifications = useMemo<AppNotification[]>(() => {
    const result: AppNotification[] = [];
    const interested = clients.filter((c) => c.status === 'interested');
    if (interested.length > 0) {
      result.push({
        id: 'interested',
        type: 'warning',
        message: `${interested.length} client${interested.length > 1 ? 's' : ''} intéressé${interested.length > 1 ? 's' : ''} — suivi en attente`,
      });
    }
    const scrapedUntouched = clients.filter((c) => c.is_scraped && c.status === 'prospect');
    if (scrapedUntouched.length > 0) {
      result.push({
        id: 'scraped',
        type: 'info',
        message: `${scrapedUntouched.length} prospect${scrapedUntouched.length > 1 ? 's' : ''} scrappé${scrapedUntouched.length > 1 ? 's' : ''} non contacté${scrapedUntouched.length > 1 ? 's' : ''}`,
      });
    }
    return result;
  }, [clients]);

  const filtered = clients.filter((c) => {
    const matchStatus = clientMatchesStatusFilter(c.status, statusFilter);
    const matchSource = sourceFilter === 'all' || (sourceFilter === 'scrapping' && c.is_scraped);
    const matchSearch =
      !search ||
      [c.name, c.company, c.email, c.city].some((f) => f?.toLowerCase().includes(search.toLowerCase()));
    return matchStatus && matchSource && matchSearch;
  });

  const handleCreate = async (data: Omit<Client, 'id' | 'created_at' | 'updated_at'>) => {
    await onCreate(data);
    setShowCreate(false);
  };

  const handleUpdate = async (data: Omit<Client, 'id' | 'created_at' | 'updated_at'>) => {
    if (!editClient) return;
    await onUpdate(editClient.id, data);
    setEditClient(null);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleteLoading(true);
    await onDelete(deleteId);
    setDeleteLoading(false);
    setDeleteId(null);
  };

  return (
    <div>
      <Header
        title="Registre clients"
        subtitle={`${clients.length} ligne${clients.length > 1 ? 's' : ''} · carnet de contreparties`}
        searchValue={search}
        onSearchChange={setSearch}
        notifications={notifications}
        actions={
          <div className="flex gap-2">
            <Button
              variant="secondary"
              icon={<Radar size={16} />}
              className="normal-case tracking-normal"
              onClick={() => setShowImport(true)}
            >
              Importer leads
            </Button>
            <Button icon={<Plus size={16} />} onClick={() => setShowCreate(true)}>
              Nouveau client
            </Button>
          </div>
        }
      />

      <div className="px-4 py-4 md:p-8 bg-ws-deep/20 min-h-[calc(100vh-120px)]">
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ws-mist" />
            <input
              type="text"
              placeholder="Filtrer par nom, société, email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-9 w-full font-mono text-xs"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {statusFilters.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setStatusFilter(f.value)}
                className={`pill-filter ${statusFilter === f.value ? 'pill-filter-active' : 'pill-filter-idle'}`}
              >
                {f.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setSourceFilter(sourceFilter === 'scrapping' ? 'all' : 'scrapping')}
              className={`pill-filter ${sourceFilter === 'scrapping' ? 'pill-filter-active border-violet-500/50 bg-violet-600/15 text-violet-200' : 'pill-filter-idle'}`}
            >
              Scrapping
            </button>
          </div>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon={<Users size={24} />}
            title={search || statusFilter !== 'all' ? 'Aucun résultat' : 'Aucun client'}
            description={
              search || statusFilter !== 'all'
                ? 'Ajustez les filtres ou la recherche'
                : 'Constituez votre portefeuille de contreparties'
            }
            action={
              !search && statusFilter === 'all'
                ? { label: 'Ajouter un client', onClick: () => setShowCreate(true) }
                : undefined
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((c) => (
              <div
                key={c.id}
                className={`ws-card-hover rounded-lg group border border-ws-line/80 border-l-[3px] shadow-[0_16px_40px_-24px_rgba(0,0,0,0.75)] ${CLIENT_CARD_STRIP[c.status]}`}
              >
                <div className="p-5 cursor-pointer" onClick={() => onSelect(c.id)} role="presentation">
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div
                        className="w-12 h-12 rounded-md flex items-center justify-center text-ws-void font-bold text-sm flex-shrink-0 font-mono border border-white/10"
                        style={{ backgroundColor: c.avatar_color }}
                      >
                        {getInitials(c.name)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-ws-paper group-hover:text-ws-accent-soft transition-colors font-display tracking-tight truncate">
                          {c.name}
                        </p>
                        {c.company && <p className="text-xs text-ws-ink mt-0.5 font-mono truncate">{c.company}</p>}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0 max-w-[45%]">
                      <Badge value={c.status} />
                      {c.profession && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-ws-line bg-ws-panel text-ws-ink truncate max-w-full">
                          {c.profession}
                        </span>
                      )}
                      {c.is_scraped && <Badge value="scrapping" />}
                      {c.website_status && ['no_website','social_only','directory_only','broken_website'].includes(c.website_status) && (
                        <Badge value="no_website" />
                      )}
                      {c.website_status && ['low_visibility','outdated_website'].includes(c.website_status) && (
                        <Badge value="seo_needed" />
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    {c.email && (
                      <div className="flex items-center gap-2 text-xs text-ws-ink min-w-0">
                        <Mail size={12} className="text-ws-mist flex-shrink-0" />
                        <span className="truncate font-mono">{c.email}</span>
                      </div>
                    )}
                    {c.phone && (
                      <div className="flex items-center gap-2 text-xs text-ws-ink min-w-0">
                        <Phone size={12} className="text-ws-mist flex-shrink-0" />
                        <span className="font-mono truncate">{c.phone}</span>
                      </div>
                    )}
                    {c.city && (
                      <div className="flex items-center gap-2 text-xs text-ws-ink min-w-0">
                        <Building2 size={12} className="text-ws-mist flex-shrink-0" />
                        <span className="truncate">{c.city}</span>
                      </div>
                    )}
                    {c.website && (
                      <div className="flex items-center gap-2 text-xs text-ws-ink min-w-0">
                        <Globe size={12} className="text-ws-mist flex-shrink-0" />
                        <span className="truncate font-mono">{c.website}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="px-5 py-3 border-t border-ws-line flex items-center justify-between gap-2 bg-ws-deep/40">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-ws-accent-soft/90 truncate">
                      {c.source || 'Source N/C'}
                    </span>
                    {c.digital_score != null && (
                      <span className="text-[10px] font-mono text-violet-300 border border-violet-500/30 bg-violet-600/10 rounded px-1.5 py-0.5 flex-shrink-0">
                        Score {c.digital_score}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditClient(c);
                      }}
                      className="p-1.5 rounded-md hover:bg-ws-panel text-ws-mist hover:text-ws-paper transition-colors"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteId(c.id);
                      }}
                      className="p-1.5 rounded-md hover:bg-ws-bear-dim text-ws-mist hover:text-ws-bear transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ScrapingImportModal
        isOpen={showImport}
        onClose={() => setShowImport(false)}
        onSuccess={onImportSuccess}
      />

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Nouveau client" size="lg">
        <ClientForm onSubmit={handleCreate} onCancel={() => setShowCreate(false)} />
      </Modal>

      <Modal isOpen={!!editClient} onClose={() => setEditClient(null)} title="Modifier le client" size="lg">
        {editClient && (
          <ClientForm initial={editClient} onSubmit={handleUpdate} onCancel={() => setEditClient(null)} />
        )}
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Supprimer le client"
        description="Cette action est irréversible. Toutes les données associées à ce client seront conservées mais dissociées."
        loading={deleteLoading}
      />
    </div>
  );
}
