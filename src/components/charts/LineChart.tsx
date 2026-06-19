import { useId, useRef, useState, type PointerEvent } from 'react';

interface LineChartProps {
  data: number[];
  /** Étiquette par point (ex. dates « 5 juin ») — active le tooltip. */
  labels?: string[];
  color?: string;
  height?: number;
  fill?: boolean;
  /** Unité au singulier pour le tooltip (ex. « vue » → « 3 vues »). */
  unit?: string;
}

interface Pt {
  x: number;
  y: number;
}

/** Courbe lissée (Catmull-Rom → bézier cubique). */
function smoothPath(pts: Pt[]): string {
  if (pts.length < 2) return '';
  const t = 0.18;
  let d = `M ${pts[0].x},${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const cp1x = p1.x + (p2.x - p0.x) * t;
    const cp1y = p1.y + (p2.y - p0.y) * t;
    const cp2x = p2.x - (p3.x - p1.x) * t;
    const cp2y = p2.y - (p3.y - p1.y) * t;
    d += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
  }
  return d;
}

export function LineChart({
  data,
  labels,
  color = '#af7037',
  height = 60,
  fill = true,
  unit,
}: LineChartProps) {
  const uid = useId().replace(/:/g, '');
  const wrapRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<number | null>(null);

  if (data.length < 2) return null;

  const max = Math.max(...data, 1);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 200;
  const h = height;
  const padX = 4;
  const padY = 8;

  const points: Pt[] = data.map((v, i) => ({
    x: padX + (i / (data.length - 1)) * (w - padX * 2),
    y: h - padY - ((v - min) / range) * (h - padY * 2),
  }));

  const linePath = smoothPath(points);
  const areaPath = `${linePath} L ${points[points.length - 1].x},${h} L ${points[0].x},${h} Z`;
  const lastIdx = points.length - 1;
  const showDots = data.length <= 8;
  const gridYs = [0.25, 0.5, 0.75].map((f) => padY + f * (h - padY * 2));

  const fillId = `lc-fill-${uid}`;
  const glowId = `lc-glow-${uid}`;
  const interactive = Boolean(labels && labels.length === data.length);

  const idxFromEvent = (e: PointerEvent<HTMLDivElement>) => {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return null;
    const rel = (e.clientX - rect.left) / rect.width;
    return Math.max(0, Math.min(data.length - 1, Math.round(rel * (data.length - 1))));
  };

  const cur = active ?? lastIdx;
  const curPt = points[cur];
  const leftPct = (cur / (data.length - 1)) * 100;
  const fmtVal = (v: number) => `${v.toLocaleString('fr-FR')}${unit ? ` ${unit}${v !== 1 ? 's' : ''}` : ''}`;

  return (
    <div ref={wrapRef} className="relative w-full select-none">
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="w-full overflow-visible block"
        role="img"
        aria-label={
          labels
            ? `Évolution : ${fmtVal(data[lastIdx])} le ${labels[lastIdx]}`
            : 'Évolution'
        }
      >
        <defs>
          <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.3} />
            <stop offset="55%" stopColor={color} stopOpacity={0.08} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
          <filter id={glowId} x="-20%" y="-40%" width="140%" height="180%">
            <feDropShadow dx="0" dy="1.5" stdDeviation="2" floodColor={color} floodOpacity="0.35" />
          </filter>
        </defs>

        {/* Grille discrète */}
        {gridYs.map((gy, i) => (
          <line
            key={i}
            x1={padX}
            y1={gy}
            x2={w - padX}
            y2={gy}
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
        ))}

        {fill && <path d={areaPath} fill={`url(#${fillId})`} />}

        <path
          d={linePath}
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
          filter={`url(#${glowId})`}
        />

        {showDots &&
          points.map((p, i) =>
            i === cur ? null : (
              <circle key={i} cx={p.x} cy={p.y} r={1.6} fill={color} opacity={0.5} />
            )
          )}

        {/* Guide vertical + point actif */}
        {interactive && active !== null && (
          <line
            x1={curPt.x}
            y1={padY - 2}
            x2={curPt.x}
            y2={h}
            stroke={color}
            strokeWidth={1}
            strokeDasharray="3 3"
            opacity={0.5}
            vectorEffect="non-scaling-stroke"
          />
        )}
        <circle cx={curPt.x} cy={curPt.y} r={5} fill={color} opacity={0.18} />
        <circle
          cx={curPt.x}
          cy={curPt.y}
          r={2.6}
          fill={color}
          stroke="#fff"
          strokeWidth={1}
          strokeOpacity={0.9}
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      {/* Tooltip (date + valeur) */}
      {interactive && (
        <div
          className="pointer-events-none absolute -top-1 z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg border border-ws-line bg-ws-panel/95 px-2.5 py-1.5 text-center shadow-glow-sm backdrop-blur transition-opacity"
          style={{
            left: `${Math.min(88, Math.max(12, leftPct))}%`,
            opacity: active === null ? 0 : 1,
          }}
        >
          <div className="font-mono text-[9px] uppercase tracking-wider text-ws-mist">
            {labels![cur]}
          </div>
          <div className="font-display text-xs font-semibold tabular-nums text-ws-paper">
            {fmtVal(data[cur])}
          </div>
        </div>
      )}

      {/* Couche de capture pointeur */}
      {interactive && (
        <div
          className="absolute inset-0 cursor-crosshair"
          style={{ touchAction: 'pan-y' }}
          onPointerMove={(e) => setActive(idxFromEvent(e))}
          onPointerDown={(e) => setActive(idxFromEvent(e))}
          onPointerLeave={() => setActive(null)}
        />
      )}
    </div>
  );
}
