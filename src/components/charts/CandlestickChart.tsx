import type { RevenueMonthRow } from '../revenue/revenueTypes';

const BULL = '#c98a4c';
const BEAR = '#c45c5c';
const WICK = '#7d6f62';

interface CandlestickChartProps {
  rows: RevenueMonthRow[];
  height?: number;
}

/** Bougies type OHLC : open = clôture mois précédent, close = CA du mois, mèches synthétiques pour lisibilité. */
export function CandlestickChart({ rows, height = 160 }: CandlestickChartProps) {
  if (rows.length === 0) {
    return (
      <div className="flex h-[160px] items-center justify-center text-xs text-ws-mist font-mono">
        Aucune donnée
      </div>
    );
  }

  const slot = 46;
  const padX = 14;
  const padT = 14;
  const padB = 26;
  const w = padX * 2 + rows.length * slot;
  const innerH = height - padT - padB;

  const candles = rows.map((row, i) => {
    const open = i === 0 ? row.value : rows[i - 1].value;
    const close = row.value;
    const base = Math.max(open, close, 1);
    const spread = Math.max(base * 0.08, close * 0.05 + 50);
    const high = Math.max(open, close) + spread;
    const low = Math.max(0, Math.min(open, close) - spread * 0.6);
    return { label: row.label, open, close, high, low, bull: close >= open };
  });

  const minV = Math.min(...candles.map((c) => c.low), 0);
  const maxV = Math.max(...candles.map((c) => c.high), 1);
  const span = maxV - minV || 1;

  const yAt = (v: number) => padT + ((maxV - v) / span) * innerH;

  return (
    <div className="w-full overflow-x-auto scrollbar-none">
      <svg width={w} height={height} className="mx-auto block" aria-label="Graphique en chandeliers">
        <line
          x1={0}
          y1={yAt(maxV)}
          x2={w}
          y2={yAt(maxV)}
          stroke="rgba(255,255,255,0.04)"
          strokeWidth={1}
        />
        <line
          x1={0}
          y1={yAt(minV)}
          x2={w}
          y2={yAt(minV)}
          stroke="rgba(255,255,255,0.04)"
          strokeWidth={1}
        />
        {candles.map((c, i) => {
          const cx = padX + i * slot + slot / 2;
          const yHigh = yAt(c.high);
          const yLow = yAt(c.low);
          const yOpen = yAt(c.open);
          const yClose = yAt(c.close);
          const top = Math.min(yOpen, yClose);
          const bottom = Math.max(yOpen, yClose);
          const bodyH = Math.max(bottom - top, 2);
          const bodyW = 9;
          const fill = c.bull ? BULL : BEAR;
          const stroke = c.bull ? '#af7037' : '#a84848';

          return (
            <g key={c.label}>
              <line x1={cx} y1={yHigh} x2={cx} y2={yLow} stroke={WICK} strokeWidth={1.25} opacity={0.9} />
              <rect
                x={cx - bodyW / 2}
                y={top}
                width={bodyW}
                height={bodyH}
                rx={2}
                fill={fill}
                stroke={stroke}
                strokeWidth={1}
                opacity={0.95}
              />
              <text
                x={cx}
                y={height - 6}
                textAnchor="middle"
                fontSize={9}
                fill="#7d6f62"
                fontFamily="JetBrains Mono, monospace"
              >
                {c.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
