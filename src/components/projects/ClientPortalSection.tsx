import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CheckCircle2,
  Circle,
  Clock,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Pencil,
  Send,
  MessageSquare,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { useProjectSteps } from '../../hooks/useProjectSteps';
import { usePortalMessages } from '../../hooks/usePortalMessages';
import type { ProjectStep, ProjectStepStatus } from '../../lib/types';

interface ClientPortalSectionProps {
  projectId: string;
}

const STATUS_LABEL: Record<ProjectStepStatus, string> = {
  pending: 'À venir',
  in_progress: 'En cours',
  done: 'Terminée',
};

function StatusPill({ status }: { status: ProjectStepStatus }) {
  const styles: Record<ProjectStepStatus, string> = {
    pending: 'bg-ws-deep/40 text-ws-mist border-ws-line',
    in_progress: 'bg-ws-accent/15 text-ws-accent border-ws-accent/35',
    done: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-[0.18em] border ${styles[status]}`}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

function StepIcon({ status }: { status: ProjectStepStatus }) {
  if (status === 'done') return <CheckCircle2 size={20} className="text-emerald-400" />;
  if (status === 'in_progress') return <Clock size={20} className="text-ws-accent animate-pulse" />;
  return <Circle size={20} className="text-ws-mist/60" />;
}

export function ClientPortalSection({ projectId }: ClientPortalSectionProps) {
  const { steps, loading, error, createStep, updateStep, deleteStep, reorder } = useProjectSteps(projectId);
  const { messages, sendReply, markClientMessagesRead, unreadCount } = usePortalMessages(projectId);

  const [isAddingStep, setIsAddingStep] = useState(false);
  const [newStep, setNewStep] = useState({ title: '', description: '' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{
    title: string;
    description: string;
    phase: string;
    planned_start: string;
    planned_end: string;
    deliverable_url: string;
    requires_validation: boolean;
  }>({
    title: '',
    description: '',
    phase: '',
    planned_start: '',
    planned_end: '',
    deliverable_url: '',
    requires_validation: false,
  });

  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Marque les messages client comme lus quand l'admin ouvre la section
  useEffect(() => {
    if (unreadCount > 0) void markClientMessagesRead();
  }, [unreadCount, markClientMessagesRead]);

  // Auto-scroll en bas de la conversation
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length]);

  const progress = useMemo(() => {
    if (steps.length === 0) return 0;
    const done = steps.filter((s) => s.status === 'done').length;
    return Math.round((done / steps.length) * 100);
  }, [steps]);

  const handleCreate = async () => {
    if (!newStep.title.trim()) return;
    await createStep({
      title: newStep.title.trim(),
      description: newStep.description.trim() || null,
    });
    setNewStep({ title: '', description: '' });
    setIsAddingStep(false);
  };

  const startEdit = (step: ProjectStep) => {
    setEditingId(step.id);
    setEditForm({
      title: step.title,
      description: step.description ?? '',
      phase: step.phase ?? '',
      planned_start: step.planned_start ?? '',
      planned_end: step.planned_end ?? '',
      deliverable_url: step.deliverable_url ?? '',
      requires_validation: !!step.requires_validation,
    });
  };

  const saveEdit = async () => {
    if (!editingId || !editForm.title.trim()) return;
    await updateStep(editingId, {
      title: editForm.title.trim(),
      description: editForm.description.trim() || null,
      phase: (editForm.phase || null) as ProjectStep['phase'],
      planned_start: editForm.planned_start || null,
      planned_end: editForm.planned_end || null,
      deliverable_url: editForm.deliverable_url.trim() || null,
      requires_validation: editForm.requires_validation,
    });
    setEditingId(null);
  };

  const cycleStatus = async (step: ProjectStep) => {
    const next: ProjectStepStatus =
      step.status === 'pending' ? 'in_progress' : step.status === 'in_progress' ? 'done' : 'pending';
    await updateStep(step.id, { status: next });
  };

  const moveStep = async (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= steps.length) return;
    const copy = [...steps];
    [copy[index], copy[target]] = [copy[target], copy[index]];
    await reorder(copy.map((s) => s.id));
  };

  const handleSendReply = async () => {
    const content = reply.trim();
    if (!content) return;
    setSending(true);
    try {
      await sendReply(content);
      setReply('');
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="space-y-6">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-base font-bold text-ws-paper">Espace client</h3>
          <p className="text-xs font-mono text-ws-mist mt-0.5">
            Étapes visibles par le client + messagerie
          </p>
        </div>
        {steps.length > 0 && (
          <div className="flex items-center gap-2 text-xs font-mono">
            <div className="w-32 h-1.5 bg-ws-deep/60 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-ws-accent-muted to-ws-accent rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-ws-accent font-semibold">{progress}%</span>
          </div>
        )}
      </header>

      {/* ─── Étapes ─── */}
      <div className="ws-card rounded-2xl border border-ws-line overflow-hidden">
        <div className="px-4 py-3 border-b border-ws-line flex items-center justify-between bg-ws-deep/30">
          <h4 className="text-sm font-semibold text-ws-paper">Timeline du projet</h4>
          <Button
            size="sm"
            variant="secondary"
            icon={<Plus size={14} />}
            onClick={() => setIsAddingStep((v) => !v)}
            className="normal-case tracking-normal"
          >
            {isAddingStep ? 'Annuler' : 'Nouvelle étape'}
          </Button>
        </div>

        {error && (
          <div className="px-4 py-3 text-xs text-red-300 bg-red-500/10 border-b border-red-500/20 font-mono">
            {error}
          </div>
        )}

        {isAddingStep && (
          <div className="px-4 py-4 border-b border-ws-line bg-ws-deep/20 space-y-2">
            <input
              type="text"
              placeholder="Titre de l'étape (ex: Maquettes validées)"
              value={newStep.title}
              onChange={(e) => setNewStep((f) => ({ ...f, title: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-lg bg-ws-panel border border-ws-line text-ws-paper placeholder:text-ws-mist/60 text-sm focus:outline-none focus:border-ws-accent"
              autoFocus
            />
            <textarea
              placeholder="Description (facultatif)"
              value={newStep.description}
              onChange={(e) => setNewStep((f) => ({ ...f, description: e.target.value }))}
              rows={2}
              className="w-full px-3 py-2.5 rounded-lg bg-ws-panel border border-ws-line text-ws-paper placeholder:text-ws-mist/60 text-sm focus:outline-none focus:border-ws-accent resize-none"
            />
            <div className="flex gap-2 pt-1">
              <Button size="sm" onClick={handleCreate} className="normal-case tracking-normal">
                Ajouter
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setNewStep({ title: '', description: '' });
                  setIsAddingStep(false);
                }}
                className="normal-case tracking-normal"
              >
                Annuler
              </Button>
            </div>
          </div>
        )}

        <div className="divide-y divide-ws-line">
          {loading && steps.length === 0 ? (
            <p className="text-sm text-ws-mist py-8 text-center font-mono">Chargement…</p>
          ) : steps.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <p className="text-sm text-ws-mist mb-3">Aucune étape définie.</p>
              <p className="text-xs text-ws-mist/70 max-w-md mx-auto">
                Les étapes apparaîtront dans l'espace client. Créez une timeline claire pour rassurer le client sur l'avancement.
              </p>
            </div>
          ) : (
            steps.map((step, idx) => (
              <div
                key={step.id}
                className="px-4 py-3.5 flex items-start gap-3 hover:bg-ws-raised/30 transition-colors group"
              >
                <button
                  type="button"
                  onClick={() => cycleStatus(step)}
                  className="mt-0.5 flex-shrink-0"
                  aria-label={`Changer le statut : ${STATUS_LABEL[step.status]}`}
                  title="Cliquer pour changer le statut"
                >
                  <StepIcon status={step.status} />
                </button>

                <div className="flex-1 min-w-0">
                  {editingId === step.id ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={editForm.title}
                        onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                        className="w-full px-2.5 py-1.5 rounded-md bg-ws-panel border border-ws-line text-ws-paper text-sm focus:outline-none focus:border-ws-accent"
                        placeholder="Titre de l'étape"
                      />
                      <textarea
                        value={editForm.description}
                        onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                        rows={2}
                        className="w-full px-2.5 py-1.5 rounded-md bg-ws-panel border border-ws-line text-ws-paper text-sm focus:outline-none focus:border-ws-accent resize-none"
                        placeholder="Description"
                      />

                      {/* Champs avancés : phase, dates prévues, livrable, validation */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pt-1">
                        <select
                          value={editForm.phase}
                          onChange={(e) => setEditForm((f) => ({ ...f, phase: e.target.value }))}
                          className="px-2.5 py-1.5 rounded-md bg-ws-panel border border-ws-line text-ws-paper text-xs focus:outline-none focus:border-ws-accent"
                        >
                          <option value="">— Phase —</option>
                          <option value="analyse">01 Analyse</option>
                          <option value="conception">02 Conception</option>
                          <option value="dev">03 Développement</option>
                          <option value="ajustements">04 Ajustements</option>
                          <option value="livraison">05 Livraison</option>
                        </select>
                        <input
                          type="date"
                          value={editForm.planned_start}
                          onChange={(e) =>
                            setEditForm((f) => ({ ...f, planned_start: e.target.value }))
                          }
                          className="px-2.5 py-1.5 rounded-md bg-ws-panel border border-ws-line text-ws-paper text-xs font-mono focus:outline-none focus:border-ws-accent"
                          placeholder="Début"
                          aria-label="Date de début prévue"
                        />
                        <input
                          type="date"
                          value={editForm.planned_end}
                          onChange={(e) =>
                            setEditForm((f) => ({ ...f, planned_end: e.target.value }))
                          }
                          className="px-2.5 py-1.5 rounded-md bg-ws-panel border border-ws-line text-ws-paper text-xs font-mono focus:outline-none focus:border-ws-accent"
                          aria-label="Date de fin prévue"
                        />
                      </div>
                      <input
                        type="url"
                        value={editForm.deliverable_url}
                        onChange={(e) =>
                          setEditForm((f) => ({ ...f, deliverable_url: e.target.value }))
                        }
                        className="w-full px-2.5 py-1.5 rounded-md bg-ws-panel border border-ws-line text-ws-paper text-xs focus:outline-none focus:border-ws-accent"
                        placeholder="URL livrable (staging, Figma, preview…)"
                      />
                      <label className="inline-flex items-center gap-2 cursor-pointer text-[11px] font-mono text-ws-mist select-none">
                        <input
                          type="checkbox"
                          checked={editForm.requires_validation}
                          onChange={(e) =>
                            setEditForm((f) => ({ ...f, requires_validation: e.target.checked }))
                          }
                          className="w-3.5 h-3.5 rounded accent-ws-accent"
                        />
                        Validation client requise pour cette étape
                      </label>

                      <div className="flex gap-2">
                        <Button size="sm" onClick={saveEdit} className="normal-case tracking-normal">
                          Enregistrer
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingId(null)}
                          className="normal-case tracking-normal"
                        >
                          Annuler
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center flex-wrap gap-2">
                        <span className="text-[10px] font-mono text-ws-mist">
                          {String(idx + 1).padStart(2, '0')}
                        </span>
                        <span className="font-medium text-ws-paper text-sm">{step.title}</span>
                        <StatusPill status={step.status} />
                      </div>
                      {step.description && (
                        <p className="text-xs text-ws-ink mt-1 leading-relaxed">{step.description}</p>
                      )}
                    </>
                  )}
                </div>

                {editingId !== step.id && (
                  <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => moveStep(idx, -1)}
                      disabled={idx === 0}
                      className="p-1.5 rounded-md text-ws-mist hover:text-ws-paper hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed"
                      aria-label="Monter"
                    >
                      <ChevronUp size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveStep(idx, 1)}
                      disabled={idx === steps.length - 1}
                      className="p-1.5 rounded-md text-ws-mist hover:text-ws-paper hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed"
                      aria-label="Descendre"
                    >
                      <ChevronDown size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => startEdit(step)}
                      className="p-1.5 rounded-md text-ws-mist hover:text-ws-accent hover:bg-ws-accent/10"
                      aria-label="Modifier"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => void deleteStep(step.id)}
                      className="p-1.5 rounded-md text-ws-mist hover:text-red-400 hover:bg-red-500/10"
                      aria-label="Supprimer"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* ─── Messagerie ─── */}
      <div className="ws-card rounded-2xl border border-ws-line overflow-hidden">
        <div className="px-4 py-3 border-b border-ws-line flex items-center justify-between bg-ws-deep/30">
          <div className="flex items-center gap-2">
            <MessageSquare size={14} className="text-ws-accent" />
            <h4 className="text-sm font-semibold text-ws-paper">Conversation avec le client</h4>
            {unreadCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-ws-accent/20 text-ws-accent text-[10px] font-mono font-semibold">
                {unreadCount} nouveau{unreadCount > 1 ? 'x' : ''}
              </span>
            )}
          </div>
          <span className="text-[10px] font-mono text-ws-mist">
            {messages.length} message{messages.length > 1 ? 's' : ''}
          </span>
        </div>

        <div className="max-h-96 overflow-y-auto px-4 py-4 space-y-3 bg-ws-deep/10 scrollbar-ws">
          {messages.length === 0 ? (
            <p className="text-sm text-ws-mist text-center py-8 font-mono">
              Aucun message. La conversation apparaîtra ici lorsque le client écrira.
            </p>
          ) : (
            messages.map((m) => {
              const isTeam = m.sender === 'team';
              return (
                <div
                  key={m.id}
                  className={`flex ${isTeam ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[82%] rounded-2xl px-4 py-2.5 ${
                      isTeam
                        ? 'bg-ws-accent text-ws-void rounded-br-sm'
                        : 'bg-ws-panel border border-ws-line text-ws-paper rounded-bl-sm'
                    }`}
                  >
                    <div
                      className={`text-[10px] font-mono uppercase tracking-[0.2em] mb-1 ${
                        isTeam ? 'text-ws-void/60' : 'text-ws-mist'
                      }`}
                    >
                      {isTeam ? 'MAPA' : 'Client'}
                      <span className="ml-2 normal-case tracking-normal">
                        {new Date(m.created_at).toLocaleString('fr-FR', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{m.content}</p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="border-t border-ws-line p-3 bg-ws-deep/20">
          <div className="flex gap-2">
            <textarea
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  void handleSendReply();
                }
              }}
              rows={2}
              placeholder="Répondre au client…  (⌘+Entrée pour envoyer)"
              className="flex-1 px-3 py-2 rounded-lg bg-ws-panel border border-ws-line text-ws-paper placeholder:text-ws-mist/60 text-sm focus:outline-none focus:border-ws-accent resize-none"
            />
            <Button
              onClick={handleSendReply}
              loading={sending}
              disabled={!reply.trim()}
              icon={<Send size={14} />}
              className="normal-case tracking-normal self-stretch"
            >
              Envoyer
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
