/** Bandeau type terminal marché — indicateurs défilants horizontaux. */
export interface DeskTickerItem {
  symbol: string;
  value: string;
  hint?: string;
  /** Vert / rouge / neutre pour variation */
  variant?: 'bull' | 'bear' | 'flat';
}

export function DeskTicker({ items }: { items: DeskTickerItem[] }) {
  if (items.length === 0) return null;
  return (
    <div
      className="rounded-xl border border-emerald-600/25 bg-gradient-to-r from-[#050a08] via-[#0c1210] to-[#050a08] shadow-[inset_0_1px_0_0_rgba(52,211,153,0.08)] overflow-x-auto scrollbar-ws [color-scheme:dark]"
      role="region"
      aria-label="Indicateurs synthétiques"
    >
      <div className="flex min-w-max items-stretch divide-x divide-white/[0.06]">
        {items.map((it, i) => {
          const valCls =
            it.variant === 'bull'
              ? 'text-emerald-300'
              : it.variant === 'bear'
                ? 'text-red-400'
                : 'text-ws-cream';
          return (
            <div
              key={`${it.symbol}-${i}`}
              className="flex flex-col justify-center gap-0.5 px-4 py-2.5 sm:px-5 sm:py-3 min-w-[7.5rem]"
            >
              <span className="font-mono text-[8px] font-bold uppercase tracking-[0.2em] text-emerald-600/90 sm:text-[9px]">
                {it.symbol}
              </span>
              <span className={`font-mono text-sm font-bold tabular-nums tracking-tight sm:text-base ${valCls}`}>
                {it.value}
              </span>
              {it.hint && (
                <span className="font-mono text-[9px] uppercase tracking-wide text-ws-mist/90">{it.hint}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
