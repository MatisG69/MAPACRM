interface Segment {
  label: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  segments: Segment[];
  size?: number;
}

export function DonutChart({ segments, size = 140 }: DonutChartProps) {
  const total = segments.reduce((s, d) => s + d.value, 0);
  const radius = size / 2 - 16;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * radius;
  const trackColor = '#262626';

  let cumulative = 0;

  const arcs = segments.map((seg) => {
    const pct = total > 0 ? seg.value / total : 0;
    const offset = circumference * (1 - cumulative);
    const dash = circumference * pct;
    cumulative += pct;
    return { ...seg, pct, offset, dash };
  });

  return (
    <div className="flex items-center gap-6">
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
            y={cy - 4}
            textAnchor="middle"
            fontSize={22}
            fontWeight="700"
            fill="#fafafa"
            fontFamily="JetBrains Mono, monospace"
          >
            {total}
          </text>
          <text
            x={cx}
            y={cy + 14}
            textAnchor="middle"
            fontSize={9}
            fill="#737373"
            fontFamily="JetBrains Mono, monospace"
            letterSpacing="0.1em"
          >
            TOTAL
          </text>
        </svg>
      </div>
      <div className="space-y-2 flex-1 min-w-0">
        {arcs.map((arc, i) => (
          <div key={i} className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2 h-2 rounded-sm flex-shrink-0" style={{ backgroundColor: arc.color }} />
              <span className="text-[11px] text-ws-ink truncate uppercase tracking-wide">{arc.label}</span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 font-mono text-[11px]">
              <span className="font-bold text-ws-paper tabular-nums">{arc.value}</span>
              <span className="text-ws-mist tabular-nums">{Math.round(arc.pct * 100)}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
