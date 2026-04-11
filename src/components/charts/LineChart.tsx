interface LineChartProps {
  data: number[];
  color?: string;
  height?: number;
  fill?: boolean;
}

export function LineChart({ data, color = '#af7037', height = 60, fill = true }: LineChartProps) {
  if (data.length < 2) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 200;
  const h = height;
  const pad = 4;

  const points = data.map((v, i) => ({
    x: pad + (i / (data.length - 1)) * (w - pad * 2),
    y: h - pad - ((v - min) / range) * (h - pad * 2),
  }));

  const polyline = points.map((p) => `${p.x},${p.y}`).join(' ');
  const area = `${points[0].x},${h} ${polyline} ${points[points.length - 1].x},${h}`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full overflow-visible">
      <defs>
        <linearGradient id={`fill-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.2} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      {fill && (
        <polygon
          points={area}
          fill={`url(#fill-${color.replace('#', '')})`}
        />
      )}
      <polyline
        points={polyline}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={2.5} fill={color} />
      ))}
    </svg>
  );
}
