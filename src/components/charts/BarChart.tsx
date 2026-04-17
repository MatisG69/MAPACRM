interface BarChartProps {
  data: { label: string; value: number }[];
  color?: string;
  height?: number;
  formatValue?: (v: number) => string;
}

export function BarChart({ data, color = '#af7037', height = 160, formatValue }: BarChartProps) {
  const max = Math.max(...data.map((d) => d.value), 1);
  const labelFill = '#7d6f62';
  const valueFill = '#c98a4c';

  const chartW = Math.max(data.length * 60, 120);

  return (
    <div className="min-w-0 overflow-x-auto [-webkit-overflow-scrolling:touch] scrollbar-ws" style={{ height }}>
      <svg width={chartW} height={height} viewBox={`0 0 ${chartW} ${height}`} preserveAspectRatio="xMidYMid meet" className="block min-w-0">
        {data.map((d, i) => {
          const barH = Math.max(4, (d.value / max) * (height - 40));
          const x = i * 60 + 8;
          const y = height - barH - 20;
          return (
            <g key={i}>
              <rect
                x={x}
                y={y}
                width={44}
                height={barH}
                rx={8}
                fill={color}
                opacity={0.9}
                className="transition-all duration-300"
              />
              <text x={x + 22} y={height - 4} textAnchor="middle" fontSize={9} fill={labelFill} fontFamily="JetBrains Mono, monospace">
                {d.label}
              </text>
              {d.value > 0 && (
                <text
                  x={x + 22}
                  y={y - 4}
                  textAnchor="middle"
                  fontSize={9}
                  fill={valueFill}
                  fontWeight="600"
                  fontFamily="JetBrains Mono, monospace"
                >
                  {formatValue ? formatValue(d.value) : d.value}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

interface BarChartCardProps {
  title: string;
  data: { label: string; value: number }[];
  color?: string;
  formatValue?: (v: number) => string;
}

export function BarChartCard({ title, data, color, formatValue }: BarChartCardProps) {
  return (
    <div className="ws-card rounded-2xl p-5">
      <h3 className="ws-section-title mb-1">{title}</h3>
      <p className="text-[10px] font-mono text-ws-mist mb-4 uppercase tracking-wider">Performance · EUR</p>
      <BarChart data={data} color={color} formatValue={formatValue} />
    </div>
  );
}
