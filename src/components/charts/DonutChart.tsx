interface Segment {
  label: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  segments: Segment[];
  size?: number;
  /** Texte central (ex. montant formaté). Défaut : total brut. */
  formatCenter?: (total: number) => string;
  /** Légende montants. Défaut : valeur brute. */
  formatLegendValue?: (value: number) => string;
  /** Sous-titre sous le centre (ex. « 6 MOIS »). */
  centerCaption?: string;
  trackColor?: string;
}

export function DonutChart({
  segments,
  size = 140,
  formatCenter,
  formatLegendValue,
  centerCaption = 'TOTAL',
  trackColor = '#262626',
}: DonutChartProps) {
  const total = segments.reduce((s, d) => s + d.value, 0);
  const radius = size / 2 - 16;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * radius;
  let cumulative = 0;

  const arcs = segments.map((seg) => {
    const pct = total > 0 ? seg.value / total : 0;
    const offset = circumference * (1 - cumulative);
    const dash = circumference * pct;
    cumulative += pct;
    return { ...seg, pct, offset, dash };
  });

  return (
    <div className="flex w-full min-w-0 max-w-full flex-col items-center gap-4">
      <div className="flex-shrink-0">
        <svg width={size} height={size} className="max-w-full">
          <circle cx={cx} cy={cy} r={radius} fill="none" stroke={trackColor} strokeWidth={18} />
          {arcs.map((arc, i) => (
            <circle
              key={i}
              cx={cx}
              cy={cy}
              r={radius}
              fill="none"
              stroke={arc.color}
              strokeWidth={18}
              strokeDasharray={`${arc.dash} ${circumference - arc.dash}`}
              strokeDashoffset={arc.offset}
              strokeLinecap="butt"
              transform={`rotate(-90 ${cx} ${cy})`}
              style={{ transition: 'stroke-dasharray 0.5s ease' }}
            />
          ))}
          <text
            x={cx}
            y={cy - 2}
            textAnchor="middle"
            fontSize={formatCenter ? 11 : 22}
            fontWeight="700"
            fill="#fafafa"
            fontFamily="JetBrains Mono, monospace"
          >
            {formatCenter ? formatCenter(total) : total}
          </text>
          <text
            x={cx}
            y={cy + 12}
            textAnchor="middle"
            fontSize={9}
            fill="#737373"
            fontFamily="JetBrains Mono, monospace"
            letterSpacing="0.1em"
          >
            {centerCaption}
          </text>
        </svg>
      </div>
      <div className="w-full min-w-0 max-w-full space-y-2">
        {arcs.map((arc, i) => (
          <div
            key={i}
            className="grid w-full min-w-0 grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-x-2 gap-y-1 border-b border-white/[0.05] pb-2 last:border-0 last:pb-0"
          >
            <div className="flex min-w-0 items-center gap-2">
              <span className="h-2 w-2 flex-shrink-0 rounded-sm" style={{ backgroundColor: arc.color }} />
              <span className="min-w-0 truncate text-[11px] uppercase tracking-wide text-ws-ink">{arc.label}</span>
            </div>
            <span className="justify-self-end text-right font-mono text-[11px] font-bold tabular-nums text-ws-paper">
              {formatLegendValue ? formatLegendValue(arc.value) : arc.value}
            </span>
            <span className="w-[2.75rem] flex-shrink-0 text-right font-mono text-[11px] tabular-nums text-ws-mist">
              {Math.round(arc.pct * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
