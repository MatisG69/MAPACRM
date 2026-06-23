import { useMemo, useState } from 'react';
import {
  RefreshCw,
  Monitor,
  Smartphone,
  Globe,
  Eye,
  Users,
  Clock,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
} from 'lucide-react';
import { Header } from '../components/layout/Header';
import { Button } from '../components/ui/Button';
import { LineChart } from '../components/charts/LineChart';
import { DonutChart } from '../components/charts/DonutChart';
import { GaugeChart } from '../components/charts/GaugeChart';
import { useWebAnalytics } from '../hooks/useWebAnalytics';
import { usePageSpeed } from '../hooks/usePageSpeed';
import { LeadJourneys } from '../components/analytics/LeadJourneys';
import type { VitalScore, PsStrategy } from '../hooks/usePageSpeed';

const VITAL_CONFIG: Record<VitalScore, { label: string; color: string; icon: React.ReactNode }> = {
  good: {
    label: 'Bon',
    color: 'text-emerald-400',
    icon: <CheckCircle2 size={13} className="text-emerald-400" />,
  },
  'needs-improvement': {
    label: 'A ameliorer',
    color: 'text-amber-400',
    icon: <AlertTriangle size={13} className="text-amber-400" />,
  },
  poor: {
    label: 'Faible',
    color: 'text-red-400',
    icon: <XCircle size={13} className="text-red-400" />,
  },
};

function formatDuration(sec: number | null): string {
  if (sec == null) return '—';
  if (sec < 60) return sec + 's';
  return Math.floor(sec / 60) + 'm ' + (sec % 60) + 's';
}

function VitalRow({
  label,
  value,
  score,
  sublabel,
}: {
  label: string;
  value: string;
  score: VitalScore;
  sublabel?: string;
}) {
  const cfg = VITAL_CONFIG[score];
  return (
    <div className="flex items-center justify-between gap-3 py-2.5 border-b border-ws-line/40 last:border-0">
      <div className="min-w-0">
        <p className="text-xs font-mono text-ws-paper">{label}</p>
        {sublabel && <p className="text-[10px] font-mono text-ws-mist/70 mt-0.5">{sublabel}</p>}
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {cfg.icon}
        <span className={`text-xs font-mono font-semibold tabular-nums ${cfg.color}`}>{value}</span>
      </div>
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`ws-card rounded-2xl p-4 border ${accent ? 'border-ws-accent/30 bg-ws-accent-dim/20' : 'border-ws-line/60'}`}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-ws-mist">{icon}</span>
        <p className="text-[10px] font-mono uppercase tracking-widest text-ws-mist">{label}</p>
      </div>
      <p
        className={`text-2xl font-display font-bold tabular-nums leading-none ${accent ? 'text-ws-accent-soft' : 'text-ws-cream'}`}
      >
        {value}
      </p>
      {sub && <p className="text-[11px] font-mono text-ws-mist/70 mt-1.5">{sub}</p>}
    </div>
  );
}


export function AnalyseSitePage() {
  const { analytics, loading: aLoading, error: aError, refetch } = useWebAnalytics();
  const { data: ps, loading: psLoading, error: psError, quotaExceeded, run: runPs } = usePageSpeed();
  const [period, setPeriod] = useState<'7' | '30'>('30');
  const [strategy, setStrategy] = useState<PsStrategy>('mobile');

  const notifications = useMemo(() => {
    if (analytics.todayViews > 0) {
      return [{
        id: 'today-views',
        type: 'info' as const,
        message: analytics.todayViews + ' visite' + (analytics.todayViews > 1 ? 's' : '') + ' aujourd\'hui sur mapa-developpement.fr',
      }];
    }
    return [];
  }, [analytics.todayViews]);

  const chartData = period === '7' ? analytics.viewsByDay7 : analytics.viewsByDay30;
  const chartViews = period === '7' ? analytics.totalViews7d : analytics.totalViews30d;

  const handleRunPs = async () => {
    await runPs(strategy);
  };

  return (
    <div>
      <Header
        title="Analyse site web"
        subtitle="mapa-developpement.fr — performance, SEO et trafic"
        notifications={notifications}
        actions={
          <Button
            variant="secondary"
            icon={<RefreshCw size={14} />}
            onClick={refetch}
            loading={aLoading}
          >
            Actualiser
          </Button>
        }
      />

      <div className="px-4 py-4 md:p-8 bg-ws-deep/20 min-h-[calc(100vh-120px)] space-y-6">

        {aError && (
          <div className="rounded-xl bg-ws-bear-dim border border-ws-bear/30 px-4 py-3 text-xs font-mono text-ws-bear">
            Erreur : {aError}
          </div>
        )}

        {/* KPI Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard
            icon={<Eye size={14} />}
            label="Vues (30j)"
            value={aLoading ? '…' : analytics.totalViews30d}
            sub={analytics.totalViews7d + ' cette semaine'}
            accent={analytics.totalViews30d > 0}
          />
          <KpiCard
            icon={<Users size={14} />}
            label="Sessions (30j)"
            value={aLoading ? '…' : analytics.uniqueSessions30d}
            sub={analytics.pagesPerSession + ' pages / session'}
          />
          <KpiCard
            icon={<Clock size={14} />}
            label="Duree moyenne"
            value={aLoading ? '…' : formatDuration(analytics.avgDurationSec)}
            sub="Temps passe sur le site"
          />
          <KpiCard
            icon={<TrendingUp size={14} />}
            label="Score SEO"
            value={ps ? ps.seo + '/100' : '—'}
            sub={ps ? 'Analyse ' + ps.strategy : 'Lancer une analyse'}
            accent={ps != null && ps.seo >= 90}
          />
        </div>

        {/* Traffic Chart */}
        <div className="ws-card rounded-2xl p-5 border border-ws-line/60">
          <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
            <div>
              <h3 className="ws-section-title">Trafic</h3>
              <p className="text-[11px] font-mono text-ws-mist mt-0.5">
                {chartViews} vue{chartViews !== 1 ? 's' : ''} sur les {period} derniers jours
              </p>
            </div>
            <div className="flex gap-1.5">
              {(['7', '30'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPeriod(p)}
                  className={`pill-filter text-xs ${period === p ? 'pill-filter-active' : 'pill-filter-idle'}`}
                >
                  {p}j
                </button>
              ))}
            </div>
          </div>
          {aLoading ? (
            <div className="flex items-center justify-center h-24">
              <Loader2 size={20} className="animate-spin text-ws-accent" />
            </div>
          ) : chartData.length > 1 && chartData.some((v) => v > 0) ? (
            <LineChart
              data={chartData}
              labels={period === '7' ? analytics.viewsLabels7 : analytics.viewsLabels30}
              unit="vue"
              color="#C98A4C"
              height={110}
              fill
            />
          ) : (
            <div className="flex items-center justify-center h-24 text-xs font-mono text-ws-mist">
              Aucune donnee pour cette periode
            </div>
          )}
        </div>

        {/* Performance + Core Web Vitals */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* PageSpeed Gauges */}
          <div className="ws-card rounded-2xl p-5 border border-ws-line/60">
            <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
              <div>
                <h3 className="ws-section-title">Scores PageSpeed</h3>
                <p className="text-[11px] font-mono text-ws-mist mt-0.5">via Google Lighthouse</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  {(['mobile', 'desktop'] as PsStrategy[]).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setStrategy(s)}
                      className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-mono transition-colors ${
                        strategy === s
                          ? 'bg-ws-accent-dim text-ws-accent-soft border border-ws-accent/30'
                          : 'text-ws-mist hover:text-ws-paper border border-ws-line/40'
                      }`}
                    >
                      {s === 'mobile' ? <Smartphone size={10} /> : <Monitor size={10} />}
                      {s === 'mobile' ? 'Mobile' : 'Desktop'}
                    </button>
                  ))}
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  icon={psLoading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                  className="normal-case tracking-normal text-xs"
                  loading={psLoading}
                  onClick={handleRunPs}
                >
                  Analyser
                </Button>
              </div>
            </div>

            {psError && (
              <div className={`rounded-xl px-3 py-2.5 mb-3 text-[11px] font-mono border ${quotaExceeded ? 'bg-ws-accent-dim/20 border-ws-accent/25 text-ws-accent-soft' : 'bg-ws-bear-dim border-ws-bear/30 text-ws-bear'}`}>
                {quotaExceeded ? (
                  <>
                    <p className="font-semibold mb-1">Quota journalier Google atteint</p>
                    <p className="text-ws-mist leading-snug">
                      Sans cle API personnelle, la limite est tres basse.{' '}
                      Ajoutez <code className="text-ws-accent-soft">VITE_PAGESPEED_API_KEY</code> dans le fichier{' '}
                      <code className="text-ws-accent-soft">.env</code> avec une cle obtenue sur{' '}
                      <span className="text-ws-paper underline">console.cloud.google.com</span>{' '}
                      (PageSpeed Insights API, quota gratuit : 25 000 req/jour).
                    </p>
                  </>
                ) : (
                  <p>{psError}</p>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <GaugeChart value={ps?.performance ?? null} label="Performance" size={108} />
              <GaugeChart value={ps?.seo ?? null} label="SEO" size={108} />
              <GaugeChart value={ps?.accessibility ?? null} label="Accessibilite" size={108} />
              <GaugeChart value={ps?.bestPractices ?? null} label="Bonnes pratiques" size={108} />
            </div>

            {ps && (
              <p className="text-[9px] font-mono text-ws-mist/50 text-center mt-4">
                Analyse {ps.strategy} — {ps.fetchedAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </p>
            )}
            {!ps && !psLoading && (
              <p className="text-[10px] font-mono text-ws-mist text-center mt-4">
                Cliquez Analyser pour lancer le test Lighthouse
              </p>
            )}
          </div>

          {/* Core Web Vitals */}
          <div className="ws-card rounded-2xl p-5 border border-ws-line/60">
            <h3 className="ws-section-title mb-1">Core Web Vitals</h3>
            <p className="text-[11px] font-mono text-ws-mist mb-4">
              Signaux UX mesures par Google
            </p>

            {ps ? (
              <div>
                <VitalRow
                  label="LCP — Largest Contentful Paint"
                  value={ps.lcp}
                  score={ps.lcpScore}
                  sublabel="Objectif : < 2.5 s"
                />
                <VitalRow
                  label="FCP — First Contentful Paint"
                  value={ps.fcp}
                  score={ps.fcpScore}
                  sublabel="Objectif : < 1.8 s"
                />
                <VitalRow
                  label="CLS — Cumulative Layout Shift"
                  value={ps.cls}
                  score={ps.clsScore}
                  sublabel="Objectif : < 0.1"
                />
                <VitalRow
                  label="TBT — Total Blocking Time"
                  value={ps.tbt}
                  score={ps.tbtScore}
                  sublabel="Objectif : < 200 ms"
                />
                <VitalRow
                  label="Speed Index"
                  value={ps.speedIndex}
                  score={ps.performance >= 90 ? 'good' : ps.performance >= 50 ? 'needs-improvement' : 'poor'}
                />

                {/* Score bar legend */}
                <div className="flex items-center gap-3 mt-4 pt-3 border-t border-ws-line/40 flex-wrap">
                  {(['good', 'needs-improvement', 'poor'] as VitalScore[]).map((s) => {
                    const c = VITAL_CONFIG[s];
                    return (
                      <div key={s} className="flex items-center gap-1">
                        {c.icon}
                        <span className={`text-[9px] font-mono ${c.color}`}>{c.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 gap-3">
                <Globe size={28} className="text-ws-mist/40" />
                <p className="text-xs font-mono text-ws-mist text-center">
                  Lancez une analyse PageSpeed pour voir les Core Web Vitals
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Sources + Devices */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* Top Referrers */}
          <div className="ws-card rounded-2xl p-5 border border-ws-line/60">
            <h3 className="ws-section-title mb-4">Sources de trafic</h3>
            {analytics.topReferrers.length === 0 ? (
              <p className="text-xs font-mono text-ws-mist py-6 text-center">Aucune donnee</p>
            ) : (
              <div className="space-y-2.5">
                {analytics.topReferrers.map((ref) => (
                  <div key={ref.domain}>
                    <div className="flex items-center justify-between mb-1 gap-2">
                      <span className="text-xs font-mono text-ws-paper truncate">{ref.domain}</span>
                      <span className="text-[11px] font-mono text-ws-mist flex-shrink-0 tabular-nums">
                        {ref.count} · {ref.pct}%
                      </span>
                    </div>
                    <div className="h-1 rounded-full bg-ws-line/40 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-ws-accent transition-all duration-500"
                        style={{ width: ref.pct + '%', minWidth: ref.pct > 0 ? '4px' : '0' }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Device Breakdown */}
          <div className="ws-card rounded-2xl p-5 border border-ws-line/60">
            <h3 className="ws-section-title mb-4">Appareils</h3>
            {analytics.deviceBreakdown.length === 0 ? (
              <p className="text-xs font-mono text-ws-mist py-6 text-center">Aucune donnee</p>
            ) : (
              <DonutChart
                segments={analytics.deviceBreakdown}
                size={140}
                centerCaption="APPAREILS"
                formatCenter={(t) => String(t)}
              />
            )}
          </div>
        </div>

        {/* Parcours visiteurs (funnel) */}
        <div className="ws-card rounded-2xl p-5 border border-ws-line/60">
          <div className="mb-4">
            <h3 className="ws-section-title">Parcours visiteurs</h3>
            <p className="text-[11px] font-mono text-ws-mist mt-0.5">
              Sections atteintes par session · où les visiteurs s'arretent · {period} derniers jours
            </p>
          </div>
          {(() => {
            const funnel = period === '7' ? analytics.funnel7 : analytics.funnel30;
            const entry = funnel[0]?.sessions ?? 0;
            if (entry === 0) {
              return (
                <p className="text-xs font-mono text-ws-mist py-4 text-center">
                  Aucune donnee de parcours pour le moment. Le suivi se remplit des les prochaines visites du site.
                </p>
              );
            }
            const maxDrop = Math.max(...funnel.slice(1).map((s) => s.dropFromPrev), 0);
            return (
              <div className="space-y-1">
                {funnel.map((s, i) => {
                  const worst = i > 0 && s.dropFromPrev === maxDrop && s.dropFromPrev > 0;
                  return (
                    <div key={s.key}>
                      {i > 0 && s.dropFromPrev > 0 && (
                        <div className="flex items-center gap-1.5 pl-1 py-0.5">
                          <span className="text-ws-mist/40 text-[10px] leading-none">&darr;</span>
                          <span
                            className={`text-[10px] font-mono ${worst ? 'text-red-300' : 'text-ws-mist/60'}`}
                          >
                            &minus;{s.dropFromPrev}%{worst ? ' · plus gros decrochage' : ''}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono text-ws-paper w-24 sm:w-28 flex-shrink-0 truncate">
                          {s.label}
                        </span>
                        <div className="relative flex-1 h-6 rounded-md bg-ws-line/20 overflow-hidden">
                          <div
                            className={`h-full rounded-md transition-all ${
                              s.key === 'conversion'
                                ? 'bg-gradient-to-r from-emerald-600/80 to-emerald-400/80'
                                : 'bg-gradient-to-r from-ws-accent/80 to-ws-accent-soft/80'
                            }`}
                            style={{ width: Math.max(s.pctOfEntry, s.sessions > 0 ? 4 : 0) + '%' }}
                          />
                          <span className="absolute inset-y-0 left-2 flex items-center text-[10px] font-mono text-ws-paper/90 tabular-nums">
                            {s.pctOfEntry}%
                          </span>
                        </div>
                        <span className="text-[11px] font-mono text-ws-mist tabular-nums w-12 text-right flex-shrink-0">
                          {s.sessions}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>

        {/* Parcours individuel des prospects emailés (liens /r/<token>) */}
        <LeadJourneys />

      </div>
    </div>
  );
}
