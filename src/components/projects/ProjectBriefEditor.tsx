import { useEffect, useRef, useState } from 'react';
import {
  FileText,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Save,
  Lock,
  Figma,
  RefreshCw,
} from 'lucide-react';
import { useProjectBrief } from '../../hooks/useProjectBrief';
import { Button } from '../ui/Button';
import { ConfirmDialog } from '../ui/ConfirmDialog';

interface ProjectBriefEditorProps {
  projectId: string;
}

interface DraftState {
  objectives: string;
  scope_in: string;
  scope_out: string;
  constraints: string;
  deliverables: string;
  figma_url: string;
  notes: string;
}

const EMPTY_DRAFT: DraftState = {
  objectives: '',
  scope_in: '',
  scope_out: '',
  constraints: '',
  deliverables: '',
  figma_url: '',
  notes: '',
};

export function ProjectBriefEditor({ projectId }: ProjectBriefEditorProps) {
  const { brief, loading, error, upsert, clearValidation } = useProjectBrief(projectId);

  const [draft, setDraft] = useState<DraftState>(EMPTY_DRAFT);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [confirmInvalidate, setConfirmInvalidate] = useState(false);
  const initialized = useRef(false);

  // Sync draft from server when brief loads (or after refetch)
  useEffect(() => {
    if (brief) {
      setDraft({
        objectives: brief.objectives ?? '',
        scope_in: brief.scope_in ?? '',
        scope_out: brief.scope_out ?? '',
        constraints: brief.constraints ?? '',
        deliverables: brief.deliverables ?? '',
        figma_url: brief.figma_url ?? '',
        notes: brief.notes ?? '',
      });
    } else if (!loading && !initialized.current) {
      setDraft(EMPTY_DRAFT);
    }
    initialized.current = true;
  }, [brief, loading]);

  const isValidated = !!brief?.validated_at;
  const isDirty =
    !!brief &&
    (draft.objectives !== (brief.objectives ?? '') ||
      draft.scope_in !== (brief.scope_in ?? '') ||
      draft.scope_out !== (brief.scope_out ?? '') ||
      draft.constraints !== (brief.constraints ?? '') ||
      draft.deliverables !== (brief.deliverables ?? '') ||
      draft.figma_url !== (brief.figma_url ?? '') ||
      draft.notes !== (brief.notes ?? ''));

  const set = <K extends keyof DraftState>(key: K, value: DraftState[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await upsert({
        objectives: draft.objectives.trim() || null,
        scope_in: draft.scope_in.trim() || null,
        scope_out: draft.scope_out.trim() || null,
        constraints: draft.constraints.trim() || null,
        deliverables: draft.deliverables.trim() || null,
        figma_url: draft.figma_url.trim() || null,
        notes: draft.notes.trim() || null,
      });
      setSavedAt(Date.now());
      setTimeout(() => setSavedAt(null), 2000);
    } finally {
      setSaving(false);
    }
  };

  const handleInvalidate = async () => {
    try {
      await clearValidation();
    } finally {
      setConfirmInvalidate(false);
    }
  };

  return (
    <section className="space-y-4">
      <header className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h3 className="font-display text-base font-bold text-ws-paper flex items-center gap-2">
            <FileText size={16} className="text-ws-accent" />
            Brief &amp; spécifications
          </h3>
          <p className="text-xs font-mono text-ws-mist mt-0.5">
            Visible par le client dans son espace · validation = preuve juridique du périmètre
          </p>
        </div>

        <ValidationBadge brief={brief} />
      </header>

      {error && (
        <div
          className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300 font-mono"
          role="alert"
        >
          {error}
        </div>
      )}

      {loading && !brief ? (
        <div className="ws-card rounded-2xl border border-ws-line p-6 text-center text-sm text-ws-mist font-mono">
          <Loader2 size={16} className="inline mr-2 animate-spin" />
          Chargement du brief…
        </div>
      ) : (
        <div className="ws-card rounded-2xl border border-ws-line p-4 md:p-5 space-y-4">
          {isValidated && (
            <div
              className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 px-4 py-3 flex items-start gap-3"
              role="status"
            >
              <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0 text-xs text-emerald-200 font-mono leading-relaxed">
                <strong>Brief validé par le client</strong> le{' '}
                {new Date(brief!.validated_at!).toLocaleString('fr-FR')} ·
                signature : <strong>{brief!.validated_signature ?? '-'}</strong>
                {brief!.validated_by_ip && (
                  <span className="opacity-70"> · IP {brief!.validated_by_ip}</span>
                )}
                <p className="mt-2 text-[10px] opacity-80">
                  Toute modification ci-dessous invalidera la signature et nécessitera une
                  nouvelle validation client.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setConfirmInvalidate(true)}
                className="text-[10px] font-mono uppercase tracking-[0.15em] text-emerald-200/80 hover:text-red-300 underline"
              >
                Invalider
              </button>
            </div>
          )}

          {/* Champs */}
          <Field
            label="Objectifs business"
            hint="Pourquoi ce projet ? Quelles métriques de succès ?"
            value={draft.objectives}
            onChange={(v) => set('objectives', v)}
            rows={3}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field
              label="Périmètre inclus"
              hint="Une ligne par item — apparaît en puces"
              value={draft.scope_in}
              onChange={(v) => set('scope_in', v)}
              rows={6}
              tone="success"
              placeholder={`Création du site vitrine 5 pages\nIntégration responsive (mobile/desktop)\nRéférencement SEO de base\nMise en ligne et hébergement 1 an`}
            />
            <Field
              label="Hors périmètre"
              hint="Ce qui est explicitement EXCLU — protection anti-scope creep"
              value={draft.scope_out}
              onChange={(v) => set('scope_out', v)}
              rows={6}
              tone="warning"
              placeholder={`Rédaction des contenus (fournis par le client)\nCréation de logo / charte graphique\nFormation utilisateur au-delà de 1h\nMaintenance après livraison`}
            />
          </div>

          <Field
            label="Contraintes (techniques, légales, calendrier)"
            value={draft.constraints}
            onChange={(v) => set('constraints', v)}
            rows={3}
          />

          <Field
            label="Livrables attendus"
            hint="Ce que le client recevra à la fin"
            value={draft.deliverables}
            onChange={(v) => set('deliverables', v)}
            rows={4}
          />

          <div>
            <label className="form-label flex items-center gap-2">
              <Figma size={12} className="text-ws-accent" />
              Lien Figma / Maquettes
            </label>
            <input
              type="url"
              className="input font-mono text-sm"
              value={draft.figma_url}
              onChange={(e) => set('figma_url', e.target.value)}
              placeholder="https://www.figma.com/file/..."
            />
          </div>

          <Field
            label="Notes internes / commentaires libres"
            value={draft.notes}
            onChange={(v) => set('notes', v)}
            rows={2}
          />

          {/* Save bar */}
          <div className="flex items-center justify-between gap-3 pt-2 border-t border-ws-line">
            <div className="text-[10px] font-mono text-ws-mist flex items-center gap-2">
              {savedAt ? (
                <span className="text-emerald-300 flex items-center gap-1">
                  <CheckCircle2 size={11} /> Brief sauvegardé
                </span>
              ) : isDirty ? (
                <span className="text-ws-accent">Modifications non enregistrées</span>
              ) : brief ? (
                <span className="opacity-60">
                  Dernière mise à jour {new Date(brief.updated_at).toLocaleString('fr-FR')}
                </span>
              ) : (
                <span className="opacity-60">Aucun brief créé</span>
              )}
            </div>
            <Button
              size="sm"
              icon={<Save size={13} />}
              onClick={handleSave}
              loading={saving}
              disabled={!isDirty && !!brief}
              className="normal-case tracking-normal"
            >
              {brief ? 'Enregistrer' : 'Créer le brief'}
            </Button>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={confirmInvalidate}
        title="Invalider la signature client ?"
        description="La validation actuelle sera supprimée. Le client devra re-signer le brief depuis son espace pour confirmer le nouveau périmètre."
        onConfirm={handleInvalidate}
        onClose={() => setConfirmInvalidate(false)}
      />
    </section>
  );
}

/* ─────────────────────────────────────────────── */

function ValidationBadge({ brief }: { brief: { validated_at: string | null } | null }) {
  if (!brief) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono uppercase tracking-[0.15em] bg-ws-deep/40 border border-ws-line text-ws-mist">
        <Lock size={10} />
        Pas encore créé
      </span>
    );
  }
  if (brief.validated_at) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono uppercase tracking-[0.15em] bg-emerald-500/15 border border-emerald-500/40 text-emerald-300">
        <CheckCircle2 size={11} />
        Validé client
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono uppercase tracking-[0.15em] bg-ws-accent/15 border border-ws-accent/40 text-ws-accent">
      <RefreshCw size={11} />
      En attente de validation
    </span>
  );
}

interface FieldProps {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  tone?: 'success' | 'warning';
  placeholder?: string;
}

function Field({ label, hint, value, onChange, rows = 3, tone, placeholder }: FieldProps) {
  const toneIcon =
    tone === 'success' ? (
      <CheckCircle2 size={11} className="text-emerald-400" />
    ) : tone === 'warning' ? (
      <AlertTriangle size={11} className="text-amber-400" />
    ) : null;
  const toneRing =
    tone === 'success'
      ? 'focus:border-emerald-500/40'
      : tone === 'warning'
        ? 'focus:border-amber-500/40'
        : 'focus:border-ws-accent';
  return (
    <div>
      <label className="form-label flex items-center gap-2">
        {toneIcon}
        {label}
      </label>
      <textarea
        className={`input resize-none ${toneRing}`}
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
      {hint && <p className="text-[10px] font-mono text-ws-mist mt-1 leading-snug">{hint}</p>}
    </div>
  );
}
