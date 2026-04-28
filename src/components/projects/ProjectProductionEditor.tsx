import { useEffect, useState } from 'react';
import {
  Globe,
  Save,
  Loader2,
  RefreshCw,
  Activity,
  Gauge,
  ExternalLink,
  Github,
  Server,
  Calendar,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Wrench,
} from 'lucide-react';
import { useProjectProduction } from '../../hooks/useProjectProduction';
import type { UptimeStatus } from '../../lib/types';

interface ProjectProductionEditorProps {
  projectId: string;
}

interface DraftState {
  prod_url: string;
  hosting_provider: string;
  hosting_dashboard_url: string;
  repo_url: string;
  cms_url: string;
  launch_date: string;
  lighthouse_performance: string;
  lighthouse_accessibility: string;
  lighthouse_seo: string;
  lighthouse_best_practices: string;
  cwv_lcp_seconds: string;
  cwv_cls: string;
  cwv_inp_ms: string;
  lighthouse_report_url: string;
  uptime_status: UptimeStatus;
  notes: string;
}

const EMPTY: DraftState = {
  prod_url: '',
  hosting_provider: '',
  hosting_dashboard_url: '',
  repo_url: '',
  cms_url: '',
  launch_date: '',
  lighthouse_performance: '',
  lighthouse_accessibility: '',
  lighthouse_seo: '',
  lighthouse_best_practices: '',
  cwv_lcp_seconds: '',
  cwv_cls: '',
  cwv_inp_ms: '',
  lighthouse_report_url: '',
  uptime_status: 'unknown',
  notes: '',
};

const UPTIME_TONES: Record<UptimeStatus, { bg: string; text: string; label: string; icon: JSX.Element }> = {
  up: { bg: 'bg-emerald-500/15 border-emerald-500/40', text: 'text-emerald-300', label: 'En ligne', icon: <CheckCircle2 size={11} /> },
  down: { bg: 'bg-red-500/15 border-red-500/40', text: 'text-red-300', label: 'Hors ligne', icon: <XCircle size={11} /> },
  maintenance: { bg: 'bg-amber-500/15 border-amber-500/40', text: 'text-amber-300', label: 'Maintenance', icon: <Wrench size={11} /> },
  unknown: { bg: 'bg-ws-deep/40 border-ws-line', text: 'text-ws-mist', label: 'Non vérifié', icon: <AlertCircle size={11} /> },
};

function scoreTone(score: number | null): string {
  if (score == null) return 'text-ws-mist';
  if (score >= 90) return 'text-emerald-300';
  if (score >= 50) return 'text-amber-300';
  return 'text-red-300';
}

function toNumberOrNull(s: string): number | null {
  const t = s.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export function ProjectProductionEditor({ projectId }: ProjectProductionEditorProps) {
  const { data, loading, error, save } = useProjectProduction(projectId);
  const [draft, setDraft] = useState<DraftState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [pinging, setPinging] = useState(false);

  useEffect(() => {
    if (!data) {
      setDraft(EMPTY);
      return;
    }
    setDraft({
      prod_url: data.prod_url ?? '',
      hosting_provider: data.hosting_provider ?? '',
      hosting_dashboard_url: data.hosting_dashboard_url ?? '',
      repo_url: data.repo_url ?? '',
      cms_url: data.cms_url ?? '',
      launch_date: data.launch_date ?? '',
      lighthouse_performance: data.lighthouse_performance?.toString() ?? '',
      lighthouse_accessibility: data.lighthouse_accessibility?.toString() ?? '',
      lighthouse_seo: data.lighthouse_seo?.toString() ?? '',
      lighthouse_best_practices: data.lighthouse_best_practices?.toString() ?? '',
      cwv_lcp_seconds: data.cwv_lcp_seconds?.toString() ?? '',
      cwv_cls: data.cwv_cls?.toString() ?? '',
      cwv_inp_ms: data.cwv_inp_ms?.toString() ?? '',
      lighthouse_report_url: data.lighthouse_report_url ?? '',
      uptime_status: data.uptime_status,
      notes: data.notes ?? '',
    });
  }, [data]);

  const handleSave = async (markChecked = false) => {
    setSaving(true);
    try {
      await save({
        prod_url: draft.prod_url.trim() || null,
        hosting_provider: draft.hosting_provider.trim() || null,
        hosting_dashboard_url: draft.hosting_dashboard_url.trim() || null,
        repo_url: draft.repo_url.trim() || null,
        cms_url: draft.cms_url.trim() || null,
        launch_date: draft.launch_date || null,
        lighthouse_performance: toNumberOrNull(draft.lighthouse_performance),
        lighthouse_accessibility: toNumberOrNull(draft.lighthouse_accessibility),
        lighthouse_seo: toNumberOrNull(draft.lighthouse_seo),
        lighthouse_best_practices: toNumberOrNull(draft.lighthouse_best_practices),
        cwv_lcp_seconds: toNumberOrNull(draft.cwv_lcp_seconds),
        cwv_cls: toNumberOrNull(draft.cwv_cls),
        cwv_inp_ms: toNumberOrNull(draft.cwv_inp_ms),
        lighthouse_report_url: draft.lighthouse_report_url.trim() || null,
        uptime_status: draft.uptime_status,
        notes: draft.notes.trim() || null,
        ...(markChecked
          ? {
              lighthouse_checked_at: new Date().toISOString(),
            }
          : {}),
      });
      setSavedAt(Date.now());
    } finally {
      setSaving(false);
    }
  };

  /** Vérification rapide d'uptime via fetch HEAD (no-cors) — best effort. */
  const handlePing = async () => {
    if (!draft.prod_url.trim()) return;
    setPinging(true);
    try {
      const ctrl = new AbortController();
      const to = setTimeout(() => ctrl.abort(), 8000);
      try {
        await fetch(draft.prod_url.trim(), { method: 'HEAD', mode: 'no-cors', signal: ctrl.signal });
        clearTimeout(to);
        await save({
          uptime_status: 'up',
          uptime_checked_at: new Date().toISOString(),
        });
      } catch {
        clearTimeout(to);
        await save({
          uptime_status: 'down',
          uptime_checked_at: new Date().toISOString(),
        });
      }
    } finally {
      setPinging(false);
    }
  };

  if (loading && !data) {
    return (
      <section className="ws-card rounded-lg p-6 flex items-center gap-2 text-ws-mist">
        <Loader2 size={14} className="animate-spin" />
        <span className="font-mono text-sm">Chargement…</span>
      </section>
    );
  }

  const tone = UPTIME_TONES[draft.uptime_status];

  return (
    <section className="ws-card rounded-lg p-6 space-y-5">
      <header className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Globe size={16} className="text-ws-accent" />
          <h3 className="font-display text-lg font-bold text-ws-paper tracking-tight">
            Site en production
          </h3>
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-mono uppercase tracking-[0.18em] ${tone.bg} ${tone.text}`}
          >
            {tone.icon}
            {tone.label}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePing}
            disabled={pinging || !draft.prod_url.trim()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-ws-line text-ws-mist hover:text-ws-paper hover:border-ws-accent/30 text-xs font-mono uppercase tracking-[0.15em] transition-colors disabled:opacity-50"
          >
            {pinging ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
            Ping uptime
          </button>
          {savedAt && Date.now() - savedAt < 4000 && (
            <span className="text-[11px] font-mono text-emerald-300 inline-flex items-center gap-1">
              <CheckCircle2 size={11} />
              Enregistré
            </span>
          )}
        </div>
      </header>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/[0.05] px-3 py-2 text-xs text-red-300 font-mono">
          {error}
        </div>
      )}

      {/* URLs + meta */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="URL de production" icon={<Globe size={12} />}>
          <input
            type="url"
            value={draft.prod_url}
            onChange={(e) => setDraft((d) => ({ ...d, prod_url: e.target.value }))}
            placeholder="https://exemple.fr"
            className="w-full px-3 py-2 rounded-lg bg-ws-deep/50 border border-ws-line text-ws-paper text-sm placeholder:text-ws-mist/60 focus:outline-none focus:border-ws-accent/50"
          />
        </Field>
        <Field label="Date de mise en ligne" icon={<Calendar size={12} />}>
          <input
            type="date"
            value={draft.launch_date}
            onChange={(e) => setDraft((d) => ({ ...d, launch_date: e.target.value }))}
            className="w-full px-3 py-2 rounded-lg bg-ws-deep/50 border border-ws-line text-ws-paper text-sm focus:outline-none focus:border-ws-accent/50"
          />
        </Field>
        <Field label="Hébergeur" icon={<Server size={12} />}>
          <input
            type="text"
            value={draft.hosting_provider}
            onChange={(e) => setDraft((d) => ({ ...d, hosting_provider: e.target.value }))}
            placeholder="Vercel, Netlify, OVH…"
            className="w-full px-3 py-2 rounded-lg bg-ws-deep/50 border border-ws-line text-ws-paper text-sm placeholder:text-ws-mist/60 focus:outline-none focus:border-ws-accent/50"
          />
        </Field>
        <Field label="Dashboard hébergeur" icon={<ExternalLink size={12} />}>
          <input
            type="url"
            value={draft.hosting_dashboard_url}
            onChange={(e) => setDraft((d) => ({ ...d, hosting_dashboard_url: e.target.value }))}
            placeholder="https://vercel.com/…"
            className="w-full px-3 py-2 rounded-lg bg-ws-deep/50 border border-ws-line text-ws-paper text-sm placeholder:text-ws-mist/60 focus:outline-none focus:border-ws-accent/50"
          />
        </Field>
        <Field label="Repo Git" icon={<Github size={12} />}>
          <input
            type="url"
            value={draft.repo_url}
            onChange={(e) => setDraft((d) => ({ ...d, repo_url: e.target.value }))}
            placeholder="https://github.com/…"
            className="w-full px-3 py-2 rounded-lg bg-ws-deep/50 border border-ws-line text-ws-paper text-sm placeholder:text-ws-mist/60 focus:outline-none focus:border-ws-accent/50"
          />
        </Field>
        <Field label="CMS / Back-office" icon={<ExternalLink size={12} />}>
          <input
            type="url"
            value={draft.cms_url}
            onChange={(e) => setDraft((d) => ({ ...d, cms_url: e.target.value }))}
            placeholder="https://admin.exemple.fr"
            className="w-full px-3 py-2 rounded-lg bg-ws-deep/50 border border-ws-line text-ws-paper text-sm placeholder:text-ws-mist/60 focus:outline-none focus:border-ws-accent/50"
          />
        </Field>
      </div>

      {/* Uptime status */}
      <Field label="Statut uptime" icon={<Activity size={12} />}>
        <div className="flex flex-wrap gap-2">
          {(['up', 'maintenance', 'down', 'unknown'] as UptimeStatus[]).map((s) => {
            const t = UPTIME_TONES[s];
            const active = draft.uptime_status === s;
            return (
              <button
                key={s}
                type="button"
                onClick={() => setDraft((d) => ({ ...d, uptime_status: s }))}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-mono uppercase tracking-[0.15em] transition-colors ${
                  active
                    ? `${t.bg} ${t.text}`
                    : 'border-ws-line text-ws-mist hover:text-ws-paper hover:border-ws-accent/30'
                }`}
              >
                {t.icon}
                {t.label}
              </button>
            );
          })}
        </div>
      </Field>

      {/* Lighthouse scores */}
      <div className="rounded-2xl border border-ws-line bg-ws-deep/20 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Gauge size={13} className="text-ws-accent" />
          <h4 className="font-display text-sm font-semibold text-ws-paper">Performance & Lighthouse</h4>
          {data?.lighthouse_checked_at && (
            <span className="text-[10px] font-mono text-ws-mist">
              · dernière mesure : {new Date(data.lighthouse_checked_at).toLocaleString('fr-FR')}
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <ScoreInput
            label="Performance"
            value={draft.lighthouse_performance}
            onChange={(v) => setDraft((d) => ({ ...d, lighthouse_performance: v }))}
            tone={scoreTone(toNumberOrNull(draft.lighthouse_performance))}
          />
          <ScoreInput
            label="Accessibilité"
            value={draft.lighthouse_accessibility}
            onChange={(v) => setDraft((d) => ({ ...d, lighthouse_accessibility: v }))}
            tone={scoreTone(toNumberOrNull(draft.lighthouse_accessibility))}
          />
          <ScoreInput
            label="SEO"
            value={draft.lighthouse_seo}
            onChange={(v) => setDraft((d) => ({ ...d, lighthouse_seo: v }))}
            tone={scoreTone(toNumberOrNull(draft.lighthouse_seo))}
          />
          <ScoreInput
            label="Best practices"
            value={draft.lighthouse_best_practices}
            onChange={(v) => setDraft((d) => ({ ...d, lighthouse_best_practices: v }))}
            tone={scoreTone(toNumberOrNull(draft.lighthouse_best_practices))}
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field label="LCP (s)">
            <input
              type="number"
              step="0.01"
              min="0"
              value={draft.cwv_lcp_seconds}
              onChange={(e) => setDraft((d) => ({ ...d, cwv_lcp_seconds: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg bg-ws-deep/50 border border-ws-line text-ws-paper text-sm focus:outline-none focus:border-ws-accent/50"
            />
          </Field>
          <Field label="CLS">
            <input
              type="number"
              step="0.001"
              min="0"
              value={draft.cwv_cls}
              onChange={(e) => setDraft((d) => ({ ...d, cwv_cls: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg bg-ws-deep/50 border border-ws-line text-ws-paper text-sm focus:outline-none focus:border-ws-accent/50"
            />
          </Field>
          <Field label="INP (ms)">
            <input
              type="number"
              step="1"
              min="0"
              value={draft.cwv_inp_ms}
              onChange={(e) => setDraft((d) => ({ ...d, cwv_inp_ms: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg bg-ws-deep/50 border border-ws-line text-ws-paper text-sm focus:outline-none focus:border-ws-accent/50"
            />
          </Field>
        </div>
        <Field label="Lien rapport Lighthouse (optionnel)">
          <input
            type="url"
            value={draft.lighthouse_report_url}
            onChange={(e) => setDraft((d) => ({ ...d, lighthouse_report_url: e.target.value }))}
            placeholder="https://pagespeed.web.dev/…"
            className="w-full px-3 py-2 rounded-lg bg-ws-deep/50 border border-ws-line text-ws-paper text-sm placeholder:text-ws-mist/60 focus:outline-none focus:border-ws-accent/50"
          />
        </Field>
      </div>

      <Field label="Notes internes (admin uniquement)">
        <textarea
          value={draft.notes}
          onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
          rows={3}
          placeholder="Particularités prod, anomalies, prochains tests…"
          className="w-full px-3 py-2 rounded-lg bg-ws-deep/50 border border-ws-line text-ws-paper text-sm placeholder:text-ws-mist/60 focus:outline-none focus:border-ws-accent/50"
        />
      </Field>

      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => handleSave(true)}
          disabled={saving}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-ws-line text-ws-mist hover:text-ws-paper hover:border-ws-accent/30 text-xs font-mono uppercase tracking-[0.15em] disabled:opacity-50"
        >
          {saving ? <Loader2 size={12} className="animate-spin" /> : <Gauge size={12} />}
          Enregistrer & marquer mesuré
        </button>
        <button
          type="button"
          onClick={() => handleSave(false)}
          disabled={saving}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-ws-accent text-ws-void text-xs font-semibold uppercase tracking-[0.15em] disabled:opacity-50 hover:brightness-110"
        >
          {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
          Enregistrer
        </button>
      </div>
    </section>
  );
}

function Field({
  label,
  icon,
  children,
}: {
  label: string;
  icon?: JSX.Element;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-[10px] font-mono uppercase tracking-[0.18em] text-ws-mist mb-1.5 inline-flex items-center gap-1.5">
        {icon}
        {label}
      </label>
      {children}
    </div>
  );
}

function ScoreInput({
  label,
  value,
  onChange,
  tone,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  tone: string;
}) {
  return (
    <div>
      <label className="block text-[10px] font-mono uppercase tracking-[0.18em] text-ws-mist mb-1.5">
        {label}
      </label>
      <div className="flex items-baseline gap-2">
        <input
          type="number"
          min={0}
          max={100}
          step={1}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="—"
          className={`w-full px-3 py-2 rounded-lg bg-ws-deep/50 border border-ws-line text-2xl font-mono font-bold tabular-nums focus:outline-none focus:border-ws-accent/50 ${tone}`}
        />
        <span className="text-xs text-ws-mist font-mono">/100</span>
      </div>
    </div>
  );
}
