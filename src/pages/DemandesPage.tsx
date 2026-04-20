import { useMemo, useState } from 'react';
import {
  Mail,
  Building2,
  MessageSquare,
  Trash2,
  CheckCircle2,
  Clock,
  Archive,
  ArrowRight,
  Inbox,
} from 'lucide-react';
import { Header } from '../components/layout/Header';
import type { AppNotification } from '../components/layout/Header';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { EmptyState } from '../components/ui/EmptyState';
import type { ServiceRequest, ServiceRequestStatus } from '../lib/types';

const STATUS_CONFIG: Record<ServiceRequestStatus, { label: string; style: string }> = {
  new:        { label: 'Nouvelle',    style: 'bg-ws-accent-dim text-ws-accent-soft border-ws-accent/35' },
  read:       { label: 'Lue',         style: 'bg-ws-deep text-ws-mist border-ws-line' },
  in_progress:{ label: 'En cours',    style: 'bg-ws-wire/20 text-ws-highlight border-ws-wire/35' },
  converted:  { label: 'Convertie',   style: 'bg-ws-bull-dim text-ws-bull border-ws-bull/30' },
  archived:   { label: 'Archivée',    style: 'bg-ws-deep text-ws-mist/60 border-ws-line/50' },
};

const FILTER_OPTIONS: { value: ServiceRequestStatus | 'all'; label: string }[] = [
  { value: 'all',         label: 'Toutes' },
  { value: 'new',         label: 'Nouvelles' },
  { value: 'read',        label: 'Lues' },
  { value: 'in_progress', label: 'En cours' },
  { value: 'converted',   label: 'Converties' },
  { value: 'archived',    label: 'Archivées' },
];

interface DemandesPageProps {
  requests: ServiceRequest[];
  onUpdateStatus: (id: string, status: ServiceRequestStatus) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

function StatusBadge({ status }: { status: ServiceRequestStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded border text-[10px] font-mono font-semibold uppercase tracking-wide ${cfg.style}`}>
      {cfg.label}
    </span>
  );
}

function formatDatetime(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function DemandesPage({ requests, onUpdateStatus, onDelete }: DemandesPageProps) {
  const [filter, setFilter] = useState<ServiceRequestStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const notifications = useMemo<AppNotification[]>(() => {
    const n = requests.filter((r) => r.status === 'new').length;
    if (n === 0) return [];
    return [{
      id: 'new-requests',
      type: 'info',
      message: `${n} nouvelle${n > 1 ? 's' : ''} demande${n > 1 ? 's' : ''} sur le site vitrine`,
    }];
  }, [requests]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return requests.filter((r) => {
      if (filter !== 'all' && r.status !== filter) return false;
      if (!q) return true;
      return [r.name, r.email, r.company, r.project_type, r.message].some(
        (f) => f?.toLowerCase().includes(q)
      );
    });
  }, [requests, filter, search]);

  const stats = useMemo(() => ({
    total: requests.length,
    new: requests.filter((r) => r.status === 'new').length,
    inProgress: requests.filter((r) => r.status === 'in_progress').length,
    converted: requests.filter((r) => r.status === 'converted').length,
  }), [requests]);

  const setStatus = async (id: string, status: ServiceRequestStatus) => {
    setUpdatingId(id);
    try { await onUpdateStatus(id, status); } finally { setUpdatingId(null); }
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
        title="Demandes"
        subtitle="Formulaires reçus depuis mapa-developpement.fr"
        searchValue={search}
        onSearchChange={setSearch}
        notifications={notifications}
      />

      <div className="px-4 py-4 md:p-8 bg-ws-deep/20 min-h-[calc(100vh-120px)]">

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="ws-card rounded-xl p-4 border-ws-line/80">
            <p className="text-[10px] font-mono uppercase tracking-widest text-ws-mist mb-1">Total</p>
            <p className="text-2xl font-display font-bold text-ws-cream tabular-nums">{stats.total}</p>
          </div>
          <div className="ws-card rounded-xl p-4 border-ws-accent/25 bg-ws-accent-dim/30">
            <p className="text-[10px] font-mono uppercase tracking-widest text-ws-accent-soft mb-1">Nouvelles</p>
            <p className="text-2xl font-display font-bold text-ws-accent-soft tabular-nums">{stats.new}</p>
          </div>
          <div className="ws-card rounded-xl p-4 border-ws-line/80">
            <p className="text-[10px] font-mono uppercase tracking-widest text-ws-mist mb-1">En cours</p>
            <p className="text-2xl font-display font-bold text-ws-highlight tabular-nums">{stats.inProgress}</p>
          </div>
          <div className="ws-card rounded-xl p-4 border-ws-line/80">
            <p className="text-[10px] font-mono uppercase tracking-widest text-ws-mist mb-1">Converties</p>
            <p className="text-2xl font-display font-bold text-ws-bull tabular-nums">{stats.converted}</p>
          </div>
        </div>

        {/* Filtres */}
        <div className="flex flex-wrap gap-2 mb-5">
          {FILTER_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              className={`pill-filter ${filter === value ? 'pill-filter-active' : 'pill-filter-idle'}`}
            >
              {label}
              {value === 'new' && stats.new > 0 && (
                <span className="ml-1.5 bg-ws-accent text-ws-void text-[9px] font-bold font-mono rounded-full px-1.5 py-0.5 leading-none">
                  {stats.new}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Liste */}
        {requests.length === 0 ? (
          <EmptyState
            icon={<Inbox size={28} />}
            title="Aucune demande"
            description="Les formulaires soumis sur mapa-developpement.fr apparaîtront ici en temps réel."
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Inbox size={28} />}
            title="Aucun résultat"
            description="Affinez la recherche ou les filtres."
          />
        ) : (
          <div className="space-y-3">
            {filtered.map((r) => (
              <div
                key={r.id}
                className={`ws-card rounded-2xl p-5 border transition-all ${
                  r.status === 'new'
                    ? 'border-ws-accent/30 shadow-[0_0_0_1px_rgba(201,138,76,0.12)]'
                    : r.status === 'archived'
                    ? 'border-ws-line/40 opacity-60'
                    : 'border-ws-line/60'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  {/* Infos */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <p className="font-display font-semibold text-ws-paper text-base">{r.name}</p>
                      <StatusBadge status={r.status} />
                      {r.project_type && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-ws-line bg-ws-panel text-ws-ink">
                          {r.project_type}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-ws-mist mb-3">
                      <a href={`mailto:${r.email}`} className="flex items-center gap-1.5 hover:text-ws-accent-soft transition-colors">
                        <Mail size={12} />
                        {r.email}
                      </a>
                      {r.company && (
                        <span className="flex items-center gap-1.5">
                          <Building2 size={12} />
                          {r.company}
                        </span>
                      )}
                      <span className="text-ws-mist/60">{formatDatetime(r.created_at)}</span>
                    </div>
                    {r.message && (
                      <div className="flex items-start gap-2 bg-ws-deep/50 rounded-xl px-3 py-2.5 border border-ws-line/40">
                        <MessageSquare size={13} className="text-ws-mist flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-ws-ink leading-relaxed line-clamp-3">{r.message}</p>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap sm:flex-col gap-2 sm:min-w-[140px]">
                    {r.status === 'new' && (
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={<CheckCircle2 size={14} />}
                        className="normal-case tracking-normal text-xs flex-1 sm:flex-none"
                        loading={updatingId === r.id}
                        onClick={() => setStatus(r.id, 'read')}
                      >
                        Marquer lue
                      </Button>
                    )}
                    {(r.status === 'read' || r.status === 'new') && (
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={<Clock size={14} />}
                        className="normal-case tracking-normal text-xs flex-1 sm:flex-none"
                        loading={updatingId === r.id}
                        onClick={() => setStatus(r.id, 'in_progress')}
                      >
                        En cours
                      </Button>
                    )}
                    {r.status === 'in_progress' && (
                      <Button
                        size="sm"
                        icon={<ArrowRight size={14} />}
                        className="normal-case tracking-normal text-xs flex-1 sm:flex-none"
                        loading={updatingId === r.id}
                        onClick={() => setStatus(r.id, 'converted')}
                      >
                        Convertie
                      </Button>
                    )}
                    {r.status !== 'archived' && r.status !== 'converted' && (
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={<Archive size={14} />}
                        className="normal-case tracking-normal text-xs flex-1 sm:flex-none text-ws-mist"
                        loading={updatingId === r.id}
                        onClick={() => setStatus(r.id, 'archived')}
                      >
                        Archiver
                      </Button>
                    )}
                    <Button
                      variant="danger"
                      size="sm"
                      icon={<Trash2 size={14} />}
                      className="normal-case tracking-normal text-xs flex-1 sm:flex-none"
                      onClick={() => setDeleteId(r.id)}
                    >
                      Supprimer
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={Boolean(deleteId)}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Supprimer cette demande ?"
        description="Action définitive."
        loading={deleteLoading}
      />
    </div>
  );
}
