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
    <div className="flex w-full min-w-0 flex-col items-center gap-4 sm:flex-row sm:items-center sm:gap-6">
      <div className="flex-shrink-0">
        <svg width={size} height={size}>
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
      <div className="w-full min-w-0 flex-1 space-y-2 sm:w-auto">
        {arcs.map((arc, i) => (
          <div key={i} className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2 h-2 rounded-sm flex-shrink-0" style={{ backgroundColor: arc.color }} />
              <span className="text-[11px] text-ws-ink truncate uppercase tracking-wide">{arc.label}</span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 font-mono text-[11px]">
              <span className="font-bold text-ws-paper tabular-nums">
                {formatLegendValue ? formatLegendValue(arc.value) : arc.value}
              </span>
              <span className="text-ws-mist tabular-nums">{Math.round(arc.pct * 100)}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
