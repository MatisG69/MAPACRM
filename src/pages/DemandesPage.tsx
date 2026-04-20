import { useMemo, useState } from 'react';
import {
  Mail,
  Building2,
  MessageSquare,
  Trash2,
  CheckCircle2,
  Clock,
  Archive,
  UserPlus,
  Inbox,
  X,
} from 'lucide-react';
import { Header } from '../components/layout/Header';
import type { AppNotification } from '../components/layout/Header';
import { Button } from '../components/ui/Button';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { EmptyState } from '../components/ui/EmptyState';
import type { Client, ServiceRequest, ServiceRequestStatus } from '../lib/types';

const STATUS_CONFIG: Record<ServiceRequestStatus, { label: string; style: string }> = {
  new:         { label: 'Nouvelle',   style: 'bg-ws-accent-dim text-ws-accent-soft border-ws-accent/35' },
  read:        { label: 'Lue',        style: 'bg-ws-deep text-ws-mist border-ws-line' },
  in_progress: { label: 'En cours',   style: 'bg-ws-wire/20 text-ws-highlight border-ws-wire/35' },
  converted:   { label: 'Convertie',  style: 'bg-ws-bull-dim text-ws-bull border-ws-bull/30' },
  archived:    { label: 'Archivee',   style: 'bg-ws-deep text-ws-mist/60 border-ws-line/50' },
};

const FILTER_OPTIONS: { value: ServiceRequestStatus | 'all'; label: string }[] = [
  { value: 'all',         label: 'Toutes' },
  { value: 'new',         label: 'Nouvelles' },
  { value: 'read',        label: 'Lues' },
  { value: 'in_progress', label: 'En cours' },
  { value: 'converted',   label: 'Converties' },
  { value: 'archived',    label: 'Archivees' },
];

const AVATAR_COLORS = [
  '#C98A4C', '#7C6F9F', '#4A90A4', '#6BAA75', '#C4625A',
  '#8E7B5E', '#5B8FB9', '#B5835A', '#7A9E7E', '#9B6B9B',
];

interface ConvertForm {
  name: string;
  email: string;
  company: string;
  profession: string;
  notes: string;
}

interface DemandesPageProps {
  requests: ServiceRequest[];
  onUpdateStatus: (id: string, status: ServiceRequestStatus) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onConvertToClient: (data: Omit<Client, 'id' | 'created_at' | 'updated_at'>, requestId: string) => Promise<void>;
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
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function ConvertModal({
  request,
  onConfirm,
  onClose,
  loading,
}: {
  request: ServiceRequest;
  onConfirm: (form: ConvertForm) => void;
  onClose: () => void;
  loading: boolean;
}) {
  const [form, setForm] = useState<ConvertForm>({
    name: request.name,
    email: request.email,
    company: request.company ?? '',
    profession: request.project_type ?? '',
    notes: request.message ?? '',
  });

  const set = (k: keyof ConvertForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [k]: e.target.value }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-ws-panel border border-ws-lineStrong/60 rounded-2xl shadow-[0_25px_80px_-12px_rgba(0,0,0,0.85)] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-ws-line">
          <div>
            <p className="font-display font-semibold text-ws-paper">Convertir en client</p>
            <p className="text-[11px] font-mono text-ws-mist mt-0.5">Un fiche client sera creee avec ces informations</p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-ws-raised text-ws-mist hover:text-ws-paper">
            <X size={16} />
          </button>
        </div>

        <div className="px-5 py-5 space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-mono uppercase tracking-widest text-ws-mist">Nom *</label>
            <input
              className="input w-full text-sm"
              value={form.name}
              onChange={set('name')}
              placeholder="Nom du contact"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-mono uppercase tracking-widest text-ws-mist">Email</label>
            <input
              className="input w-full text-sm"
              value={form.email}
              onChange={set('email')}
              placeholder="email@exemple.com"
              type="email"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-mono uppercase tracking-widest text-ws-mist">Entreprise</label>
              <input
                className="input w-full text-sm"
                value={form.company}
                onChange={set('company')}
                placeholder="Nom de la societe"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-mono uppercase tracking-widest text-ws-mist">Secteur</label>
              <input
                className="input w-full text-sm"
                value={form.profession}
                onChange={set('profession')}
                placeholder="Ex: Restaurant"
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-mono uppercase tracking-widest text-ws-mist">Notes (message)</label>
            <textarea
              className="input w-full text-sm resize-none"
              rows={3}
              value={form.notes}
              onChange={set('notes')}
              placeholder="Message initial du prospect..."
            />
          </div>
        </div>

        <div className="px-5 py-4 border-t border-ws-line flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={onClose}>Annuler</Button>
          <Button
            size="sm"
            icon={<UserPlus size={14} />}
            loading={loading}
            disabled={!form.name.trim()}
            onClick={() => onConfirm(form)}
          >
            Creer le client
          </Button>
        </div>
      </div>
    </div>
  );
}

export function DemandesPage({ requests, onUpdateStatus, onDelete, onConvertToClient }: DemandesPageProps) {
  const [filter, setFilter] = useState<ServiceRequestStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [convertRequest, setConvertRequest] = useState<ServiceRequest | null>(null);
  const [convertLoading, setConvertLoading] = useState(false);

  const notifications = useMemo<AppNotification[]>(() => {
    const n = requests.filter((r) => r.status === 'new').length;
    if (n === 0) return [];
    return [{
      id: 'new-requests',
      type: 'info',
      message: n + ' nouvelle' + (n > 1 ? 's' : '') + ' demande' + (n > 1 ? 's' : '') + ' sur le site vitrine',
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

  const handleConvert = async (form: ConvertForm) => {
    if (!convertRequest) return;
    setConvertLoading(true);
    try {
      const color = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
      await onConvertToClient(
        {
          name: form.name.trim(),
          email: form.email.trim() || null,
          phone: null,
          company: form.company.trim() || null,
          address: null,
          city: null,
          website: null,
          status: 'interested',
          source: 'website',
          notes: form.notes.trim() || null,
          satisfaction_rating: null,
          feedback: null,
          profession: form.profession.trim() || null,
          avatar_color: color,
          is_scraped: false,
          source_platform: null,
          source_url: null,
          website_raw: null,
          website_status: null,
          digital_score: null,
          scraped_at: null,
        },
        convertRequest.id
      );
      setConvertRequest(null);
    } finally {
      setConvertLoading(false);
    }
  };

  return (
    <div>
      <Header
        title="Demandes"
        subtitle="Formulaires recus depuis mapa-developpement.fr"
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
            description="Les formulaires soumis sur mapa-developpement.fr apparaitront ici."
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Inbox size={28} />}
            title="Aucun resultat"
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
                  <div className="flex flex-wrap sm:flex-col gap-2 sm:min-w-[160px]">
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
                    {r.status !== 'converted' && r.status !== 'archived' && (
                      <Button
                        size="sm"
                        icon={<UserPlus size={14} />}
                        className="normal-case tracking-normal text-xs flex-1 sm:flex-none"
                        onClick={() => setConvertRequest(r)}
                      >
                        Convertir en client
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

      {convertRequest && (
        <ConvertModal
          request={convertRequest}
          onConfirm={handleConvert}
          onClose={() => setConvertRequest(null)}
          loading={convertLoading}
        />
      )}

      <ConfirmDialog
        isOpen={Boolean(deleteId)}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Supprimer cette demande ?"
        description="Action definitive."
        loading={deleteLoading}
      />
    </div>
  );
}
