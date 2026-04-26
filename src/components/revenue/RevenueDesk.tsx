import { useMemo, useState, useEffect, useCallback } from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  Landmark,
  Receipt,
  Sparkles,
  Maximize2,
  X,
} from 'lucide-react';
import { Invoice } from '../../lib/types';
import { formatCurrency, formatDate } from '../../lib/utils';
import type { RevenueMonthRow } from './revenueTypes';
import { RevenueChartsPanel } from './RevenueChartsPanel';

export type { RevenueMonthRow } from './revenueTypes';

interface RevenueDeskProps {
  monthlyRows: RevenueMonthRow[];
  invoices: Invoice[];
  title?: string;
  subtitle?: string;
}

function pctChange(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return ((current - previous) / previous) * 100;
}

interface ComputedDesk {
  mtd: number;
  ytd: number;
  pendingTotal: number;
  overdueTotal: number;
  paidCount: number;
  recentPaid: Invoice[];
  totalSixMonth: number;
  prevMonth: number;
}

/* ─────────────────────────────────────────────────────────────────
   Mini sparkline area chart : SVG pur, pas de dépendance, ~5 mois
   ───────────────────────────────────────────────────────────────── */
function Sparkline({ values, currentIndex }: { values: number[]; currentIndex: number }) {
  if (values.length === 0)
    return (
      <div className="h-16 w-full flex items-center justify-center text-[10px] font-mono text-ws-mist">
        —
      </div>
    );

  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const W = 100;
  const H = 28;
  const step = values.length > 1 ? W / (values.length - 1) : W;

  const points = values.map((v, i) => {
    const x = i * step;
    const y = H - ((v - min) / range) * H;
    return [x, y] as const;
  });

  const pathLine = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`).join(' ');
  const pathArea = `${pathLine} L${W},${H} L0,${H} Z`;

  return (
    <div className="relative w-full">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-16 w-full overflow-visible">
        <defs>
          <linearGradient id="rev-spark-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="rgba(201,168,76,0.35)" />
            <stop offset="100%" stopColor="rgba(201,168,76,0)" />
          </linearGradient>
        </defs>
        <path d={pathArea} fill="url(#rev-spark-fill)" />
        <path d={pathLine} fill="none" stroke="rgba(212,185,106,0.85)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        {points.map(([x, y], i) => {
          const isCurrent = i === currentIndex;
          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r={isCurrent ? 1.7 : 1}
              fill={isCurrent ? 'rgba(232,224,208,1)' : 'rgba(212,185,106,0.7)'}
              stroke={isCurrent ? 'rgba(212,185,106,0.9)' : 'none'}
              strokeWidth="0.7"
              vectorEffect="non-scaling-stroke"
            />
          );
        })}
      </svg>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Vue plein écran (inchangée — déjà bien dimensionnée)
   ───────────────────────────────────────────────────────────────── */
function RevenueExpandedOverlay({
  onClose,
  title,
  monthlyRows,
  computed,
  cy,
  cm,
  updatedLabel,
  updatedIso,
}: {
  onClose: () => void;
  title: string;
  monthlyRows: RevenueMonthRow[];
  computed: ComputedDesk;
  cy: number;
  cm: number;
  updatedLabel: string;
  updatedIso: string;
}) {
  const { mtd, ytd, pendingTotal, overdueTotal, paidCount, recentPaid, totalSixMonth } = computed;
  const rollLabel = monthlyRows.length === 1 ? '1 mois' : `${monthlyRows.length} mois`;
  const currentMonthRowIndex = monthlyRows.length > 0 ? monthlyRows.length - 1 : -1;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] flex min-h-0 max-h-[100dvh] flex-col bg-ws-void/97 pt-[env(safe-area-inset-top)] backdrop-blur-xl"
      role="dialog"
      aria-modal="true"
      aria-labelledby="revenue-expanded-title"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        aria-hidden
        style={{
          backgroundImage: `linear-gradient(rgba(175, 112, 55, 0.4) 1px, transparent 1px),
            linear-gradient(90deg, rgba(175, 112, 55, 0.3) 1px, transparent 1px)`,
          backgroundSize: '32px 32px',
        }}
      />

      <header className="relative flex flex-shrink-0 items-start justify-between gap-3 border-b border-white/[0.08] px-3 py-3 sm:items-center sm:gap-4 sm:px-4 sm:py-4 md:px-8 md:py-5">
        <div className="flex min-w-0 flex-1 items-start gap-3 sm:items-center sm:gap-4">
          <div className="hidden h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl border border-ws-accent/35 bg-ws-accent-dim shadow-glow-sm sm:flex md:h-12 md:w-12">
            <Landmark className="h-5 w-5 text-ws-accent-soft md:h-6 md:w-6" strokeWidth={2} />
          </div>
          <div className="min-w-0 flex-1 pr-1">
            <p className="ws-section-title mb-0.5 sm:mb-1">Vue élargie</p>
            <h2
              id="revenue-expanded-title"
              className="break-words font-display text-lg font-bold leading-tight text-ws-paper sm:text-xl md:text-2xl"
            >
              {title}
            </h2>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl border border-white/[0.1] bg-ws-panel/80 text-ws-paper transition-colors hover:bg-ws-raised hover:border-ws-accent/30 touch-manipulation"
          aria-label="Réduire la fenêtre"
        >
          <X size={20} strokeWidth={2} />
        </button>
      </header>

      <div className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:px-4 sm:py-6 md:px-8 md:py-10 md:pb-10">
        <div className="mb-6 grid gap-3 sm:mb-8 sm:gap-4 md:mb-10 md:grid-cols-2 md:gap-6">
          <div className="relative overflow-hidden rounded-2xl border border-ws-accent/25 bg-gradient-to-br from-ws-accent-dim/40 via-ws-deep/80 to-ws-void p-4 shadow-glow sm:p-6 md:p-8">
            <p className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-ws-gold sm:text-[11px] sm:tracking-[0.25em]">
              Encaissement · mois en cours
            </p>
            <p className="mt-2 break-words font-mono text-2xl font-bold tabular-nums leading-tight tracking-tight text-ws-paper sm:mt-3 sm:text-3xl md:text-4xl lg:text-5xl">
              {formatCurrency(mtd)}
            </p>
            <p className="mt-1.5 text-xs text-ws-ink sm:mt-2 sm:text-sm">
              {new Date(cy, cm, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
            </p>
          </div>
          <div className="relative overflow-hidden rounded-2xl border border-white/[0.1] bg-ws-panel/40 p-4 backdrop-blur-md sm:p-6 md:p-8">
            <p className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-ws-mist sm:text-[11px] sm:tracking-[0.25em]">
              Cumul annuel · YTD
            </p>
            <p className="mt-2 break-words font-mono text-2xl font-bold tabular-nums leading-tight tracking-tight text-ws-gold sm:mt-3 sm:text-3xl md:text-4xl lg:text-5xl">
              {formatCurrency(ytd)}
            </p>
            <p className="mt-1.5 text-xs leading-snug text-ws-ink sm:mt-2 sm:text-sm">
              Exercice {cy} — factures payées à ce jour
            </p>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-2 sm:mb-8 sm:gap-3 md:mb-10 md:grid-cols-4 md:gap-4">
          {[
            { k: 'À encaisser', v: formatCurrency(pendingTotal), hint: 'Envoyées' },
            { k: 'En retard', v: formatCurrency(overdueTotal), hint: 'Échéance dépassée' },
            { k: rollLabel, v: formatCurrency(totalSixMonth), hint: 'Glissant' },
            { k: 'Factures', v: String(paidCount), hint: 'Payées' },
          ].map((cell) => (
            <div
              key={cell.k}
              className="min-w-0 rounded-xl border border-white/[0.08] bg-ws-deep/50 px-2.5 py-3 font-mono sm:rounded-2xl sm:px-4 sm:py-4 md:px-5 md:py-5"
            >
              <p className="text-[8px] font-bold uppercase tracking-wider text-ws-mist sm:text-[10px] sm:tracking-[0.18em]">
                {cell.k}
              </p>
              <p className="mt-1.5 break-words text-sm font-semibold tabular-nums leading-tight text-ws-paper sm:mt-2 sm:text-lg md:text-xl">
                {cell.v}
              </p>
              <p className="mt-0.5 text-[9px] uppercase tracking-wide text-ws-ink sm:mt-1 sm:text-[10px]">
                {cell.hint}
              </p>
            </div>
          ))}
        </div>

        <div className="grid min-w-0 grid-cols-1 gap-6 xl:grid-cols-[1.15fr_1fr] xl:gap-8">
          <div className="@container min-w-0 space-y-4 sm:space-y-6">
            <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-ws-deep/30 sm:rounded-2xl">
              <p className="border-b border-white/[0.06] px-3 py-2.5 font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-ws-ink sm:px-5 sm:py-3 sm:text-[10px] sm:tracking-[0.2em]">
                Série mensuelle
              </p>
              <div className="-mx-0 overflow-x-auto [-webkit-overflow-scrolling:touch]">
                <table className="w-full min-w-[260px] border-collapse text-left font-mono text-xs sm:min-w-[300px] sm:text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.08] bg-ws-deep/80 text-[9px] uppercase tracking-wider text-ws-mist sm:text-[10px]">
                      <th className="px-3 py-2.5 font-semibold sm:px-5 sm:py-3.5">Période</th>
                      <th className="px-2 py-2.5 text-right font-semibold sm:px-5 sm:py-3.5">Net</th>
                      <th className="px-3 py-2.5 text-right font-semibold sm:px-5 sm:py-3.5">Δ m/m</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlyRows.map((row, idx) => {
                      const prev = idx > 0 ? monthlyRows[idx - 1].value : 0;
                      const delta = pctChange(row.value, prev);
                      const up = delta !== null && delta >= 0;
                      const flat = delta === null || delta === 0;
                      const isCurrentMonth = idx === currentMonthRowIndex;

                      return (
                        <tr
                          key={row.label}
                          className={`border-b border-white/[0.05] transition-colors hover:bg-ws-raised/40 ${
                            isCurrentMonth ? 'bg-ws-accent-dim/20' : ''
                          }`}
                        >
                          <td className="px-3 py-2.5 sm:px-5 sm:py-3.5">
                            <span className="font-semibold text-ws-paper">{row.label}</span>
                            {isCurrentMonth && (
                              <span className="mt-1 block w-fit rounded-full border border-ws-accent/40 bg-ws-accent-dim px-1.5 py-px text-[8px] font-bold uppercase tracking-wider text-ws-accent-soft sm:ml-2 sm:mt-0 sm:inline-block">
                                Courant
                              </span>
                            )}
                          </td>
                          <td className="max-w-[42%] px-2 py-2.5 text-right text-sm font-semibold tabular-nums leading-tight text-ws-gold sm:max-w-none sm:px-5 sm:py-3.5 sm:text-base">
                            {formatCurrency(row.value)}
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums sm:px-5 sm:py-3.5">
                            {delta === null ? (
                              <span className="text-ws-mist">—</span>
                            ) : flat ? (
                              <span className="text-ws-mist">0,0%</span>
                            ) : (
                              <span
                                className={`inline-flex items-center justify-end gap-0.5 text-sm font-semibold sm:gap-1 ${
                                  up ? 'text-ws-accent-soft' : 'text-ws-bear'
                                }`}
                              >
                                {up ? (
                                  <ArrowUpRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                ) : (
                                  <ArrowDownRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                )}
                                {Math.abs(delta).toFixed(1)}%
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-ws-accent/25 bg-ws-accent-dim/15 font-semibold">
                      <td className="px-3 py-2.5 text-xs uppercase tracking-wider text-ws-accent-soft sm:px-5 sm:py-3 sm:text-sm">
                        {rollLabel}
                      </td>
                      <td className="px-2 py-2.5 text-right text-xs tabular-nums text-ws-paper sm:px-5 sm:py-3 sm:text-sm">
                        {formatCurrency(totalSixMonth)}
                      </td>
                      <td className="px-3 py-2.5 text-right align-top text-[9px] uppercase leading-snug text-ws-mist sm:px-5 sm:py-3 sm:text-[10px]">
                        <span className="hidden sm:inline">
                          {paidCount} facture{paidCount > 1 ? 's' : ''} payée
                          {paidCount > 1 ? 's' : ''}
                        </span>
                        <span className="sm:hidden">
                          {paidCount} payée{paidCount > 1 ? 's' : ''}
                        </span>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            <RevenueChartsPanel monthlyRows={monthlyRows} spacious />
          </div>

          <div className="min-w-0 overflow-hidden rounded-xl border border-white/[0.08] bg-ws-deep/30 sm:rounded-2xl">
            <div className="flex items-center gap-2 border-b border-white/[0.06] px-3 py-2.5 sm:px-5 sm:py-3">
              <Receipt className="h-3.5 w-3.5 flex-shrink-0 text-ws-accent-soft sm:h-4 sm:w-4" strokeWidth={2} />
              <p className="min-w-0 font-mono text-[9px] font-bold uppercase tracking-[0.15em] text-ws-ink sm:text-[10px] sm:tracking-[0.2em]">
                Derniers encaissements
              </p>
            </div>
            <div className="max-h-[min(340px,42dvh)] overflow-y-auto overflow-x-auto overscroll-contain sm:max-h-[min(480px,48vh)] md:max-h-[min(520px,50vh)] [-webkit-overflow-scrolling:touch]">
              {recentPaid.length === 0 ? (
                <p className="px-4 py-10 text-center text-xs text-ws-mist sm:px-5 sm:py-12 sm:text-sm">
                  Aucun encaissement
                </p>
              ) : (
                <table className="w-full min-w-[280px] border-collapse font-mono text-xs sm:min-w-0 sm:text-sm">
                  <thead className="sticky top-0 z-[1] border-b border-white/[0.06] bg-ws-deep text-[9px] uppercase tracking-wider text-ws-mist sm:text-[10px]">
                    <tr>
                      <th className="px-2 py-2.5 text-left font-semibold sm:px-4 sm:py-3">Date</th>
                      <th className="px-2 py-2.5 text-left font-semibold sm:px-3 sm:py-3">N°</th>
                      <th className="min-w-0 px-2 py-2.5 text-left font-semibold sm:px-3 sm:py-3">Client</th>
                      <th className="px-2 py-2.5 text-right font-semibold sm:px-4 sm:py-3">Montant</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentPaid.map((inv) => (
                      <tr
                        key={inv.id}
                        className="border-b border-white/[0.04] transition-colors hover:bg-ws-raised/35"
                      >
                        <td className="whitespace-nowrap px-2 py-2 tabular-nums text-ws-ink sm:px-4 sm:py-3">
                          {formatDate(inv.paid_date || inv.created_at)}
                        </td>
                        <td className="max-w-[3.5rem] truncate px-2 py-2 text-ws-mist sm:max-w-none sm:px-3 sm:py-3">
                          {inv.invoice_number || '—'}
                        </td>
                        <td
                          className="max-w-[100px] truncate px-2 py-2 text-ws-paper sm:max-w-[200px] sm:px-3 sm:py-3"
                          title={inv.client?.name || ''}
                        >
                          {inv.client?.name || '—'}
                        </td>
                        <td className="whitespace-nowrap px-2 py-2 text-right text-sm font-semibold tabular-nums text-ws-gold sm:px-4 sm:py-3 sm:text-base">
                          {formatCurrency(inv.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        <p className="mt-6 text-center font-mono text-[9px] uppercase tracking-[0.12em] text-ws-mist sm:mt-8 sm:text-[10px] sm:tracking-[0.15em]">
          <time dateTime={updatedIso}>Actualisé · {updatedLabel}</time>
        </p>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Vue compacte — REFONTE UI/UX
   Pattern « financial desk minimal » : un chiffre vedette, une
   variation, une mini-tendance, une liste compacte des règlements.
   ───────────────────────────────────────────────────────────────── */
export function RevenueDesk({
  monthlyRows,
  invoices,
  title = "Chiffre d'affaires",
  subtitle,
}: RevenueDeskProps) {
  void subtitle;
  const [expanded, setExpanded] = useState(false);
  const now = new Date();
  const cy = now.getFullYear();
  const cm = now.getMonth();

  const computed = useMemo((): ComputedDesk => {
    const paid = invoices.filter((i) => i.status === 'paid');
    const pending = invoices.filter((i) => i.status === 'sent');
    const overdue = invoices.filter((i) => i.status === 'overdue');

    const inMonth = (i: Invoice) => {
      const d = new Date(i.paid_date || i.created_at);
      return d.getMonth() === cm && d.getFullYear() === cy;
    };
    const inYear = (i: Invoice) => {
      const d = new Date(i.paid_date || i.created_at);
      return d.getFullYear() === cy;
    };

    const mtdVal = paid.filter(inMonth).reduce((s, i) => s + i.amount, 0);
    const ytdVal = paid.filter(inYear).reduce((s, i) => s + i.amount, 0);
    const pend = pending.reduce((s, i) => s + i.amount, 0);
    const ovd = overdue.reduce((s, i) => s + i.amount, 0);

    const ledger = [...paid].sort((a, b) => {
      const ta = new Date(a.paid_date || a.created_at).getTime();
      const tb = new Date(b.paid_date || b.created_at).getTime();
      return tb - ta;
    });

    const sixSum = monthlyRows.reduce((s, r) => s + r.value, 0);
    const prev = monthlyRows.length >= 2 ? monthlyRows[monthlyRows.length - 2].value : 0;

    return {
      mtd: mtdVal,
      ytd: ytdVal,
      pendingTotal: pend,
      overdueTotal: ovd,
      paidCount: paid.length,
      recentPaid: ledger.slice(0, 5),
      totalSixMonth: sixSum,
      prevMonth: prev,
    };
  }, [invoices, monthlyRows, cm, cy]);

  const { mtd, ytd, pendingTotal, overdueTotal, recentPaid, prevMonth } = computed;
  const delta = pctChange(mtd, prevMonth);
  const up = delta !== null && delta >= 0;

  const updatedLabel = now.toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
  const updatedIso = now.toISOString();

  const monthLabel = new Date(cy, cm, 1).toLocaleDateString('fr-FR', {
    month: 'long',
    year: 'numeric',
  });

  const sparkValues = monthlyRows.map((r) => r.value);
  const currentSparkIndex = sparkValues.length > 0 ? sparkValues.length - 1 : -1;

  const openExpanded = useCallback(() => setExpanded(true), []);
  const closeExpanded = useCallback(() => setExpanded(false), []);

  useEffect(() => {
    if (expanded) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [expanded]);

  return (
    <>
      <section
        className="ws-card relative min-w-0 overflow-hidden rounded-2xl"
        aria-labelledby="revenue-desk-title"
      >
        {/* Header sobre — un seul niveau de titre, un seul bouton */}
        <header className="flex items-start justify-between gap-3 px-5 pt-5 pb-3">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border border-ws-accent/30 bg-ws-accent-dim/60">
              <Landmark className="h-4 w-4 text-ws-accent-soft" strokeWidth={2} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-mono font-semibold uppercase tracking-[0.22em] text-ws-mist">
                Trésorerie
              </p>
              <h2
                id="revenue-desk-title"
                className="font-display text-lg font-semibold tracking-tight text-ws-paper md:text-xl"
              >
                {title}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={openExpanded}
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-ws-panel/60 text-ws-mist transition-all hover:border-ws-accent/40 hover:bg-ws-accent-dim/30 hover:text-ws-paper touch-manipulation"
            aria-label="Vue plein écran du chiffre d'affaires"
            title="Vue plein écran"
          >
            <Maximize2 size={15} strokeWidth={2} />
          </button>
        </header>

        {/* HERO : chiffre vedette + variation + sparkline */}
        <div className="px-5 pb-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] md:gap-6 md:items-end">
            {/* Bloc gauche : chiffre + variation */}
            <div className="min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-ws-mist">
                  Mois en cours
                </span>
                <span className="text-[10px] font-mono text-ws-ink capitalize">{monthLabel}</span>
              </div>
              <p className="mt-1.5 font-display text-3xl font-bold tabular-nums leading-none tracking-tight text-ws-paper md:text-4xl">
                {formatCurrency(mtd)}
              </p>
              <div className="mt-2 flex items-center gap-3 text-[11px] font-mono">
                {delta === null ? (
                  <span className="text-ws-mist">— vs mois précédent</span>
                ) : (
                  <span
                    className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-semibold ${
                      up
                        ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                        : 'border-red-500/30 bg-red-500/10 text-red-300'
                    }`}
                  >
                    {up ? <ArrowUpRight size={11} strokeWidth={2.5} /> : <ArrowDownRight size={11} strokeWidth={2.5} />}
                    {up ? '+' : '−'}
                    {Math.abs(delta).toFixed(1)}%
                  </span>
                )}
                <span className="text-ws-mist">vs mois précédent</span>
              </div>
            </div>

            {/* Bloc droite : sparkline avec libellé */}
            <div className="min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-ws-mist">
                  Tendance {monthlyRows.length} mois
                </span>
                <Sparkles className="h-3 w-3 text-ws-accent-soft/70" strokeWidth={2} />
              </div>
              <Sparkline values={sparkValues} currentIndex={currentSparkIndex} />
              <div className="flex items-center justify-between text-[9px] font-mono uppercase tracking-wide text-ws-mist mt-0.5">
                <span>{monthlyRows[0]?.label ?? ''}</span>
                <span>{monthlyRows[monthlyRows.length - 1]?.label ?? ''}</span>
              </div>
            </div>
          </div>
        </div>

        {/* KPIs secondaires : compactes, lisibles, hiérarchie claire */}
        <div className="grid grid-cols-3 border-y border-white/[0.06]">
          {[
            { k: 'Cumul annuel', v: formatCurrency(ytd), tone: 'paper' as const },
            { k: 'À encaisser', v: formatCurrency(pendingTotal), tone: 'gold' as const },
            { k: 'En retard', v: formatCurrency(overdueTotal), tone: overdueTotal > 0 ? 'red' : 'mist' as const },
          ].map((cell, idx) => (
            <div
              key={cell.k}
              className={`px-5 py-3 ${idx < 2 ? 'border-r border-white/[0.06]' : ''}`}
            >
              <p className="text-[9px] font-mono font-semibold uppercase tracking-[0.18em] text-ws-mist">
                {cell.k}
              </p>
              <p
                className={`mt-1 font-mono text-base font-semibold tabular-nums tracking-tight ${
                  cell.tone === 'gold'
                    ? 'text-ws-gold'
                    : cell.tone === 'red'
                      ? 'text-red-300'
                      : cell.tone === 'mist'
                        ? 'text-ws-mist'
                        : 'text-ws-paper'
                }`}
              >
                {cell.v}
              </p>
            </div>
          ))}
        </div>

        {/* Liste des derniers règlements — format liste, pas tableau */}
        <div className="px-5 py-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Receipt className="h-3.5 w-3.5 text-ws-accent-soft" strokeWidth={2} />
              <p className="text-[10px] font-mono font-semibold uppercase tracking-[0.18em] text-ws-mist">
                Derniers règlements
              </p>
            </div>
            <button
              type="button"
              onClick={openExpanded}
              className="text-[10px] font-mono uppercase tracking-[0.15em] text-ws-accent-soft hover:text-ws-accent transition-colors"
            >
              Voir tout
            </button>
          </div>

          {recentPaid.length === 0 ? (
            <p className="py-6 text-center text-xs font-mono text-ws-mist">Aucun encaissement</p>
          ) : (
            <ul className="space-y-1.5">
              {recentPaid.map((inv) => (
                <li
                  key={inv.id}
                  className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-ws-raised/30"
                >
                  <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-emerald-400/80" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-ws-paper" title={inv.client?.name || ''}>
                      {inv.client?.name || '—'}
                    </p>
                    <p className="font-mono text-[10px] uppercase tracking-wide text-ws-mist">
                      {formatDate(inv.paid_date || inv.created_at)} · {inv.invoice_number || '—'}
                    </p>
                  </div>
                  <span className="font-mono text-sm font-semibold tabular-nums text-ws-gold">
                    {formatCurrency(inv.amount)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer minimaliste — juste timestamp */}
        <div className="border-t border-white/[0.06] bg-ws-deep/30 px-5 py-2 text-center">
          <time
            dateTime={updatedIso}
            className="font-mono text-[9px] uppercase tracking-[0.18em] text-ws-mist"
          >
            Actualisé · {updatedLabel}
          </time>
        </div>
      </section>

      {expanded && (
        <RevenueExpandedOverlay
          onClose={closeExpanded}
          title={title}
          monthlyRows={monthlyRows}
          computed={computed}
          cy={cy}
          cm={cm}
          updatedLabel={updatedLabel}
          updatedIso={updatedIso}
        />
      )}
    </>
  );
}
