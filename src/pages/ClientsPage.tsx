import { useState } from 'react';
import { Plus, Search, Users, Phone, Mail, Building2, Globe, Trash2, CreditCard as Edit2 } from 'lucide-react';
import { Header } from '../components/layout/Header';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { EmptyState } from '../components/ui/EmptyState';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { ClientForm } from '../components/clients/ClientForm';
import { Client, ClientStatus } from '../lib/types';
import { getInitials } from '../lib/utils';

const statusFilters: { value: ClientStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Tous' },
  { value: 'active', label: 'Actifs' },
  { value: 'prospect', label: 'Prospects' },
  { value: 'inactive', label: 'Inactifs' },
];

interface ClientsPageProps {
  clients: Client[];
  onCreate: (data: Omit<Client, 'id' | 'created_at' | 'updated_at'>) => Promise<Client>;
  onUpdate: (id: string, data: Partial<Client>) => Promise<Client>;
  onDelete: (id: string) => Promise<void>;
  onSelect: (id: string) => void;
}

export function ClientsPage({ clients, onCreate, onUpdate, onDelete, onSelect }: ClientsPageProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ClientStatus | 'all'>('all');
  const [showCreate, setShowCreate] = useState(false);
  const [editClient, setEditClient] = useState<Client | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const filtered = clients.filter((c) => {
    const matchStatus = statusFilter === 'all' || c.status === statusFilter;
    const matchSearch =
      !search ||
      [c.name, c.company, c.email, c.city].some((f) => f?.toLowerCase().includes(search.toLowerCase()));
    return matchStatus && matchSearch;
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
        actions={
          <Button icon={<Plus size={16} />} onClick={() => setShowCreate(true)}>
            Nouveau client
          </Button>
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
                className="ws-card-hover rounded-lg group border-ws-line/80"
              >
                <div className="p-5 cursor-pointer" onClick={() => onSelect(c.id)} role="presentation">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-12 h-12 rounded-md flex items-center justify-center text-ws-void font-bold text-sm flex-shrink-0 font-mono border border-white/10"
                        style={{ backgroundColor: c.avatar_color }}
                      >
                        {getInitials(c.name)}
                      </div>
                      <div>
                        <p className="font-semibold text-ws-paper group-hover:text-ws-accent-soft transition-colors font-display tracking-tight">
                          {c.name}
                        </p>
                        {c.company && <p className="text-xs text-ws-ink mt-0.5 font-mono">{c.company}</p>}
                      </div>
                    </div>
                    <Badge value={c.status} />
                  </div>

                  <div className="space-y-1.5">
                    {c.email && (
                      <div className="flex items-center gap-2 text-xs text-ws-ink">
                        <Mail size={12} className="text-ws-mist flex-shrink-0" />
                        <span className="truncate font-mono">{c.email}</span>
                      </div>
                    )}
                    {c.phone && (
                      <div className="flex items-center gap-2 text-xs text-ws-ink">
                        <Phone size={12} className="text-ws-mist flex-shrink-0" />
                        <span className="font-mono">{c.phone}</span>
                      </div>
                    )}
                    {c.city && (
                      <div className="flex items-center gap-2 text-xs text-ws-ink">
                        <Building2 size={12} className="text-ws-mist flex-shrink-0" />
                        <span>{c.city}</span>
                      </div>
                    )}
                    {c.website && (
                      <div className="flex items-center gap-2 text-xs text-ws-ink">
                        <Globe size={12} className="text-ws-mist flex-shrink-0" />
                        <span className="truncate font-mono">{c.website}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="px-5 py-3 border-t border-ws-line flex items-center justify-between bg-ws-deep/40">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-ws-accent-soft/90">
                    {c.source || 'Source N/C'}
                  </span>
                  <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
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
