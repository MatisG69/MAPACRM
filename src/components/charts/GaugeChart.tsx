interface GaugeChartProps {
  value: number | null;
  size?: number;
  label?: string;
}

const GAUGE_START = 225;
const GAUGE_SWEEP = 270;

function scoreColor(v: number): string {
  if (v >= 90) return '#4ade80';
  if (v >= 50) return '#fb923c';
  return '#f87171';
}

function pToC(cx: number, cy: number, r: number, deg: number) {
  const d = ((deg % 360) - 90) * (Math.PI / 180);
  return { x: cx + r * Math.cos(d), y: cy + r * Math.sin(d) };
}

function arcPath(cx: number, cy: number, r: number, startDeg: number, endDeg: number): string {
  const s = pToC(cx, cy, r, startDeg);
  const e = pToC(cx, cy, r, endDeg);
  let sweep = endDeg - startDeg;
  if (sweep < 0) sweep += 360;
  const large = sweep > 180 ? 1 : 0;
  return `M ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${e.x.toFixed(2)} ${e.y.toFixed(2)}`;
}

export function GaugeChart({ value, size = 108, label }: GaugeChartProps) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.37;
  const sw = size * 0.085;

  const pct = value == null ? 0 : Math.max(0, Math.min(100, value));
  const endDeg = GAUGE_START + (pct / 100) * GAUGE_SWEEP;
  const trackEnd = GAUGE_START + GAUGE_SWEEP;
  const color = value == null ? '#525252' : scoreColor(value);

  const trackD = arcPath(cx, cy, r, GAUGE_START, trackEnd);
  const valueD = pct > 0 ? arcPath(cx, cy, r, GAUGE_START, endDeg) : null;

  return (
    <div className="flex flex-col items-center gap-1.5">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} overflow="visible">
        <path
          d={trackD}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={sw}
          strokeLinecap="round"
        />
        {valueD && (
          <path
            d={valueD}
            fill="none"
            stroke={color}
            strokeWidth={sw}
            strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 ${sw * 0.6}px ${color}55)` }}
          />
        )}
        <text
          x={cx}
          y={cy + size * 0.06}
          textAnchor="middle"
          fontSize={size * 0.24}
          fontWeight="700"
          fill={value == null ? '#525252' : '#EDE8DF'}
          fontFamily="JetBrains Mono, monospace"
        >
          {value == null ? '—' : value}
        </text>
      </svg>
      {label && (
        <p className="text-[9px] font-mono uppercase tracking-[0.18em] text-ws-mist text-center leading-tight px-1">
          {label}
        </p>
      )}
    </div>
  );
}
