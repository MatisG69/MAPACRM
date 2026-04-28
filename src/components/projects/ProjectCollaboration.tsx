import { useState } from 'react';
import {
  GitPullRequestArrow,
  CalendarClock,
  Plus,
  Loader2,
  Trash2,
  CheckCircle2,
  X,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { useChangeRequests } from '../../hooks/useChangeRequests';
import { useMeetingNotes } from '../../hooks/useMeetingNotes';
import type {
  ChangeRequest,
  ChangeRequestStatus,
  ChangeRequestUrgency,
  MeetingKind,
  MeetingNote,
} from '../../lib/types';
import { formatCurrency, formatDate } from '../../lib/utils';

interface ProjectCollaborationProps {
  projectId: string;
  clientId: string;
}

const URGENCY_LABEL: Record<ChangeRequestUrgency, string> = {
  low: 'Faible',
  normal: 'Normale',
  high: 'Élevée',
  urgent: 'Urgente',
};

const URGENCY_TONE: Record<ChangeRequestUrgency, string> = {
  low: 'bg-ws-deep/40 text-ws-mist border-ws-line',
  normal: 'bg-sky-500/10 text-sky-300 border-sky-500/30',
  high: 'bg-amber-500/12 text-amber-300 border-amber-500/35',
  urgent: 'bg-red-500/12 text-red-300 border-red-500/35',
};

const STATUS_LABEL: Record<ChangeRequestStatus, string> = {
  submitted: 'Soumise',
  estimated: 'Estimée',
  approved: 'Approuvée',
  rejected: 'Refusée',
  completed: 'Réalisée',
};

const STATUS_TONE: Record<ChangeRequestStatus, string> = {
  submitted: 'bg-sky-500/10 text-sky-300 border-sky-500/30',
  estimated: 'bg-ws-accent/15 text-ws-accent border-ws-accent/35',
  approved: 'bg-emerald-500/12 text-emerald-300 border-emerald-500/30',
  rejected: 'bg-red-500/12 text-red-300 border-red-500/35',
  completed: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
};

const MEETING_KIND_LABEL: Record<MeetingKind, string> = {
  visio: 'Visio',
  physique: 'Sur place',
  telephone: 'Téléphone',
  autre: 'Autre',
};

export function ProjectCollaboration({ projectId, clientId }: ProjectCollaborationProps) {
  return (
    <div className="space-y-6">
      <ChangeRequestsBlock projectId={projectId} clientId={clientId} />
      <MeetingNotesBlock projectId={projectId} clientId={clientId} />
    </div>
  );
}

/* ──────────────────── Change Requests ──────────────────── */

function ChangeRequestsBlock({
  projectId,
  clientId,
}: {
  projectId: string;
  clientId: string;
}) {
  const { items, loading, create, estimate, setStatus, remove } = useChangeRequests(projectId);
  const [showNew, setShowNew] = useState(false);
  const [newDesc, setNewDesc] = useState('');
  const [newUrgency, setNewUrgency] = useState<ChangeRequestUrgency>('normal');
  const [submitting, setSubmitting] = useState(false);

  const [estimating, setEstimating] = useState<string | null>(null);
  const [estDays, setEstDays] = useState('');
  const [estAmount, setEstAmount] = useState('');
  const [estNotes, setEstNotes] = useState('');

  const [confirmDelete, setConfirmDelete] = useState<ChangeRequest | null>(null);

  const handleCreate = async () => {
    if (!newDesc.trim()) return;
    setSubmitting(true);
    try {
      await create({ projectId, clientId, description: newDesc.trim(), urgency: newUrgency });
      setNewDesc('');
      setNewUrgency('normal');
      setShowNew(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEstimate = async (id: string) => {
    const days = Number(estDays);
    const amount = Number(estAmount);
    if (!days || !amount) return;
    await estimate(id, days, amount, estNotes);
    setEstimating(null);
    setEstDays('');
    setEstAmount('');
    setEstNotes('');
  };

  return (
    <section className="space-y-3">
      <header className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <GitPullRequestArrow size={16} className="text-ws-accent" />
          <h3 className="font-display text-base font-bold text-ws-paper">
            Demandes de modification
          </h3>
          <span className="text-[10px] font-mono text-ws-mist">({items.length})</span>
        </div>
        <Button
          size="sm"
          variant="secondary"
          icon={<Plus size={14} />}
          onClick={() => setShowNew((v) => !v)}
          className="normal-case tracking-normal"
        >
          Nouvelle demande
        </Button>
      </header>

      {showNew && (
        <div className="ws-card rounded-2xl border border-ws-accent/30 bg-ws-accent/[0.04] p-4 space-y-3">
          <textarea
            rows={3}
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            placeholder="Description de la modification demandée…"
            className="w-full px-3 py-2 rounded-lg bg-ws-panel border border-ws-line text-ws-paper text-sm focus:outline-none focus:border-ws-accent resize-none"
          />
          <div className="flex items-center gap-3 flex-wrap">
            <select
              value={newUrgency}
              onChange={(e) => setNewUrgency(e.target.value as ChangeRequestUrgency)}
              className="px-3 py-2 rounded-lg bg-ws-panel border border-ws-line text-ws-paper text-sm focus:outline-none focus:border-ws-accent"
            >
              <option value="low">Urgence faible</option>
              <option value="normal">Urgence normale</option>
              <option value="high">Urgence élevée</option>
              <option value="urgent">Urgent</option>
            </select>
            <Button size="sm" onClick={handleCreate} loading={submitting} className="normal-case tracking-normal">
              Créer
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setShowNew(false);
                setNewDesc('');
              }}
              className="normal-case tracking-normal"
            >
              Annuler
            </Button>
          </div>
        </div>
      )}

      <div className="ws-card rounded-2xl border border-ws-line overflow-hidden">
        {loading && items.length === 0 ? (
          <p className="text-sm text-ws-mist py-6 text-center font-mono">Chargement…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-ws-mist py-8 text-center font-mono">
            Aucune demande de modification pour ce projet.
          </p>
        ) : (
          <div className="divide-y divide-ws-line/60">
            {items.map((cr) => (
              <div key={cr.id} className="px-4 py-3.5 hover:bg-ws-raised/30 transition-colors">
                <div className="flex items-start gap-3 mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[9px] font-mono uppercase tracking-[0.15em] ${STATUS_TONE[cr.status]}`}
                      >
                        {STATUS_LABEL[cr.status]}
                      </span>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[9px] font-mono uppercase tracking-[0.15em] ${URGENCY_TONE[cr.urgency]}`}
                      >
                        {URGENCY_LABEL[cr.urgency]}
                      </span>
                      <span className="text-[10px] font-mono text-ws-mist">
                        {formatDate(cr.submitted_at)}
                      </span>
                    </div>
                    <p className="text-sm text-ws-paper leading-relaxed whitespace-pre-wrap">
                      {cr.description}
                    </p>
                    {cr.estimated_days != null && cr.estimated_amount != null && (
                      <p className="text-xs font-mono text-ws-accent mt-2">
                        Estimation : {cr.estimated_days} j · {formatCurrency(cr.estimated_amount)} HT
                      </p>
                    )}
                    {cr.rejection_reason && (
                      <p className="text-xs text-red-300 mt-2 italic">
                        Refusé : {cr.rejection_reason}
                      </p>
                    )}
                    {cr.admin_notes && (
                      <p className="text-[11px] text-ws-mist mt-1 italic">
                        Note interne : {cr.admin_notes}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(cr)}
                    className="p-1.5 rounded-md text-ws-mist hover:text-red-400 hover:bg-red-500/10 transition-colors flex-shrink-0"
                    aria-label="Supprimer"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>

                {/* Actions admin */}
                {cr.status === 'submitted' && estimating !== cr.id && (
                  <button
                    type="button"
                    onClick={() => {
                      setEstimating(cr.id);
                      setEstDays(cr.estimated_days?.toString() ?? '');
                      setEstAmount(cr.estimated_amount?.toString() ?? '');
                      setEstNotes(cr.admin_notes ?? '');
                    }}
                    className="text-[10px] font-mono uppercase tracking-[0.15em] text-ws-accent hover:text-ws-accent-soft underline"
                  >
                    Chiffrer
                  </button>
                )}

                {estimating === cr.id && (
                  <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input
                      type="number"
                      step="0.5"
                      value={estDays}
                      onChange={(e) => setEstDays(e.target.value)}
                      placeholder="Jours"
                      className="px-2.5 py-1.5 rounded-md bg-ws-panel border border-ws-line text-ws-paper text-xs font-mono focus:outline-none focus:border-ws-accent"
                    />
                    <input
                      type="number"
                      value={estAmount}
                      onChange={(e) => setEstAmount(e.target.value)}
                      placeholder="Montant € HT"
                      className="px-2.5 py-1.5 rounded-md bg-ws-panel border border-ws-line text-ws-paper text-xs font-mono focus:outline-none focus:border-ws-accent"
                    />
                    <div className="flex gap-1">
                      <Button size="sm" onClick={() => void handleEstimate(cr.id)} className="normal-case tracking-normal flex-1">
                        Valider
                      </Button>
                      <button
                        type="button"
                        onClick={() => setEstimating(null)}
                        className="px-2 text-[10px] font-mono text-ws-mist hover:text-ws-paper"
                      >
                        ✕
                      </button>
                    </div>
                    <input
                      type="text"
                      value={estNotes}
                      onChange={(e) => setEstNotes(e.target.value)}
                      placeholder="Note interne"
                      className="sm:col-span-3 px-2.5 py-1.5 rounded-md bg-ws-panel border border-ws-line text-ws-paper text-xs focus:outline-none focus:border-ws-accent"
                    />
                  </div>
                )}

                {cr.status === 'approved' && (
                  <button
                    type="button"
                    onClick={() => void setStatus(cr.id, 'completed')}
                    className="text-[10px] font-mono uppercase tracking-[0.15em] text-emerald-300 hover:text-emerald-200 underline"
                  >
                    Marquer comme réalisée
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={!!confirmDelete}
        title="Supprimer cette demande ?"
        description="Cette action est irréversible."
        onConfirm={async () => {
          if (confirmDelete) await remove(confirmDelete.id);
          setConfirmDelete(null);
        }}
        onClose={() => setConfirmDelete(null)}
      />
    </section>
  );
}

/* ──────────────────── Meeting notes ──────────────────── */

function MeetingNotesBlock({
  projectId,
  clientId,
}: {
  projectId: string;
  clientId: string;
}) {
  const { items, loading, create, remove } = useMeetingNotes(projectId);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({
    meetingDate: new Date().toISOString().slice(0, 10),
    durationMinutes: '',
    attendees: '',
    kind: 'visio' as MeetingKind,
    title: '',
    decisions: '',
    actions: '',
    nextSteps: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<MeetingNote | null>(null);

  const handleCreate = async () => {
    if (!form.title.trim()) return;
    setSubmitting(true);
    try {
      await create({
        projectId,
        clientId,
        meetingDate: form.meetingDate,
        durationMinutes: form.durationMinutes ? Number(form.durationMinutes) : null,
        attendees: form.attendees,
        kind: form.kind,
        title: form.title.trim(),
        decisions: form.decisions,
        actions: form.actions,
        nextSteps: form.nextSteps,
      });
      setShowNew(false);
      setForm({
        meetingDate: new Date().toISOString().slice(0, 10),
        durationMinutes: '',
        attendees: '',
        kind: 'visio',
        title: '',
        decisions: '',
        actions: '',
        nextSteps: '',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="space-y-3">
      <header className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <CalendarClock size={16} className="text-ws-accent" />
          <h3 className="font-display text-base font-bold text-ws-paper">
            Comptes-rendus de réunion
          </h3>
          <span className="text-[10px] font-mono text-ws-mist">({items.length})</span>
        </div>
        <Button
          size="sm"
          variant="secondary"
          icon={<Plus size={14} />}
          onClick={() => setShowNew((v) => !v)}
          className="normal-case tracking-normal"
        >
          Nouveau CR
        </Button>
      </header>

      {showNew && (
        <div className="ws-card rounded-2xl border border-ws-accent/30 bg-ws-accent/[0.04] p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <input
              type="date"
              value={form.meetingDate}
              onChange={(e) => setForm((s) => ({ ...s, meetingDate: e.target.value }))}
              className="px-3 py-2 rounded-lg bg-ws-panel border border-ws-line text-ws-paper text-sm font-mono focus:outline-none focus:border-ws-accent"
            />
            <input
              type="number"
              value={form.durationMinutes}
              onChange={(e) => setForm((s) => ({ ...s, durationMinutes: e.target.value }))}
              placeholder="Durée (min)"
              className="px-3 py-2 rounded-lg bg-ws-panel border border-ws-line text-ws-paper text-sm font-mono focus:outline-none focus:border-ws-accent"
            />
            <select
              value={form.kind}
              onChange={(e) => setForm((s) => ({ ...s, kind: e.target.value as MeetingKind }))}
              className="px-3 py-2 rounded-lg bg-ws-panel border border-ws-line text-ws-paper text-sm focus:outline-none focus:border-ws-accent"
            >
              <option value="visio">Visio</option>
              <option value="physique">Sur place</option>
              <option value="telephone">Téléphone</option>
              <option value="autre">Autre</option>
            </select>
          </div>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))}
            placeholder="Titre du compte-rendu"
            className="w-full px-3 py-2 rounded-lg bg-ws-panel border border-ws-line text-ws-paper text-sm focus:outline-none focus:border-ws-accent"
          />
          <input
            type="text"
            value={form.attendees}
            onChange={(e) => setForm((s) => ({ ...s, attendees: e.target.value }))}
            placeholder="Présents (ex: Matis, Linda Denfer Kadiri)"
            className="w-full px-3 py-2 rounded-lg bg-ws-panel border border-ws-line text-ws-paper text-sm focus:outline-none focus:border-ws-accent"
          />
          <textarea
            rows={3}
            value={form.decisions}
            onChange={(e) => setForm((s) => ({ ...s, decisions: e.target.value }))}
            placeholder="Décisions prises"
            className="w-full px-3 py-2 rounded-lg bg-ws-panel border border-ws-line text-ws-paper text-sm focus:outline-none focus:border-ws-accent resize-none"
          />
          <textarea
            rows={3}
            value={form.actions}
            onChange={(e) => setForm((s) => ({ ...s, actions: e.target.value }))}
            placeholder="Actions à mener (avec responsables)"
            className="w-full px-3 py-2 rounded-lg bg-ws-panel border border-ws-line text-ws-paper text-sm focus:outline-none focus:border-ws-accent resize-none"
          />
          <textarea
            rows={2}
            value={form.nextSteps}
            onChange={(e) => setForm((s) => ({ ...s, nextSteps: e.target.value }))}
            placeholder="Prochaines étapes"
            className="w-full px-3 py-2 rounded-lg bg-ws-panel border border-ws-line text-ws-paper text-sm focus:outline-none focus:border-ws-accent resize-none"
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleCreate} loading={submitting} className="normal-case tracking-normal">
              Enregistrer le CR
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowNew(false)} className="normal-case tracking-normal">
              Annuler
            </Button>
          </div>
        </div>
      )}

      <div className="ws-card rounded-2xl border border-ws-line overflow-hidden">
        {loading && items.length === 0 ? (
          <p className="text-sm text-ws-mist py-6 text-center font-mono">Chargement…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-ws-mist py-8 text-center font-mono">
            Aucun compte-rendu pour ce projet.
          </p>
        ) : (
          <div className="divide-y divide-ws-line/60">
            {items.map((mn) => (
              <div key={mn.id} className="px-4 py-3.5 hover:bg-ws-raised/30 transition-colors">
                <div className="flex items-start justify-between gap-3 mb-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-mono text-ws-mist tabular-nums">
                      {formatDate(mn.meeting_date)}
                    </span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full border bg-ws-deep/40 border-ws-line text-[9px] font-mono uppercase tracking-[0.15em] text-ws-mist">
                      {MEETING_KIND_LABEL[mn.meeting_kind]}
                    </span>
                    {mn.meeting_duration_minutes && (
                      <span className="text-[10px] font-mono text-ws-mist">
                        {mn.meeting_duration_minutes} min
                      </span>
                    )}
                    {mn.validated_at && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border bg-emerald-500/12 border-emerald-500/30 text-emerald-300 text-[9px] font-mono uppercase tracking-[0.15em]">
                        <ShieldCheck size={9} />
                        Validé
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(mn)}
                    className="p-1 rounded-md text-ws-mist hover:text-red-400 hover:bg-red-500/10"
                    aria-label="Supprimer"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
                <p className="text-sm font-medium text-ws-paper">{mn.title}</p>
                {mn.meeting_attendees && (
                  <p className="text-[11px] font-mono text-ws-mist mt-0.5">
                    Présents : {mn.meeting_attendees}
                  </p>
                )}
                {mn.decisions && (
                  <details className="mt-2 group">
                    <summary className="cursor-pointer text-[10px] font-mono uppercase tracking-[0.15em] text-ws-accent">
                      Décisions, actions, prochaines étapes
                    </summary>
                    <div className="mt-2 space-y-2 text-xs text-ws-ink whitespace-pre-wrap">
                      {mn.decisions && (
                        <div>
                          <strong className="text-ws-paper">Décisions :</strong>
                          <p>{mn.decisions}</p>
                        </div>
                      )}
                      {mn.actions && (
                        <div>
                          <strong className="text-ws-paper">Actions :</strong>
                          <p>{mn.actions}</p>
                        </div>
                      )}
                      {mn.next_steps && (
                        <div>
                          <strong className="text-ws-paper">Prochaines étapes :</strong>
                          <p>{mn.next_steps}</p>
                        </div>
                      )}
                    </div>
                  </details>
                )}
                {mn.validated_at && mn.validated_by_signature && (
                  <p className="text-[10px] font-mono text-emerald-300/80 mt-2 flex items-center gap-1">
                    <CheckCircle2 size={10} />
                    Validé par {mn.validated_by_signature} le {formatDate(mn.validated_at)}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={!!confirmDelete}
        title="Supprimer ce compte-rendu ?"
        description="Cette action est irréversible."
        onConfirm={async () => {
          if (confirmDelete) await remove(confirmDelete.id);
          setConfirmDelete(null);
        }}
        onClose={() => setConfirmDelete(null)}
      />
    </section>
  );
}
