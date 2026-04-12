import { Bell, Search } from 'lucide-react';

interface HeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

function SearchField({ className = '' }: { className?: string }) {
  return (
    <div className={`relative min-w-0 ${className}`}>
      <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ws-mist pointer-events-none" />
      <input
        type="search"
        enterKeyHint="search"
        placeholder="Rechercher…"
        className="pl-10 pr-4 py-2.5 rounded-2xl bg-ws-panel/80 border border-ws-line text-sm max-md:text-base text-ws-paper placeholder:text-ws-mist/70 focus:outline-none focus:ring-2 focus:ring-ws-accent/30 focus:border-ws-accent/40 w-full min-h-[48px] md:min-h-0 touch-manipulation"
      />
    </div>
  );
}

export function Header({ title, subtitle, actions }: HeaderProps) {
  return (
    <div className="sticky top-0 z-20 bg-ws-deep/90 backdrop-blur-2xl border-b border-white/[0.06] px-4 py-3.5 md:px-8 md:py-5 supports-[backdrop-filter]:bg-ws-deep/80">
      <div className="hidden md:flex flex-row items-start justify-between gap-6">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="h-2 w-2 rounded-full bg-ws-accent shadow-glow-sm flex-shrink-0" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-ws-accent-soft">
              Vue active
            </span>
          </div>
          <h1 className="font-display text-[1.6rem] font-bold text-white tracking-tight">{title}</h1>
          {subtitle && <p className="text-sm text-ws-ink mt-1.5 max-w-2xl leading-relaxed">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-3 flex-shrink-0 flex-wrap justify-end max-w-[50%]">
          {actions && (
            <div className="flex flex-wrap items-center gap-2 justify-end [&_button]:touch-manipulation">{actions}</div>
          )}
          <SearchField className="w-52" />
          <button
            type="button"
            className="min-w-[44px] min-h-[44px] w-10 h-10 flex items-center justify-center rounded-2xl bg-ws-panel/80 border border-ws-line text-ws-ink hover:text-ws-paper hover:border-ws-accent/30 transition-all relative touch-manipulation"
            aria-label="Notifications"
          >
            <Bell size={18} strokeWidth={1.75} />
            <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-ws-accent rounded-full ring-2 ring-ws-panel" />
          </button>
        </div>
      </div>

      <div className="md:hidden flex flex-col gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="h-2 w-2 rounded-full bg-ws-accent shadow-glow-sm flex-shrink-0" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-ws-accent-soft">
              Vue active
            </span>
          </div>
          <h1 className="font-display text-xl font-bold text-white tracking-tight break-words">{title}</h1>
          {subtitle && (
            <p className="text-xs text-ws-ink mt-1.5 max-w-2xl leading-relaxed">{subtitle}</p>
          )}
        </div>
        {actions && (
          <div className="flex flex-wrap gap-2 [&_button]:min-h-[44px] [&_button]:flex-1 [&_button]:min-w-[min(100%,10rem)] [&_button]:touch-manipulation">
            {actions}
          </div>
        )}
        <div className="flex items-center gap-2">
          <SearchField className="flex-1" />
          <button
            type="button"
            className="min-w-[44px] min-h-[44px] w-11 h-11 flex-shrink-0 flex items-center justify-center rounded-2xl bg-ws-panel/80 border border-ws-line text-ws-ink hover:text-ws-paper hover:border-ws-accent/30 transition-all relative touch-manipulation"
            aria-label="Notifications"
          >
            <Bell size={18} strokeWidth={1.75} />
            <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-ws-accent rounded-full ring-2 ring-ws-panel" />
          </button>
        </div>
      </div>
    </div>
  );
}
