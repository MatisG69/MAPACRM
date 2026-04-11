import { Page } from '../../lib/types';
import { MAIN_NAV_ITEMS } from '../../lib/navItems';

interface SidebarProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
}

/** Regroupement aligné sur un parcours commercial classique */
const SECTIONS: { label: string; pages: readonly Page[] }[] = [
  { label: 'Synthèse', pages: ['dashboard'] },
  { label: 'Portefeuille', pages: ['clients', 'projects', 'tasks'] },
  { label: 'Pilotage', pages: ['calendar', 'analytics', 'invoices'] },
];

export function Sidebar({ currentPage, onNavigate }: SidebarProps) {
  const activePage =
    currentPage === 'client-detail'
      ? 'clients'
      : currentPage === 'project-detail'
        ? 'projects'
        : currentPage;

  return (
    <aside
      className="hidden md:flex fixed z-30 left-4 top-4 bottom-4 w-64 flex-col rounded-2xl border border-ws-lineStrong/60 bg-ws-panel/95 backdrop-blur-2xl shadow-dock overflow-hidden ring-1 ring-white/[0.04]"
      aria-label="Navigation principale"
    >
      {/* En-tête marque */}
      <div className="relative px-5 pt-6 pb-5 border-b border-ws-line/90">
        <div
          className="absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-ws-accent/45 to-transparent opacity-90"
          aria-hidden
        />
        <div className="flex items-start gap-3.5">
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl border border-ws-accent/20 bg-gradient-to-br from-ws-raised to-ws-surface shadow-card-inner">
            <span
              className="font-display text-[15px] font-bold tracking-tight text-ws-cream"
              aria-hidden
            >
              M
            </span>
          </div>
          <div className="min-w-0 pt-0.5">
            <p className="font-display text-[15px] font-semibold tracking-tight text-ws-paper leading-none">
              MAPACRM
            </p>
            <p className="mt-1.5 font-mono text-[9px] font-medium uppercase tracking-[0.2em] text-ws-mist/85">
              Suite commerciale
            </p>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-5 [scrollbar-width:thin]" aria-label="Sections">
        {SECTIONS.map((section) => {
          const items = MAIN_NAV_ITEMS.filter((item) => section.pages.includes(item.id));
          if (items.length === 0) return null;
          return (
            <div key={section.label} className="mb-6 last:mb-0">
              <p className="px-3 mb-2 font-mono text-[9px] font-semibold uppercase tracking-[0.22em] text-ws-mist/70">
                {section.label}
              </p>
              <ul className="space-y-0.5" role="list">
                {items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activePage === item.id;
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => onNavigate(item.id)}
                        aria-current={isActive ? 'page' : undefined}
                        className={`group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ws-accent/50 ${
                          isActive
                            ? 'bg-white/[0.07] text-ws-paper shadow-card-inner'
                            : 'text-ws-ink hover:bg-white/[0.04] hover:text-ws-paper'
                        }`}
                      >
                        {isActive && (
                          <span
                            className="absolute left-0 top-1/2 h-[62%] w-[3px] -translate-y-1/2 rounded-full bg-gradient-to-b from-ws-accent-soft to-ws-accent-muted shadow-[0_0_12px_rgba(201,138,76,0.35)]"
                            aria-hidden
                          />
                        )}
                        <span
                          className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg transition-all duration-150 ${
                            isActive
                              ? 'bg-ws-accent-dim text-ws-accent-soft ring-1 ring-ws-accent/30'
                              : 'bg-white/[0.04] text-ws-mist group-hover:bg-white/[0.07] group-hover:text-ws-paper'
                          }`}
                        >
                          <Icon size={18} strokeWidth={isActive ? 2.1 : 1.65} />
                        </span>
                        <span className="min-w-0 flex-1 text-[13px] font-medium leading-snug tracking-tight">
                          {item.label}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      {/* Pied : contexte session */}
      <div className="border-t border-ws-line/90 bg-black/25 px-4 py-4">
        <div className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-ws-surface/60 px-3 py-2.5">
          <div className="relative flex-shrink-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-ws-lineStrong/80 bg-ws-raised/80 font-mono text-[10px] font-bold text-ws-gold">
              CRM
            </div>
            <span
              className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-ws-panel bg-emerald-500/95"
              title="Connecté"
              aria-hidden
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-ws-paper">Espace de travail</p>
            <p className="truncate font-mono text-[10px] text-ws-mist/90">Données synchronisées</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
