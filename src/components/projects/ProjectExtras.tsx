import { useState } from 'react';
import {
  Star,
  ShieldCheck,
  Lightbulb,
  Loader2,
  CheckCircle2,
  XCircle,
  Trash2,
  Plus,
  MessageSquare,
  CheckCheck,
  Send,
  Globe2,
  EyeOff,
} from 'lucide-react';
import { useProjectExtras } from '../../hooks/useProjectExtras';
import type {
  NdaStatus,
  SuggestionStatus,
} from '../../lib/types';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { formatDate, formatDateTime } from '../../lib/utils';

interface ProjectExtrasProps {
  projectId: string;
  clientId: string;
}

const SUGGESTION_STATUS_LABEL: Record<SuggestionStatus, string> = {
  new: 'Nouvelle',
  considering: 'À l’étude',
  planned: 'Planifiée',
  done: 'Réalisée',
  declined: 'Déclinée',
};

const SUGGESTION_STATUS_TONE: Record<SuggestionStatus, string> = {
  new: 'bg-sky-500/10 text-sky-300 border-sky-500/30',
  considering: 'bg-amber-500/12 text-amber-300 border-amber-500/35',
  planned: 'bg-indigo-500/12 text-indigo-300 border-indigo-500/35',
  done: 'bg-emerald-500/12 text-emerald-300 border-emerald-500/35',
  declined: 'bg-ws-deep/40 text-ws-mist border-ws-line',
};

const NDA_STATUS_LABEL: Record<NdaStatus, string> = {
  draft: 'Brouillon',
  sent: 'Envoyé',
  signed: 'Signé',
  expired: 'Expiré',
  cancelled: 'Annulé',
};

const NDA_STATUS_TONE: Record<NdaStatus, string> = {
  draft: 'bg-ws-deep/40 text-ws-mist border-ws-line',
  sent: 'bg-sky-500/10 text-sky-300 border-sky-500/30',
  signed: 'bg-emerald-500/12 text-emerald-300 border-emerald-500/35',
  expired: 'bg-amber-500/12 text-amber-300 border-amber-500/35',
  cancelled: 'bg-red-500/12 text-red-300 border-red-500/35',
};

export function ProjectExtras({ projectId, clientId }: ProjectExtrasProps) {
  const {
    testimonials,
    ndas,
    suggestions,
    loading,
    error,
    approveTestimonial,
    rejectTestimonial,
    removeTestimonial,
    createNda,
    setNdaStatus,
    removeNda,
    respondSuggestion,
    removeSuggestion,
  } = useProjectExtras(projectId);

  if (loading && !testimonials.length && !ndas.length && !suggestions.length) {
    return (
      <section className="ws-card rounded-lg p-6 flex items-center gap-2 text-ws-mist">
        <Loader2 size={14} className="animate-spin" />
        <span className="font-mono text-sm">Chargement…</span>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="ws-card rounded-lg p-4 border-red-500/30 bg-red-500/[0.05] text-xs text-red-300 font-mono">
          {error}
        </div>
      )}

      <TestimonialsBlock
        items={testimonials}
        onApprove={approveTestimonial}
        onReject={rejectTestimonial}
        onRemove={removeTestimonial}
      />

      <NdaBlock
        items={ndas}
        clientId={clientId}
        onCreate={createNda}
        onSetStatus={setNdaStatus}
        onRemove={removeNda}
      />

      <SuggestionsBlock
        items={suggestions}
        onRespond={respondSuggestion}
        onRemove={removeSuggestion}
      />
    </div>
  );
}

/* ─── Témoignages ─── */

function TestimonialsBlock({
  items,
  onApprove,
  onReject,
  onRemove,
}: {
  items: import('../../lib/types').Testimonial[];
  onApprove: (id: string) => Promise<unknown>;
  onReject: (id: string, reason: string) => Promise<unknown>;
  onRemove: (id: string) => Promise<unknown>;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  return (
    <section className="ws-card rounded-lg p-6">
      <header className="flex items-center gap-2 mb-4">
        <Star size={15} className="text-ws-accent" />
        <h3 className="font-display text-lg font-bold text-ws-paper tracking-tight">
          Témoignages clients
        </h3>
        <span className="text-[11px] font-mono text-ws-mist">{items.length}</span>
      </header>

      {items.length === 0 ? (
        <p className="text-sm text-ws-mist font-mono">
          Aucun témoignage soumis. Le client pourra en laisser un depuis son espace.
        </p>
      ) : (
        <div className="space-y-3">
          {items.map((t) => (
            <div
              key={t.id}
              className={`rounded-2xl border px-4 py-3 ${
                t.approved
                  ? 'border-emerald-500/35 bg-emerald-500/[0.04]'
                  : 'border-ws-line bg-ws-deep/20'
              }`}
            >
              <div className="flex items-start justify-between gap-3 flex-wrap mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-0.5 text-amber-300">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        size={13}
                        fill={i < t.rating ? 'currentColor' : 'transparent'}
                        strokeWidth={1.5}
                      />
                    ))}
                  </div>
                  <span className="text-[10px] font-mono text-ws-mist">
                    signé {formatDateTime(t.signed_at)}
                  </span>
                  {t.approved && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-[9px] font-mono uppercase tracking-[0.15em]">
                      <CheckCheck size={10} /> Approuvé
                    </span>
                  )}
                  {t.allow_public && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-sky-500/12 border border-sky-500/35 text-sky-300 text-[9px] font-mono uppercase tracking-[0.15em]">
                      <Globe2 size={10} /> Diffusion publique OK
                    </span>
                  )}
                  {t.allow_logo && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-indigo-500/12 border border-indigo-500/35 text-indigo-300 text-[9px] font-mono uppercase tracking-[0.15em]">
                      Logo OK
                    </span>
                  )}
                </div>
              </div>

              <p className="text-sm text-ws-paper whitespace-pre-wrap leading-relaxed mb-2">
                « {t.content} »
              </p>
              <p className="text-xs text-ws-mist font-mono">
                — {t.author_signature}
                {t.author_role && <span className="text-ws-mist/70"> · {t.author_role}</span>}
              </p>

              {t.rejection_reason && (
                <p className="mt-2 text-xs text-red-300/90 bg-red-500/[0.05] border border-red-500/20 rounded-md px-2 py-1.5">
                  <strong>Refusé :</strong> {t.rejection_reason}
                </p>
              )}

              {rejecting === t.id ? (
                <div className="mt-2 space-y-2">
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={2}
                    placeholder="Motif du refus (optionnel)"
                    className="w-full px-3 py-2 rounded-lg bg-ws-deep/50 border border-ws-line text-ws-paper text-xs focus:outline-none focus:border-red-500/40"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setRejecting(null);
                        setReason('');
                      }}
                      className="px-3 py-1.5 rounded-lg border border-ws-line text-ws-mist text-[11px] font-mono uppercase tracking-[0.15em]"
                    >
                      Annuler
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        setBusyId(t.id);
                        await onReject(t.id, reason);
                        setRejecting(null);
                        setReason('');
                        setBusyId(null);
                      }}
                      disabled={busyId === t.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/15 hover:bg-red-500/25 border border-red-500/40 text-red-300 text-[11px] font-mono uppercase tracking-[0.15em] disabled:opacity-50"
                    >
                      {busyId === t.id && <Loader2 size={11} className="animate-spin" />}
                      Refuser
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {!t.approved && (
                    <button
                      type="button"
                      onClick={async () => {
                        setBusyId(t.id);
                        await onApprove(t.id);
                        setBusyId(null);
                      }}
                      disabled={busyId === t.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 text-xs font-mono uppercase tracking-[0.15em] disabled:opacity-50"
                    >
                      {busyId === t.id ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle2 size={11} />}
                      Approuver
                    </button>
                  )}
                  {t.approved && (
                    <button
                      type="button"
                      onClick={() => setRejecting(t.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-ws-line text-ws-mist hover:text-ws-paper hover:border-amber-500/30 text-xs font-mono uppercase tracking-[0.15em]"
                    >
                      <EyeOff size={11} /> Dépublier
                    </button>
                  )}
                  {!t.approved && (
                    <button
                      type="button"
                      onClick={() => setRejecting(t.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-ws-line text-ws-mist hover:text-ws-paper hover:border-red-500/30 text-xs font-mono uppercase tracking-[0.15em]"
                    >
                      <XCircle size={11} /> Refuser
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(t.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-ws-line text-ws-mist hover:text-red-300 hover:border-red-500/30 text-xs font-mono uppercase tracking-[0.15em] ml-auto"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        isOpen={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        onConfirm={async () => {
          if (confirmDelete) await onRemove(confirmDelete);
          setConfirmDelete(null);
        }}
        title="Supprimer ce témoignage ?"
        description="Action définitive."
      />
    </section>
  );
}

/* ─── NDA ─── */

function NdaBlock({
  items,
  clientId,
  onCreate,
  onSetStatus,
  onRemove,
}: {
  items: import('../../lib/types').NdaAgreement[];
  clientId: string;
  onCreate: (input: { clientId: string; title: string; content: string; expiresAt?: string | null }) => Promise<unknown>;
  onSetStatus: (id: string, status: NdaStatus) => Promise<unknown>;
  onRemove: (id: string) => Promise<unknown>;
}) {
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  return (
    <section className="ws-card rounded-lg p-6">
      <header className="flex items-center justify-between gap-3 flex-wrap mb-4">
        <div className="flex items-center gap-2">
          <ShieldCheck size={15} className="text-ws-accent" />
          <h3 className="font-display text-lg font-bold text-ws-paper tracking-tight">
            Accords de confidentialité (NDA)
          </h3>
          <span className="text-[11px] font-mono text-ws-mist">{items.length}</span>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-ws-accent/15 hover:bg-ws-accent/25 border border-ws-accent/40 text-ws-accent text-xs font-mono uppercase tracking-[0.15em]"
        >
          <Plus size={12} />
          {showForm ? 'Annuler' : 'Nouveau NDA'}
        </button>
      </header>

      {showForm && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setSubmitting(true);
            try {
              await onCreate({
                clientId,
                title: title.trim(),
                content: content.trim(),
                expiresAt: expiresAt || null,
              });
              setTitle('');
              setContent('');
              setExpiresAt('');
              setShowForm(false);
            } finally {
              setSubmitting(false);
            }
          }}
          className="rounded-2xl border border-ws-line bg-ws-deep/15 p-4 mb-4 space-y-3"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-mono uppercase tracking-[0.18em] text-ws-mist mb-1.5">
                Titre
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                placeholder="NDA — projet refonte 2026"
                className="w-full px-3 py-2 rounded-lg bg-ws-deep/50 border border-ws-line text-ws-paper text-sm focus:outline-none focus:border-ws-accent/50"
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono uppercase tracking-[0.18em] text-ws-mist mb-1.5">
                Date d'expiration (optionnel)
              </label>
              <input
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-ws-deep/50 border border-ws-line text-ws-paper text-sm focus:outline-none focus:border-ws-accent/50"
              />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-mono uppercase tracking-[0.18em] text-ws-mist mb-1.5">
              Texte intégral du NDA
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
              rows={8}
              placeholder="Copier-coller le texte légal complet du NDA. Ce sera la version qui sera signée par le client."
              className="w-full px-3 py-2.5 rounded-lg bg-ws-deep/50 border border-ws-line text-ws-paper text-sm focus:outline-none focus:border-ws-accent/50"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-3 py-1.5 rounded-lg border border-ws-line text-ws-mist text-xs font-mono uppercase tracking-[0.15em]"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={submitting || !title.trim() || !content.trim()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-ws-accent text-ws-void text-xs font-semibold uppercase tracking-[0.15em] disabled:opacity-50 hover:brightness-110"
            >
              {submitting ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
              Envoyer au client
            </button>
          </div>
        </form>
      )}

      {items.length === 0 ? (
        <p className="text-sm text-ws-mist font-mono">Aucun NDA pour ce projet.</p>
      ) : (
        <div className="space-y-3">
          {items.map((n) => (
            <div key={n.id} className="rounded-2xl border border-ws-line bg-ws-deep/20 px-4 py-3">
              <div className="flex items-start justify-between gap-3 flex-wrap mb-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`inline-flex items-center px-1.5 py-0.5 rounded-full border text-[9px] font-mono uppercase tracking-[0.15em] ${NDA_STATUS_TONE[n.status]}`}
                  >
                    {NDA_STATUS_LABEL[n.status]}
                  </span>
                  <p className="text-sm font-medium text-ws-paper">{n.title}</p>
                  {n.expires_at && (
                    <span className="text-[10px] font-mono text-ws-mist">
                      · expire {formatDate(n.expires_at)}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(n.id)}
                  className="inline-flex items-center justify-center h-7 w-7 rounded-lg border border-ws-line text-ws-mist hover:text-red-300 hover:border-red-500/30"
                >
                  <Trash2 size={11} />
                </button>
              </div>
              {n.signed_at && (
                <p className="text-[11px] font-mono text-emerald-300 flex items-center gap-1.5">
                  <CheckCircle2 size={11} />
                  Signé {formatDateTime(n.signed_at)}
                  {n.signed_by_signature && ` — ${n.signed_by_signature}`}
                  {n.signed_by_ip && ` (IP ${n.signed_by_ip})`}
                </p>
              )}
              {n.status === 'sent' && (
                <button
                  type="button"
                  onClick={() => onSetStatus(n.id, 'cancelled')}
                  className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border border-ws-line text-ws-mist hover:text-red-300 hover:border-red-500/30 text-[11px] font-mono uppercase tracking-[0.15em]"
                >
                  <XCircle size={10} />
                  Annuler l’envoi
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        isOpen={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        onConfirm={async () => {
          if (confirmDelete) await onRemove(confirmDelete);
          setConfirmDelete(null);
        }}
        title="Supprimer ce NDA ?"
        description="Si signé, conservez plutôt l’historique. Action définitive."
      />
    </section>
  );
}

/* ─── Suggestions ─── */

function SuggestionsBlock({
  items,
  onRespond,
  onRemove,
}: {
  items: import('../../lib/types').ProjectSuggestion[];
  onRespond: (id: string, status: SuggestionStatus, response?: string | null) => Promise<unknown>;
  onRemove: (id: string) => Promise<unknown>;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [responseDraft, setResponseDraft] = useState('');
  const [statusDraft, setStatusDraft] = useState<SuggestionStatus>('considering');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  return (
    <section className="ws-card rounded-lg p-6">
      <header className="flex items-center gap-2 mb-4">
        <Lightbulb size={15} className="text-ws-accent" />
        <h3 className="font-display text-lg font-bold text-ws-paper tracking-tight">
          Suggestions du client
        </h3>
        <span className="text-[11px] font-mono text-ws-mist">{items.length}</span>
      </header>

      {items.length === 0 ? (
        <p className="text-sm text-ws-mist font-mono">
          Aucune suggestion pour l’instant. Le client peut soumettre des idées depuis son espace.
        </p>
      ) : (
        <div className="space-y-3">
          {items.map((s) => (
            <div key={s.id} className="rounded-2xl border border-ws-line bg-ws-deep/20 px-4 py-3">
              <div className="flex items-start justify-between gap-3 flex-wrap mb-2">
                <div className="flex items-center gap-2 flex-wrap min-w-0">
                  <span
                    className={`inline-flex items-center px-1.5 py-0.5 rounded-full border text-[9px] font-mono uppercase tracking-[0.15em] ${SUGGESTION_STATUS_TONE[s.status]}`}
                  >
                    {SUGGESTION_STATUS_LABEL[s.status]}
                  </span>
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-full border border-ws-line bg-ws-deep/40 text-ws-mist text-[9px] font-mono uppercase tracking-[0.15em]">
                    {s.kind}
                  </span>
                  <p className="text-sm font-medium text-ws-paper">{s.title}</p>
                  <span className="text-[10px] font-mono text-ws-mist">
                    · {formatDateTime(s.created_at)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(s.id)}
                  className="inline-flex items-center justify-center h-7 w-7 rounded-lg border border-ws-line text-ws-mist hover:text-red-300 hover:border-red-500/30"
                >
                  <Trash2 size={11} />
                </button>
              </div>

              {s.description && (
                <p className="text-sm text-ws-paper whitespace-pre-wrap leading-relaxed mb-2">
                  {s.description}
                </p>
              )}

              {s.submitted_by_signature && (
                <p className="text-[11px] font-mono text-ws-mist mb-2">— {s.submitted_by_signature}</p>
              )}

              {s.admin_response && (
                <div className="rounded-md border border-ws-accent/25 bg-ws-accent/[0.04] px-3 py-2 text-xs text-ws-paper">
                  <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-ws-accent/80 mb-1 inline-flex items-center gap-1">
                    <MessageSquare size={10} /> Réponse MAPA
                  </p>
                  <p className="whitespace-pre-wrap leading-relaxed">{s.admin_response}</p>
                </div>
              )}

              {editingId === s.id ? (
                <div className="mt-3 space-y-2">
                  <div className="flex flex-wrap gap-2">
                    {(['considering', 'planned', 'done', 'declined'] as SuggestionStatus[]).map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setStatusDraft(st)}
                        className={`inline-flex items-center px-2.5 py-1 rounded-lg border text-[10px] font-mono uppercase tracking-[0.15em] ${
                          statusDraft === st
                            ? SUGGESTION_STATUS_TONE[st]
                            : 'border-ws-line text-ws-mist hover:text-ws-paper'
                        }`}
                      >
                        {SUGGESTION_STATUS_LABEL[st]}
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={responseDraft}
                    onChange={(e) => setResponseDraft(e.target.value)}
                    rows={3}
                    placeholder="Réponse au client (optionnelle)"
                    className="w-full px-3 py-2 rounded-lg bg-ws-deep/50 border border-ws-line text-ws-paper text-xs focus:outline-none focus:border-ws-accent/50"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="px-3 py-1.5 rounded-lg border border-ws-line text-ws-mist text-[11px] font-mono uppercase tracking-[0.15em]"
                    >
                      Annuler
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        setBusyId(s.id);
                        await onRespond(s.id, statusDraft, responseDraft);
                        setEditingId(null);
                        setResponseDraft('');
                        setBusyId(null);
                      }}
                      disabled={busyId === s.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-ws-accent text-ws-void text-[11px] font-semibold uppercase tracking-[0.15em] disabled:opacity-50"
                    >
                      {busyId === s.id && <Loader2 size={11} className="animate-spin" />}
                      Enregistrer
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(s.id);
                    setResponseDraft(s.admin_response ?? '');
                    setStatusDraft(s.status === 'new' ? 'considering' : s.status);
                  }}
                  className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-ws-line text-ws-mist hover:text-ws-paper hover:border-ws-accent/30 text-xs font-mono uppercase tracking-[0.15em]"
                >
                  <MessageSquare size={11} />
                  Répondre / changer le statut
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        isOpen={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        onConfirm={async () => {
          if (confirmDelete) await onRemove(confirmDelete);
          setConfirmDelete(null);
        }}
        title="Supprimer cette suggestion ?"
        description="Action définitive."
      />
    </section>
  );
}

