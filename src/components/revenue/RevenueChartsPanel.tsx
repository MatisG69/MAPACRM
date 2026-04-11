import { DonutChart } from '../charts/DonutChart';
import { BarChart } from '../charts/BarChart';
import { CandlestickChart } from '../charts/CandlestickChart';
import type { RevenueMonthRow } from './revenueTypes';
import { formatCurrency } from '../../lib/utils';

const DONUT_COLORS = ['#af7037', '#c98a4c', '#8b572a', '#d4a574', '#a67c52', '#6b4423'];

function compactEUR(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M €`;
  if (abs >= 10_000) return `${Math.round(n / 1000)} k€`;
  if (abs >= 1000) return `${(n / 1000).toFixed(1)} k€`;
  return formatCurrency(n);
}

interface RevenueChartsPanelProps {
  monthlyRows: RevenueMonthRow[];
  /** Plus d’air pour la vue élargie */
  spacious?: boolean;
}

export function RevenueChartsPanel({ monthlyRows, spacious }: RevenueChartsPanelProps) {
  const barData = monthlyRows.map((r) => ({ label: r.label, value: r.value }));
  const donutSegments = monthlyRows
    .map((r, i) => ({
      label: r.label,
      value: r.value,
      color: DONUT_COLORS[i % DONUT_COLORS.length],
    }))
    .filter((s) => s.value > 0);

  const cardClass = spacious
    ? 'rounded-2xl border border-white/[0.08] bg-ws-deep/50 p-3 min-w-0 sm:p-5 md:p-6'
    : 'rounded-xl border border-white/[0.08] bg-ws-deep/40 p-4 min-w-0';

  return (
    <div className={`grid min-w-0 gap-3 sm:gap-4 lg:grid-cols-3 ${spacious ? 'xl:gap-5' : ''}`}>
      <div className={cardClass}>
        <h3 className="ws-section-title mb-0.5">Répartition</h3>
        <p className="mb-3 text-[10px] font-mono uppercase tracking-wider text-ws-mist">
          Part du CA · 6 mois
        </p>
        {donutSegments.length === 0 ? (
          <p className="py-8 text-center font-mono text-xs text-ws-mist">Aucun encaissement sur la période</p>
        ) : (
          <div className="flex w-full min-w-0 justify-center overflow-x-auto py-1 [-webkit-overflow-scrolling:touch]">
            <DonutChart
              segments={donutSegments}
              size={spacious ? 136 : 132}
              trackColor="#1a1614"
              centerCaption="6 MOIS"
              formatCenter={(t) => compactEUR(t)}
              formatLegendValue={(v) => compactEUR(v)}
            />
          </div>
        )}
      </div>

      <div className={cardClass}>
        <h3 className="ws-section-title mb-0.5">Histogramme</h3>
        <p className="mb-3 text-[10px] font-mono uppercase tracking-wider text-ws-mist">
          Encaissements mensuels · EUR
        </p>
        <div className="min-w-0 w-full overflow-x-auto [-webkit-overflow-scrolling:touch]">
          <BarChart
            data={barData}
            color="#af7037"
            height={spacious ? 168 : 152}
            formatValue={(v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : `${Math.round(v)}`)}
          />
        </div>
      </div>

      <div className={cardClass}>
        <h3 className="ws-section-title mb-0.5">Chandeliers</h3>
        <p className="mb-3 text-[10px] font-mono uppercase tracking-wider text-ws-mist">
          Open → clôture mois préc. · Close → mois · mèches indicatives
        </p>
        <div className="min-w-0 w-full">
          <CandlestickChart rows={monthlyRows} height={spacious ? 160 : 152} />
        </div>
      </div>
    </div>
  );
}
