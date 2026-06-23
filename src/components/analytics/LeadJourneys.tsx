import { useState } from 'react';
import {
  MousePointerClick,
  ChevronDown,
  ChevronRight,
  Mail,
  CheckCircle2,
  Circle,
  Trophy,
  RefreshCw,
  Loader2,
  Building2,
  Database,
} from 'lucide-react';
import { useLeadJourneys, type LeadJourney } from '../../hooks/useLeadJourneys';

function fmt(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function relative(iso: string | null): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "à l'instant";
  if (m < 60) return `il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `il y a ${h} h`;
  const j = Math.floor(h / 24);
  return `il y a ${j} j`;
}

function JourneyRow({ j }: { j: LeadJourney }) {
  const [open, setOpen] = useState(false);
  const title = j.lead.company || j.lead.contact_name || j.lead.email || 'Prospect';

  return (
    <div className="rounded-xl border border-ws-line/50 bg-ws-deep/30 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 px-3 py-3 text-left hover:bg-white/[0.03] transition-colors"
      >
        <span className="text-ws-mist flex-shrink-0">
          {open ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
        </span>
        <span className="h-8 w-8 rounded-lg bg-ws-accent-dim/40 border border-ws-accent/20 flex items-center justify-center flex-shrink-0">
          <Building2 size={14} className="text-ws-accent-soft" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-ws-paper truncate">{title}</p>
          <p className="text-[11px] font-mono text-ws-mist truncate">
            {j.lead.contact_name ? j.lead.contact_name + ' · ' : ''}
            {j.lead.email || '—'}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {j.converted ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-mono text-emerald-300">
              <Trophy size={11} /> Demande
            </span>
          ) : (
            <span className="hidden sm:inline rounded-full bg-ws-accent-dim/40 border border-ws-accent/20 px-2 py-0.5 text-[10px] font-mono text-ws-accent-soft">
              {j.deepestLabel}
            </span>
          )}
          <span className="hidden md:block text-[10px] font-mono text-ws-mist/70 w-20 text-right">
            {relative(j.lastActivity)}
          </span>
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 pt-1 border-t border-ws-line/40">
          <div className="flex flex-wrap gap-x-6 gap-y-1 mb-3 mt-3 text-[10px] font-mono text-ws-mist">
            <span>Clics : <span className="text-ws-paper tabular-nums">{j.lead.click_count}</span></span>
            <span>1er clic : <span className="text-ws-paper">{fmt(j.lead.first_clicked_at)}</span></span>
            <span>Dernière activité : <span className="text-ws-paper">{fmt(j.lastActivity)}</span></span>
            {j.lead.source && <span>Source : <span className="text-ws-paper">{j.lead.source}</span></span>}
          </div>

          <ol className="relative ml-1">
            {j.steps.map((s, i) => {
              const isLast = i === j.steps.length - 1;
              const conversionStep = s.key === 'conversion';
              return (
                <li key={s.key} className="flex gap-3 pb-3 last:pb-0">
                  <div className="flex flex-col items-center">
                    {s.reached ? (
                      conversionStep ? (
                        <Trophy size={16} className="text-emerald-400" />
                      ) : (
                        <CheckCircle2
                          size={16}
                          className={i <= 1 ? 'text-ws-accent-soft' : 'text-emerald-400'}
                        />
                      )
                    ) : (
                      <Circle size={16} className="text-ws-line" />
                    )}
                    {!isLast && (
                      <span
                        className={`w-px flex-1 mt-1 ${s.reached ? 'bg-emerald-500/40' : 'bg-ws-line/40'}`}
                        style={{ minHeight: 14 }}
                      />
                    )}
                  </div>
                  <div className="flex-1 -mt-0.5 flex items-center justify-between gap-3">
                    <span
                      className={`text-xs ${s.reached ? 'text-ws-paper font-medium' : 'text-ws-mist/50'}`}
                    >
                      {s.label}
                    </span>
                    <span className="text-[10px] font-mono text-ws-mist/70 flex-shrink-0">
                      {s.reached ? fmt(s.at) : ''}
                    </span>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </div>
  );
}

export function LeadJourneys() {
  const { journeys, stats, loading, error, tableExists, refetch } = useLeadJourneys();

  return (
    <div className="ws-card rounded-2xl p-5 border border-ws-line/60">
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div>
          <h3 className="ws-section-title flex items-center gap-2">
            <MousePointerClick size={15} className="text-ws-accent-soft" />
            Parcours des prospects emailés
          </h3>
          <p className="text-[11px] font-mono text-ws-mist mt-0.5">
            Qui a cliqué sur le lien de l'email, et jusqu'où il est allé sur le site
          </p>
        </div>
        <button
          type="button"
          onClick={refetch}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-ws-line/50 text-[11px] font-mono text-ws-mist hover:text-ws-paper transition-colors"
        >
          {loading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
          Actualiser
        </button>
      </div>

      {!tableExists ? (
        <div className="flex items-start gap-2.5 rounded-xl bg-ws-accent-dim/20 border border-ws-accent/25 px-4 py-3 text-[11px] font-mono text-ws-accent-soft">
          <Database size={14} className="mt-0.5 flex-shrink-0" />
          <span>
            Table <code className="text-ws-paper">email_leads</code> absente. Exécute la migration{' '}
            <code className="text-ws-paper">supabase/migrations/0001_email_lead_tracking.sql</code>{' '}
            dans Supabase pour activer le suivi.
          </span>
        </div>
      ) : error ? (
        <div className="rounded-xl bg-ws-bear-dim border border-ws-bear/30 px-4 py-3 text-xs font-mono text-ws-bear">
          Erreur : {error}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-4">
            <div className="rounded-xl border border-ws-line/50 bg-ws-deep/30 p-3">
              <div className="flex items-center gap-1.5 text-ws-mist mb-1">
                <Mail size={12} />
                <p className="text-[9px] font-mono uppercase tracking-widest">Ont cliqué</p>
              </div>
              <p className="text-2xl font-display font-bold tabular-nums text-ws-cream leading-none">
                {loading ? '…' : stats.clicked}
              </p>
            </div>
            <div className="rounded-xl border border-ws-line/50 bg-ws-deep/30 p-3">
              <div className="flex items-center gap-1.5 text-ws-mist mb-1">
                <MousePointerClick size={12} />
                <p className="text-[9px] font-mono uppercase tracking-widest">Vu les tarifs</p>
              </div>
              <p className="text-2xl font-display font-bold tabular-nums text-ws-accent-soft leading-none">
                {loading ? '…' : stats.reachedTarifs}
              </p>
            </div>
            <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/[0.06] p-3">
              <div className="flex items-center gap-1.5 text-emerald-400/80 mb-1">
                <Trophy size={12} />
                <p className="text-[9px] font-mono uppercase tracking-widest">Demande</p>
              </div>
              <p className="text-2xl font-display font-bold tabular-nums text-emerald-300 leading-none">
                {loading ? '…' : stats.converted}
              </p>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 size={20} className="animate-spin text-ws-accent" />
            </div>
          ) : journeys.length === 0 ? (
            <p className="text-xs font-mono text-ws-mist py-8 text-center">
              Aucun prospect n'a encore cliqué. Les parcours apparaîtront dès le premier clic sur un lien email tracké.
            </p>
          ) : (
            <div className="space-y-2">
              {journeys.map((j) => (
                <JourneyRow key={j.lead.id} j={j} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
