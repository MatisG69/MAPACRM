interface ProgressBarProps {
  value: number;
  max?: number;
  size?: 'sm' | 'md';
  color?: 'blue' | 'emerald' | 'amber' | 'red' | 'bull';
  showLabel?: boolean;
  className?: string;
}

export function ProgressBar({
  value,
  max = 100,
  size = 'md',
  color = 'bull',
  showLabel = false,
  className = '',
}: ProgressBarProps) {
  const pct = Math.min(100, Math.round((value / max) * 100));

  const colors = {
    blue: 'bg-ws-highlight',
    emerald: 'bg-ws-accent',
    amber: 'bg-ws-accent-soft',
    red: 'bg-ws-bear',
    bull: 'bg-gradient-to-r from-ws-accent-muted to-ws-accent-soft shadow-[0_0_14px_rgba(175,112,55,0.5)]',
  };

  const heights = { sm: 'h-1', md: 'h-1.5' };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div
        className={`flex-1 bg-ws-deep rounded-full overflow-hidden border border-ws-line ${heights[size]}`}
      >
        <div
          className={`${heights[size]} rounded-full transition-all duration-500 ${colors[color]}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-[10px] font-mono font-semibold text-ws-mist w-9 text-right tabular-nums">
          {pct}%
        </span>
      )}
    </div>
  );
}
