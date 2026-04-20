import { useMemo, useState } from 'react';
import { Plus, Trash2, Pencil } from 'lucide-react';
import { Header } from '../components/layout/Header';
import type { AppNotification } from '../components/layout/Header';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Badge } from '../components/ui/Badge';
import { OpportunityForm } from '../components/opportunities/OpportunityForm';
import type { Client, DealStage, Opportunity, Project } from '../lib/types';
import { formatCurrency, formatDate, isOverdue } from '../lib/utils';
import { PIPELINE_STAGES } from '../lib/pipelineStages';

interface PipelinePageProps {
  opportunities: Opportunity[];
  clients: Client[];
  projects: Project[];
  onCreate: (data: Omit<Opportunity, 'id' | 'created_at' | 'updated_at' | 'client' | 'project'>) => Promise<Opportunity>;
  onUpdate: (id: string, data: Partial<Opportunity>) => Promise<Opportunity>;
  onDelete: (id: string) => Promise<void>;
}

const OPEN_STAGES: DealStage[] = [
  'lead_detected',
  'contacted',
  'meeting_scheduled',
  'quote_sent',
  'follow_up',
];

export function PipelinePage({
  opportunities,
  clients,
  projects,
  onCreate,
  onUpdate,
  onDelete,
}: PipelinePageProps) {
  const [modal, setModal] = useState<'new' | 'edit' | null>(null);
  const [editing, setEditing] = useState<Opportunity | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [search, setSearch] = useState('');

  const notifications = useMemo<AppNotification[]>(() => {
    const result: AppNotification[] = [];
    const followUp = opportunities.filter((o) => o.stage === 'follow_up');
    if (followUp.length > 0) {
      result.push({
        id: 'follow-up',
        type: 'warning',
        message: `${followUp.length} opportunité${followUp.length > 1 ? 's' : ''} en attente de relance`,
      });
    }
    const today = new Date();
    const closingSoon = opportunities.filter((o) => {
      if (!o.expected_close_date || !OPEN_STAGES.includes(o.stage)) return false;
      const days = Math.ceil((new Date(o.expected_close_date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return days >= 0 && days <= 7;
    });
    if (closingSoon.length > 0) {
      result.push({
        id: 'closing-soon',
        type: 'info',
        message: `${closingSoon.length} deal${closingSoon.length > 1 ? 's' : ''} à signer dans 7 jours`,
      });
    }
    const overdue = opportunities.filter(
      (o) => o.expected_close_date && OPEN_STAGES.includes(o.stage) && isOverdue(o.expected_close_date)
    );
    if (overdue.length > 0) {
      result.push({
        id: 'overdue-deals',
        type: 'warning',
        message: `${overdue.length} deal${overdue.length > 1 ? 's' : ''} dont la date de signature est dépassée`,
      });
    }
    return result;
  }, [opportunities]);

  const byStage = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = q
      ? opportunities.filter(
          (o) =>
            o.name.toLowerCase().includes(q) ||
            (o.client?.name ?? '').toLowerCase().includes(q)
        )
      : opportunities;
    const m = new Map<DealStage, Opportunity[]>();
    for (const s of PIPELINE_STAGES) m.set(s.id, []);
    for (const o of filtered) {
      const list = m.get(o.stage) || [];
      list.push(o);
      m.set(o.stage, list);
    }
    return m;
  }, [opportunities, search]);

  const kpis = useMemo(() => {
    const open = opportunities.filter((o) => OPEN_STAGES.includes(o.stage));
    const count = open.length;
    const weighted = open.reduce((s, o) => {
      const amt = o.estimated_amount ?? 0;
      return s + (amt * (o.probability ?? 0)) / 100;
    }, 0);
    const raw = open.reduce((s, o) => s + (o.estimated_amount ?? 0), 0);
    return { count, weighted, raw };
  }, [opportunities]);

  const quickStageChange = async (o: Opportunity, stage: DealStage) => {
    await onUpdate(o.id, { stage, lost_reason: stage === 'lost' ? o.lost_reason ?? 'other' : null });
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
        title="Pipeline commercial"
        subtitle="Tunnel MAPA · probabilité · montants · signatures prévues"
        searchValue={search}
        onSearchChange={setSearch}
        notifications={notifications}
        actions={
          <Button icon={<Plus size={16} />} className="normal-case tracking-normal" onClick={() => setModal('new')}>
            Opportunité
          </Button>
        }
      />
      <div className="px-4 py-4 md:p-8 space-y-6 bg-ws-deep/20 min-h-[calc(100vh-120px)]">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="ws-card rounded-xl p-4 border-ws-line/80">
            <p className="text-[10px] font-mono uppercase tracking-widest text-ws-mist mb-1">Deals ouverts</p>
            <p className="text-2xl font-display font-bold text-ws-cream tabular-nums">{kpis.count}</p>
          </div>
          <div className="ws-card rounded-xl p-4 border-ws-line/80">
            <p className="text-[10px] font-mono uppercase tracking-widest text-ws-mist mb-1">CA pondéré (proba)</p>
            <p className="text-2xl font-display font-bold text-ws-bull tabular-nums">{formatCurrency(kpis.weighted)}</p>
          </div>
          <div className="ws-card rounded-xl p-4 border-ws-line/80">
            <p className="text-[10px] font-mono uppercase tracking-widest text-ws-mist mb-1">Pipeline brut</p>
            <p className="text-2xl font-display font-bold text-ws-paper tabular-nums">{formatCurrency(kpis.raw)}</p>
          </div>
        </div>

        <div className="overflow-x-auto pb-2 -mx-2 px-2">
          <div className="flex gap-3 min-w-max md:min-w-0 md:grid md:grid-cols-7 md:gap-2">
            {PIPELINE_STAGES.map((col) => {
              const list = byStage.get(col.id) || [];
              return (
                <div
                  key={col.id}
                  className="w-[min(100vw-3rem,280px)] md:w-auto flex-shrink-0 md:flex-shrink rounded-xl border border-ws-line/60 bg-ws-panel/40 flex flex-col max-h-[70vh]"
                >
                  <div className="px-3 py-2.5 border-b border-ws-line/50">
                    <p className="text-[10px] font-mono font-semibold uppercase tracking-wider text-ws-accent-soft">
                      {col.short}
                    </p>
                    <p className="text-xs text-ws-mist truncate">{col.label}</p>
                    <p className="text-[10px] text-ws-mist/80 mt-0.5">{list.length}</p>
                  </div>
                  <div className="p-2 space-y-2 overflow-y-auto flex-1">
                    {list.map((o) => (
                      <div
                        key={o.id}
                        className="rounded-lg border border-ws-line/70 bg-ws-deep/50 p-3 space-y-2"
                      >
                        <p className="text-sm font-medium text-ws-paper leading-snug">{o.name}</p>
                        <p className="text-[11px] text-ws-mist font-mono truncate">{o.client?.name}</p>
                        {o.estimated_amount != null && (
                          <p className="text-xs font-mono text-ws-bull tabular-nums">
                            {formatCurrency(o.estimated_amount)} · {o.probability}%
                          </p>
                        )}
                        {o.expected_close_date && (
                          <p className="text-[10px] text-ws-mist font-mono">
                            Sign. {formatDate(o.expected_close_date)}
                          </p>
                        )}
                        {o.stage === 'lost' && o.lost_reason && (
                          <Badge value={o.lost_reason} className="!normal-case" />
                        )}
                        <select
                          className="input text-xs py-1.5 min-h-0"
                          value={o.stage}
                          onChange={(e) => quickStageChange(o, e.target.value as DealStage)}
                          aria-label="Changer l’étape"
                        >
                          {PIPELINE_STAGES.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.label}
                            </option>
                          ))}
                        </select>
                        <div className="flex gap-1 pt-1">
                          <button
                            type="button"
                            className="p-1.5 rounded-lg border border-ws-line text-ws-mist hover:text-ws-paper touch-manipulation"
                            aria-label="Modifier"
                            onClick={() => {
                              setEditing(o);
                              setModal('edit');
                            }}
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            type="button"
                            className="p-1.5 rounded-lg border border-ws-bear/30 text-ws-bear hover:bg-ws-bear-dim touch-manipulation"
                            aria-label="Supprimer"
                            onClick={() => setDeleteId(o.id)}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <Modal
        isOpen={modal === 'new' || modal === 'edit'}
        onClose={() => {
          setModal(null);
          setEditing(null);
        }}
        title={modal === 'edit' ? 'Modifier l’opportunité' : 'Nouvelle opportunité'}
        size="lg"
      >
        <OpportunityForm
          initial={editing ?? undefined}
          clients={clients}
          projects={projects}
          onCancel={() => {
            setModal(null);
            setEditing(null);
          }}
          onSubmit={async (data) => {
            if (editing) {
              await onUpdate(editing.id, data);
            } else {
              await onCreate(data);
            }
            setModal(null);
            setEditing(null);
          }}
        />
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(deleteId)}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Supprimer cette opportunité ?"
        description="Les devis liés resteront mais sans lien opportunité."
        loading={deleteLoading}
      />
    </div>
  );
}
