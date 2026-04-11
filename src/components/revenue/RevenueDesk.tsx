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
}

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
      className="fixed inset-0 z-[100] flex flex-col bg-ws-void/97 backdrop-blur-xl"
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

      <header className="relative flex flex-shrink-0 items-center justify-between gap-4 border-b border-white/[0.08] px-4 py-4 md:px-8 md:py-5">
        <div className="flex min-w-0 items-center gap-4">
          <div className="hidden h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl border border-ws-accent/35 bg-ws-accent-dim shadow-glow-sm sm:flex">
            <Landmark className="h-6 w-6 text-ws-accent-soft" strokeWidth={2} />
          </div>
          <div className="min-w-0">
            <p className="ws-section-title mb-1">Vue élargie</p>
            <h2 id="revenue-expanded-title" className="truncate font-display text-xl font-bold text-ws-paper md:text-2xl">
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

      <div className="relative flex-1 overflow-y-auto overscroll-contain px-4 py-6 md:px-8 md:py-10">
        {/* Hero chiffres */}
        <div className="mb-10 grid gap-6 md:grid-cols-2">
          <div className="relative overflow-hidden rounded-2xl border border-ws-accent/25 bg-gradient-to-br from-ws-accent-dim/40 via-ws-deep/80 to-ws-void p-6 md:p-8 shadow-glow">
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-ws-gold">Encaissement · mois en cours</p>
            <p className="mt-3 font-mono text-3xl font-bold tabular-nums tracking-tight text-ws-paper sm:text-4xl md:text-5xl">
              {formatCurrency(mtd)}
            </p>
            <p className="mt-2 text-sm text-ws-ink">
              {new Date(cy, cm, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
            </p>
          </div>
          <div className="relative overflow-hidden rounded-2xl border border-white/[0.1] bg-ws-panel/40 p-6 md:p-8 backdrop-blur-md">
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-ws-mist">Cumul annuel · YTD</p>
            <p className="mt-3 font-mono text-3xl font-bold tabular-nums tracking-tight text-ws-gold sm:text-4xl md:text-5xl">
              {formatCurrency(ytd)}
            </p>
            <p className="mt-2 text-sm text-ws-ink">Exercice {cy} — toutes factures payées à ce jour</p>
          </div>
        </div>

        <div className="mb-10 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
          {[
            { k: 'À encaisser', v: formatCurrency(pendingTotal), hint: 'Envoyées' },
            { k: 'En retard', v: formatCurrency(overdueTotal), hint: 'Échéance dépassée' },
            { k: '6 mois (net)', v: formatCurrency(totalSixMonth), hint: 'Fenêtre glissante' },
            { k: 'Factures payées', v: String(paidCount), hint: 'Total historique' },
          ].map((cell) => (
            <div
              key={cell.k}
              className="rounded-2xl border border-white/[0.08] bg-ws-deep/50 px-4 py-4 font-mono md:px-5 md:py-5"
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-ws-mist">{cell.k}</p>
              <p className="mt-2 text-lg font-semibold tabular-nums text-ws-paper md:text-xl">{cell.v}</p>
              <p className="mt-1 text-[10px] uppercase tracking-wide text-ws-ink">{cell.hint}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-8 xl:grid-cols-[1.2fr_1fr]">
          <div className="space-y-6">
            <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-ws-deep/30">
              <p className="border-b border-white/[0.06] px-5 py-3 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-ws-ink">
                Série mensuelle
              </p>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[320px] border-collapse text-left font-mono text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.08] bg-ws-deep/80 text-[10px] uppercase tracking-wider text-ws-mist">
                      <th className="px-5 py-3.5 font-semibold">Période</th>
                      <th className="px-5 py-3.5 text-right font-semibold">Net encaissé</th>
                      <th className="px-5 py-3.5 text-right font-semibold">Δ m/m</th>
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
                          <td className="px-5 py-3.5">
                            <span className="font-semibold text-ws-paper">{row.label}</span>
                            {isCurrentMonth && (
                              <span className="ml-2 rounded-full border border-ws-accent/40 bg-ws-accent-dim px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-ws-accent-soft">
                                Courant
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-3.5 text-right text-base font-semibold tabular-nums text-ws-gold">
                            {formatCurrency(row.value)}
                          </td>
                          <td className="px-5 py-3.5 text-right tabular-nums">
                            {delta === null ? (
                              <span className="text-ws-mist">—</span>
                            ) : flat ? (
                              <span className="text-ws-mist">0,0%</span>
                            ) : (
                              <span
                                className={`inline-flex items-center justify-end gap-1 font-semibold ${
                                  up ? 'text-ws-accent-soft' : 'text-ws-bear'
                                }`}
                              >
                                {up ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
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
                      <td className="px-5 py-3 uppercase tracking-wider text-ws-accent-soft">6 mois</td>
                      <td className="px-5 py-3 text-right tabular-nums text-ws-paper">
                        {formatCurrency(totalSixMonth)}
                      </td>
                      <td className="px-5 py-3 text-right text-[10px] uppercase tracking-wider text-ws-mist">
                        {paidCount} facture{paidCount > 1 ? 's' : ''} payée{paidCount > 1 ? 's' : ''}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            <RevenueChartsPanel monthlyRows={monthlyRows} spacious />
          </div>

          <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-ws-deep/30">
            <div className="flex items-center gap-2 border-b border-white/[0.06] px-5 py-3">
              <Receipt className="h-4 w-4 text-ws-accent-soft" strokeWidth={2} />
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-ws-ink">
                Derniers encaissements
              </p>
            </div>
            <div className="max-h-[min(520px,50vh)] overflow-y-auto">
              {recentPaid.length === 0 ? (
                <p className="px-5 py-12 text-center text-sm text-ws-mist">Aucun encaissement</p>
              ) : (
                <table className="w-full border-collapse font-mono text-sm">
                  <thead className="sticky top-0 z-[1] border-b border-white/[0.06] bg-ws-deep text-[10px] uppercase tracking-wider text-ws-mist">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">Date</th>
                      <th className="px-3 py-3 text-left font-semibold">N°</th>
                      <th className="min-w-0 px-3 py-3 text-left font-semibold">Contrepartie</th>
                      <th className="px-4 py-3 text-right font-semibold">Montant</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentPaid.map((inv) => (
                      <tr
                        key={inv.id}
                        className="border-b border-white/[0.04] transition-colors hover:bg-ws-raised/35"
                      >
                        <td className="whitespace-nowrap px-4 py-3 tabular-nums text-ws-ink">
                          {formatDate(inv.paid_date || inv.created_at)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 text-ws-mist">{inv.invoice_number || '—'}</td>
                        <td className="max-w-[200px] truncate px-3 py-3 text-ws-paper" title={inv.client?.name || ''}>
                          {inv.client?.name || '—'}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right text-base font-semibold tabular-nums text-ws-gold">
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

        <p className="mt-8 text-center font-mono text-[10px] uppercase tracking-[0.15em] text-ws-mist">
          <time dateTime={updatedIso}>Actualisé · {updatedLabel}</time>
        </p>
      </div>
    </div>
  );
}

export function RevenueDesk({
  monthlyRows,
  invoices,
  title = "Chiffre d'affaires",
  subtitle = 'Encaissements réalisés — série, variations et journal des règlements.',
}: RevenueDeskProps) {
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

    return {
      mtd: mtdVal,
      ytd: ytdVal,
      pendingTotal: pend,
      overdueTotal: ovd,
      paidCount: paid.length,
      recentPaid: ledger.slice(0, 10),
      totalSixMonth: sixSum,
    };
  }, [invoices, monthlyRows, cm, cy]);

  const { mtd, ytd, pendingTotal, overdueTotal, paidCount, recentPaid, totalSixMonth } = computed;

  const currentMonthRowIndex = monthlyRows.length > 0 ? monthlyRows.length - 1 : -1;

  const updatedLabel = now.toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
  const updatedIso = now.toISOString();

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
        className="ws-card relative overflow-hidden rounded-[1.35rem]"
        aria-labelledby="revenue-desk-title"
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          aria-hidden
          style={{
            backgroundImage: `linear-gradient(rgba(175, 112, 55, 0.35) 1px, transparent 1px),
            linear-gradient(90deg, rgba(175, 112, 55, 0.28) 1px, transparent 1px)`,
            backgroundSize: '28px 28px',
          }}
        />

        <div
          className="pointer-events-none absolute -right-8 -top-10 h-40 w-40 opacity-[0.2]"
          aria-hidden
        >
          <svg viewBox="0 0 160 160" className="h-full w-full text-ws-accent">
            <circle cx="80" cy="80" r="72" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.9" />
            <circle cx="80" cy="80" r="52" fill="none" stroke="currentColor" strokeWidth="0.35" opacity="0.5" />
          </svg>
        </div>

        <div className="relative border-b border-white/[0.07] bg-ws-deep/50 px-4 py-3 pr-14 md:px-5 md:pr-16">
          <button
            type="button"
            onClick={openExpanded}
            className="absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.1] bg-ws-panel/70 text-ws-gold shadow-sm transition-all hover:border-ws-accent/40 hover:bg-ws-accent-dim/40 hover:text-ws-paper touch-manipulation md:right-4 md:top-3.5"
            aria-label="Agrandir la vue chiffre d'affaires"
            title="Vue plein écran"
          >
            <Maximize2 size={18} strokeWidth={2} />
          </button>

          <div className="h-px w-full max-w-[200px] bg-gradient-to-r from-ws-accent/60 via-ws-gold/40 to-transparent mb-3" />
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl border border-ws-accent/30 bg-ws-accent-dim shadow-glow-sm">
                <Landmark className="h-[18px] w-[18px] text-ws-accent-soft" strokeWidth={2} />
              </div>
              <div>
                <p className="ws-section-title mb-1">Trésorerie & encaissements</p>
                <h2 id="revenue-desk-title" className="font-display text-base font-bold tracking-tight text-ws-paper md:text-lg">
                  {title}
                </h2>
                <p className="mt-0.5 max-w-xl text-[11px] leading-relaxed text-ws-ink">{subtitle}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-2xl border border-white/[0.08] bg-ws-panel/60 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.15em] text-ws-gold">
              <Sparkles className="h-3.5 w-3.5 text-ws-accent-soft" strokeWidth={2} />
              Synthèse
            </div>
          </div>
        </div>

        <div className="relative grid grid-cols-2 border-b border-white/[0.06] bg-ws-deep/30 font-mono md:grid-cols-4">
          {[
            { k: 'MTD', v: formatCurrency(mtd), hint: 'Mois en cours' },
            { k: 'YTD', v: formatCurrency(ytd), hint: `Cumul ${cy}` },
            { k: 'À encaisser', v: formatCurrency(pendingTotal), hint: 'Factures envoyées' },
            { k: 'Retard', v: formatCurrency(overdueTotal), hint: 'Échéance dépassée' },
          ].map((cell) => (
            <div
              key={cell.k}
              className="border-b border-white/[0.05] px-3 py-2.5 md:border-b-0 md:border-r md:border-white/[0.06] md:last:border-r-0"
            >
              <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-ws-mist">{cell.k}</p>
              <p className="mt-1 tabular-nums text-sm font-semibold tracking-tight text-ws-paper">{cell.v}</p>
              <p className="mt-0.5 text-[9px] uppercase tracking-wide text-ws-ink">{cell.hint}</p>
            </div>
          ))}
        </div>

        <div className="relative grid gap-0 lg:grid-cols-[1fr_minmax(0,340px)] lg:divide-x lg:divide-white/[0.06]">
          <div className="min-w-0 space-y-4 border-b border-white/[0.06] pb-4 lg:border-b-0 lg:pb-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[280px] border-collapse text-left font-mono text-xs">
                <thead>
                  <tr className="ws-table-header">
                    <th className="whitespace-nowrap px-3 py-2.5">Période</th>
                    <th className="whitespace-nowrap px-3 py-2.5 text-right">Net encaissé</th>
                    <th className="whitespace-nowrap px-3 py-2.5 text-right">Δ m/m</th>
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
                        className={`border-b border-white/[0.04] transition-colors hover:bg-ws-raised/50 ${
                          isCurrentMonth ? 'bg-ws-accent-dim/25 ring-1 ring-inset ring-ws-accent/25' : ''
                        } ${idx % 2 === 1 && !isCurrentMonth ? 'bg-black/10' : ''}`}
                      >
                        <td className="whitespace-nowrap px-3 py-2.5">
                          <span className="font-semibold text-ws-paper">{row.label}</span>
                          {isCurrentMonth && (
                            <span className="ml-2 inline-block rounded-full border border-ws-accent/40 bg-ws-accent-dim px-1.5 py-px text-[8px] font-bold uppercase tracking-wider text-ws-accent-soft">
                              Courant
                            </span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums font-semibold text-ws-gold">
                          {formatCurrency(row.value)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums">
                          {delta === null ? (
                            <span className="text-ws-mist">—</span>
                          ) : flat ? (
                            <span className="text-ws-mist">0,0%</span>
                          ) : (
                            <span
                              className={`inline-flex items-center justify-end gap-0.5 font-semibold ${
                                up ? 'text-ws-accent-soft' : 'text-ws-bear'
                              }`}
                            >
                              {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                              {Math.abs(delta).toFixed(1)}%
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t border-ws-accent/25 bg-ws-accent-dim/20 font-semibold">
                    <td className="px-3 py-2.5 uppercase tracking-wider text-ws-accent-soft">6 mois</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-ws-paper">
                      {formatCurrency(totalSixMonth)}
                    </td>
                    <td className="px-3 py-2.5 text-right text-[10px] uppercase tracking-wider text-ws-mist">
                      {paidCount} facture{paidCount > 1 ? 's' : ''} payée{paidCount > 1 ? 's' : ''} · glissant
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <RevenueChartsPanel monthlyRows={monthlyRows} />
          </div>

          <div className="border-t border-white/[0.06] bg-ws-deep/25 lg:border-t-0">
            <div className="flex items-center gap-2 border-b border-white/[0.06] px-4 py-2.5">
              <Receipt className="h-3.5 w-3.5 text-ws-accent-soft" strokeWidth={2} />
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-ws-ink">
                Derniers encaissements
              </p>
            </div>
            <div className="max-h-[min(420px,55vh)] overflow-y-auto overscroll-contain">
              {recentPaid.length === 0 ? (
                <p className="px-4 py-8 text-center text-xs text-ws-mist">Aucun encaissement enregistré</p>
              ) : (
                <table className="w-full border-collapse font-mono text-[11px]">
                  <thead className="sticky top-0 z-[1] border-b border-white/[0.06] bg-ws-deep/95 text-[9px] uppercase tracking-wider text-ws-mist backdrop-blur-sm">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold">Date</th>
                      <th className="px-2 py-2 text-left font-semibold">N°</th>
                      <th className="min-w-0 px-2 py-2 text-left font-semibold">Contrepartie</th>
                      <th className="px-3 py-2 text-right font-semibold">Montant</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentPaid.map((inv, i) => (
                      <tr
                        key={inv.id}
                        className={`border-b border-white/[0.04] transition-colors hover:bg-ws-raised/40 ${
                          i % 2 === 1 ? 'bg-black/[0.07]' : ''
                        }`}
                      >
                        <td className="whitespace-nowrap px-3 py-2 tabular-nums text-ws-ink">
                          {formatDate(inv.paid_date || inv.created_at)}
                        </td>
                        <td className="whitespace-nowrap px-2 py-2 text-ws-mist">
                          {inv.invoice_number || '—'}
                        </td>
                        <td className="max-w-[140px] truncate px-2 py-2 text-ws-paper" title={inv.client?.name || ''}>
                          {inv.client?.name || '—'}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-right font-semibold tabular-nums text-ws-gold">
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

        <div className="relative flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.06] bg-ws-deep/40 px-4 py-2 text-[10px] font-mono uppercase tracking-[0.12em] text-ws-mist">
          <span className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-ws-accent shadow-glow-sm" aria-hidden />
            Données à la consultation
          </span>
          <div className="flex items-center gap-3">
            <time dateTime={updatedIso}>{updatedLabel}</time>
            <button
              type="button"
              onClick={openExpanded}
              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-ws-panel/50 text-ws-gold transition-colors hover:border-ws-accent/35 hover:bg-ws-accent-dim/30 hover:text-ws-paper touch-manipulation"
              aria-label="Agrandir la vue chiffre d'affaires"
              title="Vue plein écran"
            >
              <Maximize2 size={16} strokeWidth={2} />
            </button>
          </div>
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
