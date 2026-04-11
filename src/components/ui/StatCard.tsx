import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  iconBg: string;
  trend?: number;
  trendLabel?: string;
  onClick?: () => void;
  className?: string;
}

export function StatCard({ label, value, icon, iconBg, trend, trendLabel, onClick, className = '' }: StatCardProps) {
  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      className={`ws-card rounded-2xl p-5 ${
        onClick
          ? 'cursor-pointer hover:border-ws-accent/40 hover:shadow-glow transition-all duration-200 group touch-manipulation active:scale-[0.99]'
          : ''
      } ${className}`}
    >
      <div className="flex items-start justify-between mb-4">
        <div
          className={`w-11 h-11 rounded-2xl flex items-center justify-center border border-ws-line ${iconBg}`}
        >
          {icon}
        </div>
        {trend !== undefined && (
          <div
            className={`flex items-center gap-1 text-[10px] font-mono font-bold rounded px-2 py-1 border ${
              trend > 0
                ? 'bg-ws-bull-dim text-ws-bull border-ws-bull/25'
                : trend < 0
                  ? 'bg-ws-bear-dim text-ws-bear border-ws-bear/25'
                  : 'bg-ws-deep text-ws-mist border-ws-line'
            }`}
          >
            {trend > 0 ? <TrendingUp size={11} /> : trend < 0 ? <TrendingDown size={11} /> : <Minus size={11} />}
            {trend > 0 ? '+' : ''}
            {trend}%
          </div>
        )}
      </div>
      <p className="text-2xl font-mono font-bold text-ws-paper tracking-tight mb-1 tabular-nums">{value}</p>
      <p className="text-xs font-medium uppercase tracking-wider text-ws-ink">{label}</p>
      {trendLabel && (
        <p className="text-[11px] font-mono text-ws-mist mt-2 pt-2 border-t border-ws-line/60">{trendLabel}</p>
      )}
    </div>
  );
}
