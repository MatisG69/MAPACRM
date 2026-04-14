import { useMemo } from 'react';
import {
  Users,
  FolderKanban,
  Euro,
  Target,
  Minus,
  Activity,
  Scale,
  Receipt,
  Timer,
  Percent,
  Building2,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { Header } from '../components/layout/Header';
import { StatCard } from '../components/ui/StatCard';
import { DonutChart } from '../components/charts/DonutChart';
import { LineChart } from '../components/charts/LineChart';
import { RevenueDesk } from '../components/revenue/RevenueDesk';
import { DeskTicker } from '../components/analytics/DeskTicker';
import type { Client, DealStage, Opportunity, Project, Quote } from '../lib/types';
import { formatCurrency, formatDate } from '../lib/utils';

const MONTHS_FR = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

const OPEN_DEAL_STAGES: DealStage[] = [
  'lead_detected',
  'contacted',
  'meeting_scheduled',
  'quote_sent',
  'follow_up',
];

const ROLLING_MONTHS = 12;

interface AnalyticsPageProps {
  clients: Client[];
  projects: Project[];
  invoices: Invoice[];
  opportunities?: Opportunity[];
  quotes?: Quote[];
}

function pctChange(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return ((current - previous) / previous) * 100;
}

function fmtPct(n: number | null): string {
  if (n === null) return '—';
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(1)} %`;
}

export function AnalyticsPage({
  clients,
  projects,
  invoices,
  opportunities = [],
  quotes = [],
}: AnalyticsPageProps) {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const clientById = useMemo(() => new Map(clients.map((c) => [c.id, c])), [clients]);

  const paidInvoices = useMemo(
    () => invoices.filter((i) => i.status === 'paid'),
    [invoices]
  );

  const revenueByMonth12 = useMemo(() => {
    const rows = Array.from({ length: ROLLING_MONTHS }, (_, i) => {
      const d = new Date(currentYear, currentMonth - (ROLLING_MONTHS - 1) + i, 1);
      return { month: d.getMonth(), year: d.getFullYear(), label: MONTHS_FR[d.getMonth()] };
    });
    return rows.map(({ month, year, label }) => {
      const paidInMonth = paidInvoices.filter((inv) => {
        const dt = new Date(inv.paid_date || inv.created_at);
        return dt.getMonth() === month && dt.getFullYear() === year;
      });
      return {
        label: year !== currentYear ? `${label} ${String(year).slice(2)}` : label,
        value: paidInMonth.reduce((s, i) => s + i.amount, 0),
        invoiceCount: paidInMonth.length,
      };
    });
  }, [paidInvoices, currentMonth, currentYear]);

  const lineSeries = useMemo(() => revenueByMonth12.map((r) => r.value), [revenueByMonth12]);

  const lastIdx = revenueByMonth12.length - 1;
  const momPct = useMemo(() => {
    if (lastIdx < 1) return null;
    return pctChange(revenueByMonth12[lastIdx].value, revenueByMonth12[lastIdx - 1].value);
  }, [revenueByMonth12, lastIdx]);

  const yoyPct = useMemo(() => {
    const cur = paidInvoices
      .filter((inv) => {
        const dt = new Date(inv.paid_date || inv.created_at);
        return dt.getMonth() === currentMonth && dt.getFullYear() === currentYear;
      })
      .reduce((s, i) => s + i.amount, 0);
    const prev = paidInvoices
      .filter((inv) => {
        const dt = new Date(inv.paid_date || inv.created_at);
        return dt.getMonth() === currentMonth && dt.getFullYear() === currentYear - 1;
      })
      .reduce((s, i) => s + i.amount, 0);
    return pctChange(cur, prev);
  }, [paidInvoices, currentMonth, currentYear]);

  const wonRevenue = useMemo(() => paidInvoices.reduce((s, i) => s + i.amount, 0), [paidInvoices]);

  const bySourceCount = useMemo(() => {
    const map = new Map<string, number>();
    clients.forEach((c) => {
      const s = c.source?.trim() || 'Non renseigné';
      map.set(s, (map.get(s) || 0) + 1);
    });
    const colors = ['#60a5fa', '#34d399', '#d4a853', '#a78bfa', '#f472b6', '#22d3ee', '#8fa3b8'];
    return Array.from(map.entries())
      .map(([label, value], i) => ({ label, value, color: colors[i % colors.length] }))
      .filter((x) => x.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [clients]);

  const revenueByAcquisition = useMemo(() => {
    const map = new Map<string, number>();
    for (const inv of paidInvoices) {
      const src = inv.client_id
        ? clientById.get(inv.client_id)?.source?.trim() || 'Non renseigné'
        : 'Sans client';
      map.set(src, (map.get(src) || 0) + inv.amount);
    }
    const colors = ['#d4a574', '#af7037', '#c98a4c', '#8b572a', '#34d399', '#60a5fa', '#a78bfa'];
    return Array.from(map.entries())
      .map(([label, value], i) => ({ label, value, color: colors[i % colors.length] }))
      .filter((x) => x.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [paidInvoices, clientById]);

  const topCounterparties = useMemo(() => {
    const map = new Map<string, number>();
    for (const inv of paidInvoices) {
      const name = inv.client?.name || 'Sans nom';
      map.set(name, (map.get(name) || 0) + inv.amount);
    }
    return Array.from(map.entries())
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  }, [paidInvoices]);

  const invoiceMix = useMemo(() => {
    const draft = invoices.filter((i) => i.status === 'draft').length;
    const sent = invoices.filter((i) => i.status === 'sent').length;
    const paid = invoices.filter((i) => i.status === 'paid').length;
    const overdue = invoices.filter((i) => i.status === 'overdue').length;
    const cancelled = invoices.filter((i) => i.status === 'cancelled').length;
    const sentAmt = invoices.filter((i) => i.status === 'sent').reduce((s, i) => s + i.amount, 0);
    const overdueAmt = invoices.filter((i) => i.status === 'overdue').reduce((s, i) => s + i.amount, 0);
    return { draft, sent, paid, overdue, cancelled, sentAmt, overdueAmt };
  }, [invoices]);

  const avgDaysToPay = useMemo(() => {
    const days: number[] = [];
    for (const inv of paidInvoices) {
      if (!inv.paid_date) continue;
      const a = new Date(inv.created_at).getTime();
      const b = new Date(inv.paid_date).getTime();
      const d = Math.round((b - a) / (86_400_000));
      if (d >= 0 && d < 2000) days.push(d);
    }
    if (days.length === 0) return null;
    return Math.round(days.reduce((s, x) => s + x, 0) / days.length);
  }, [paidInvoices]);

  const avgTicket = useMemo(() => {
    if (paidInvoices.length === 0) return null;
    return wonRevenue / paidInvoices.length;
  }, [paidInvoices.length, wonRevenue]);

  const interestedClients = clients.filter((c) => c.status === 'interested').length;
  const arpa = interestedClients > 0 ? wonRevenue / interestedClients : null;

  const concentrationTop3 = useMemo(() => {
    if (wonRevenue <= 0 || topCounterparties.length === 0) return null;
    const top3 = topCounterparties.slice(0, 3).reduce((s, x) => s + x.total, 0);
    return (top3 / wonRevenue) * 100;
  }, [wonRevenue, topCounterparties]);

  const pipelineValue = useMemo(
    () => projects.filter((p) => p.status !== 'completed').reduce((s, p) => s + (p.budget || 0), 0),
    [projects]
  );

  const projectStatusSegments = useMemo(() => {
    const labels: Record<string, string> = {
      planning: 'Planif.',
      in_progress: 'En cours',
      review: 'Révision',
      completed: 'Terminé',
      on_hold: 'Pause',
    };
    const colors = ['#78716c', '#af7037', '#c98a4c', '#34d399', '#8b572a'];
    const map = new Map<string, number>();
    projects.forEach((p) => map.set(p.status, (map.get(p.status) || 0) + 1));
    return Array.from(map.entries())
      .map(([status, value], i) => ({
        label: labels[status] || status,
        value,
        color: colors[i % colors.length],
      }))
      .filter((s) => s.value > 0);
  }, [projects]);

  const openOpps = opportunities.filter((o) => OPEN_DEAL_STAGES.includes(o.stage));
  const weightedPipeline = openOpps.reduce(
    (s, o) => s + (o.estimated_amount ?? 0) * ((o.probability ?? 0) / 100),
    0
  );
  const rawOppValue = openOpps.reduce((s, o) => s + (o.estimated_amount ?? 0), 0);

  const quotesSent = quotes.filter((q) => q.status === 'sent');
  const quotesSigned = quotes.filter((q) => q.status === 'signed');
  const quotesSentAmt = quotesSent.reduce((s, q) => s + q.amount, 0);
  const quotesDecided = quotesSigned.length + quotes.filter((q) => q.status === 'refused').length;
  const quoteWinRate = quotesDecided > 0 ? (quotesSigned.length / quotesDecided) * 100 : null;

  const tickerItems = useMemo(() => {
    const items = [
      { symbol: 'MTD', value: formatCurrency(revenueByMonth12[lastIdx]?.value ?? 0), hint: 'Enc. mois' },
      { symbol: 'YTD', value: formatCurrency(paidInvoices.filter((i) => new Date(i.paid_date || i.created_at).getFullYear() === currentYear).reduce((s, x) => s + x.amount, 0)), hint: `Cumul ${currentYear}` },
      {
        symbol: 'Δ M/M',
        value: fmtPct(momPct),
        hint: 'vs mois préc.',
        variant: momPct === null ? 'flat' : momPct >= 0 ? 'bull' : 'bear',
      } as const,
      {
        symbol: 'Δ / N-1',
        value: fmtPct(yoyPct),
        hint: 'vs même mois N-1',
        variant: yoyPct === null ? 'flat' : yoyPct >= 0 ? 'bull' : 'bear',
      } as const,
      { symbol: 'OUTSTD', value: formatCurrency(invoiceMix.sentAmt + invoiceMix.overdueAmt), hint: 'À encaisser + retard' },
      { symbol: 'PIPE', value: formatCurrency(pipelineValue), hint: 'Budgets projets ouverts' },
      { symbol: 'W-Pipe', value: formatCurrency(weightedPipeline), hint: 'Opps pondérées' },
      { symbol: 'DSO*', value: avgDaysToPay != null ? `${avgDaysToPay} j` : '—', hint: 'Délai moyen paiement' },
    ];
    return items;
  }, [
    revenueByMonth12,
    lastIdx,
    paidInvoices,
    currentYear,
    momPct,
    yoyPct,
    invoiceMix.sentAmt,
    invoiceMix.overdueAmt,
    pipelineValue,
    weightedPipeline,
    avgDaysToPay,
  ]);

  return (
    <div>
      <Header
        title="Marché & performance"
        subtitle="Terminal MAPA · séries 12 mois, liquidité, pipeline commercial et risque de concentration — lecture type desk."
      />

      <div className="px-4 py-4 md:p-8 space-y-5 md:space-y-7 bg-ws-deep/20 min-h-[calc(100vh-120px)]">
        <DeskTicker items={tickerItems} />

        <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-2 sm:gap-3">
          <StatCard
            label="CA encaissé (vie)"
            value={formatCurrency(wonRevenue)}
            icon={<Euro size={20} className="text-ws-gold" strokeWidth={2} />}
            iconBg="bg-ws-gold-dim"
            trendLabel={`${paidInvoices.length} règlements`}
          />
          <StatCard
            label="Panier moyen"
            value={avgTicket != null ? formatCurrency(avgTicket) : '—'}
            icon={<Scale size={20} className="text-ws-accent-soft" strokeWidth={2} />}
            iconBg="bg-ws-accent-dim"
            trendLabel="Facture payée"
          />
          <StatCard
            label="ARPA (clients intéressés)"
            value={arpa != null ? formatCurrency(arpa) : '—'}
            icon={<Building2 size={20} className="text-ws-highlight" strokeWidth={2} />}
            iconBg="bg-ws-wire/15"
            trendLabel={`${interestedClients} intéressés`}
          />
          <StatCard
            label="Conc. top 3"
            value={concentrationTop3 != null ? `${concentrationTop3.toFixed(0)} %` : '—'}
            icon={<Percent size={20} className="text-ws-bear" strokeWidth={2} />}
            iconBg="bg-ws-bear-dim/40"
            trendLabel="Part du CA encaissé"
          />
          <StatCard
            label="Deals ouverts"
            value={openOpps.length}
            icon={<Activity size={20} className="text-emerald-400" strokeWidth={2} />}
            iconBg="bg-emerald-500/15"
            trendLabel={formatCurrency(rawOppValue) + ' brut'}
          />
          <StatCard
            label="Devis en attente"
            value={quotesSent.length}
            icon={<Receipt size={20} className="text-ws-gold" strokeWidth={2} />}
            iconBg="bg-ws-gold-dim"
            trendLabel={formatCurrency(quotesSentAmt)}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
          <StatCard
            label="Prospects"
            value={clients.filter((c) => c.status === 'prospect').length}
            icon={<Users size={20} className="text-ws-highlight" strokeWidth={2} />}
            iconBg="bg-ws-wire/15"
            trendLabel={`${clients.length} comptes`}
          />
          <StatCard
            label="Projets live"
            value={projects.filter((p) => p.status === 'in_progress' || p.status === 'planning').length}
            icon={<FolderKanban size={20} className="text-ws-bull" strokeWidth={2} />}
            iconBg="bg-ws-bull-dim"
            trendLabel={`${projects.length} au total`}
          />
          <StatCard
            label="Factures en retard"
            value={String(invoiceMix.overdue)}
            icon={<Timer size={20} className="text-ws-bear" strokeWidth={2} />}
            iconBg="bg-ws-bear-dim"
            trendLabel={formatCurrency(invoiceMix.overdueAmt)}
          />
          <StatCard
            label="Pipeline budgets"
            value={formatCurrency(pipelineValue)}
            icon={<Target size={20} className="text-ws-highlight" strokeWidth={2} />}
            iconBg="bg-ws-wire/15"
            trendLabel="Hors terminés"
          />
        </div>

        {/* Courbe d’équité encaissements */}
        <div className="ws-card rounded-[1.35rem] border border-white/[0.08] p-4 md:p-6 relative overflow-hidden">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.04]"
            aria-hidden
            style={{
              backgroundImage: `linear-gradient(rgba(52, 211, 153, 0.35) 1px, transparent 1px),
                linear-gradient(90deg, rgba(52, 211, 153, 0.2) 1px, transparent 1px)`,
              backgroundSize: '24px 24px',
            }}
          />
          <div className="relative flex flex-wrap items-end justify-between gap-3 mb-4">
            <div>
              <p className="ws-section-title mb-1">Courbe de performance</p>
              <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-ws-mist">
                Encaissements nets · {ROLLING_MONTHS} séances mensuelles
              </p>
            </div>
            <div className="flex items-center gap-3 font-mono text-xs">
              <span className="flex items-center gap-1 text-emerald-400/90">
                {momPct != null && momPct >= 0 ? <ArrowUpRight size={14} /> : momPct != null ? <ArrowDownRight size={14} /> : <Minus size={14} />}
                M/M {fmtPct(momPct)}
              </span>
              <span className="text-ws-mist">|</span>
              <span className="text-ws-ink">Vol. {lineSeries.reduce((a, b) => a + b, 0) > 0 ? 'actif' : 'plat'}</span>
            </div>
          </div>
          <div className="relative h-28 w-full md:h-36">
            {lineSeries.length >= 2 && lineSeries.some((v) => v > 0) ? (
              <LineChart data={lineSeries} color="#34d399" height={120} fill />
            ) : (
              <p className="flex h-full items-center justify-center text-sm font-mono text-ws-mist">
                Données insuffisantes pour tracer la courbe
              </p>
            )}
          </div>
        </div>

        <RevenueDesk
          monthlyRows={revenueByMonth12}
          invoices={invoices}
          title="Bloc trésorerie & carnet de règlements"
          subtitle="Série glissante 12 mois, deltas mois à mois, créances et journal — vue agrandissable plein écran."
        />

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 md:gap-6">
          {/* CA par canal d’acquisition */}
          <div className="ws-card rounded-[1.25rem] p-5 md:p-6 min-w-0">
            <h3 className="font-display text-sm font-bold text-ws-paper tracking-tight">CA par canal</h3>
            <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-ws-mist mt-1 mb-4">
              Encaissements réalisés · répartition par source client
            </p>
            {revenueByAcquisition.length === 0 ? (
              <p className="text-sm text-ws-mist font-mono text-center py-10">Aucun encaissement relié à une source</p>
            ) : (
              <div className="overflow-x-auto scrollbar-ws -mx-1 px-1">
                <table className="w-full min-w-[280px] text-left font-mono text-xs">
                  <thead>
                    <tr className="border-b border-white/[0.08] text-[9px] uppercase tracking-wider text-ws-mist">
                      <th className="py-2 pr-3 font-semibold">Canal</th>
                      <th className="py-2 pr-3 text-right font-semibold">Montant</th>
                      <th className="py-2 text-right font-semibold">% du total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {revenueByAcquisition.map((row) => (
                      <tr key={row.label} className="border-b border-white/[0.04] hover:bg-white/[0.03]">
                        <td className="py-2.5 pr-3 text-ws-paper">{row.label}</td>
                        <td className="py-2.5 pr-3 text-right tabular-nums text-ws-gold font-semibold">
                          {formatCurrency(row.value)}
                        </td>
                        <td className="py-2.5 text-right tabular-nums text-ws-mist">
                          {wonRevenue > 0 ? ((row.value / wonRevenue) * 100).toFixed(1) : '0'} %
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Top contreparties */}
          <div className="ws-card rounded-[1.25rem] p-5 md:p-6 min-w-0">
            <h3 className="font-display text-sm font-bold text-ws-paper tracking-tight">Contreparties majeures</h3>
            <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-ws-mist mt-1 mb-4">
              Classement par encaissements cumulés
            </p>
            {topCounterparties.length === 0 ? (
              <p className="text-sm text-ws-mist font-mono text-center py-10">Aucune donnée</p>
            ) : (
              <div className="overflow-x-auto scrollbar-ws -mx-1 px-1">
                <table className="w-full min-w-[260px] text-left font-mono text-xs">
                  <thead>
                    <tr className="border-b border-white/[0.08] text-[9px] uppercase tracking-wider text-ws-mist">
                      <th className="py-2 pr-2 font-semibold">#</th>
                      <th className="py-2 pr-3 font-semibold">Nom</th>
                      <th className="py-2 text-right font-semibold">Net encaissé</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topCounterparties.map((row, idx) => (
                      <tr key={row.name} className="border-b border-white/[0.04] hover:bg-white/[0.03]">
                        <td className="py-2.5 pr-2 tabular-nums text-ws-mist">{idx + 1}</td>
                        <td className="py-2.5 pr-3 text-ws-paper truncate max-w-[160px]" title={row.name}>
                          {row.name}
                        </td>
                        <td className="py-2.5 text-right tabular-nums text-emerald-300/90 font-semibold">
                          {formatCurrency(row.total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 md:gap-6">
          <div className="ws-card rounded-[1.25rem] p-5">
            <h3 className="font-display text-sm font-bold text-ws-paper">Mix factures</h3>
            <p className="text-[10px] font-mono uppercase tracking-wider text-ws-mist mt-1 mb-4">Statuts · volume</p>
            <ul className="space-y-2 font-mono text-xs">
              <li className="flex justify-between border-b border-white/[0.05] pb-2">
                <span className="text-ws-mist">Brouillon</span>
                <span className="text-ws-paper tabular-nums">{invoiceMix.draft}</span>
              </li>
              <li className="flex justify-between border-b border-white/[0.05] pb-2">
                <span className="text-ws-mist">Envoyée</span>
                <span className="text-ws-highlight tabular-nums">{invoiceMix.sent}</span>
              </li>
              <li className="flex justify-between border-b border-white/[0.05] pb-2">
                <span className="text-ws-mist">Payée</span>
                <span className="text-emerald-400 tabular-nums">{invoiceMix.paid}</span>
              </li>
              <li className="flex justify-between border-b border-white/[0.05] pb-2">
                <span className="text-ws-mist">En retard</span>
                <span className="text-ws-bear tabular-nums">{invoiceMix.overdue}</span>
              </li>
              <li className="flex justify-between pt-1">
                <span className="text-ws-mist">Annulée</span>
                <span className="text-ws-mist tabular-nums">{invoiceMix.cancelled}</span>
              </li>
            </ul>
            {quoteWinRate != null && quotesDecided > 0 && (
              <p className="mt-4 pt-4 border-t border-white/[0.06] text-[10px] font-mono text-ws-ink">
                Taux de signature (signés / signés + refusés) :{' '}
                <span className="text-ws-gold font-bold">{quoteWinRate.toFixed(0)} %</span>
              </p>
            )}
          </div>

          <div className="ws-card rounded-[1.25rem] p-5 min-w-0">
            <h3 className="font-display text-sm font-bold text-ws-paper">Book projets</h3>
            <p className="text-[10px] font-mono uppercase tracking-wider text-ws-mist mt-1 mb-3">Répartition statut</p>
            {projectStatusSegments.length > 0 ? (
              <DonutChart segments={projectStatusSegments} size={128} />
            ) : (
              <p className="text-sm text-ws-mist font-mono py-8 text-center">Aucun projet</p>
            )}
          </div>

          <div className="ws-card rounded-[1.25rem] p-5 min-w-0">
            <h3 className="font-display text-sm font-bold text-ws-paper">Flux acquisition</h3>
            <p className="text-[10px] font-mono uppercase tracking-wider text-ws-mist mt-1 mb-3">Comptes par source</p>
            {bySourceCount.length > 0 ? (
              <DonutChart segments={bySourceCount} size={128} />
            ) : (
              <p className="text-sm text-ws-mist font-mono py-8 text-center">Renseignez la source client</p>
            )}
          </div>
        </div>

        {revenueByAcquisition.length > 0 && (
          <div className="ws-card rounded-[1.25rem] p-5 md:p-6">
            <h3 className="font-display text-sm font-bold text-ws-paper">Répartition CA · donut</h3>
            <p className="text-[10px] font-mono uppercase tracking-wider text-ws-mist mt-1 mb-4">
              Lecture rapide des canaux qui monetisent
            </p>
            <div className="flex justify-center overflow-x-auto py-2 scrollbar-ws">
              <DonutChart
                segments={revenueByAcquisition}
                size={168}
                trackColor="#0f1210"
                centerCaption="CANAUX"
                formatCenter={(t) => (t >= 1000 ? `${(t / 1000).toFixed(1)}k €` : `${Math.round(t)} €`)}
                formatLegendValue={(v) => formatCurrency(v)}
              />
            </div>
          </div>
        )}

        <p className="text-center font-mono text-[9px] uppercase tracking-[0.2em] text-ws-mist/80 pb-4">
          * DSO approximatif : jours entre création facture et date de paiement · MAPACRM Terminal · données à la
          consultation · {formatDate(now.toISOString())}
        </p>
      </div>
    </div>
  );
}
