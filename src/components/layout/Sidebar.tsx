import { LayoutDashboard } from 'lucide-react';
import { Page } from '../../lib/types';
import { MAIN_NAV_ITEMS } from '../../lib/navItems';

interface SidebarProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
}

export function Sidebar({ currentPage, onNavigate }: SidebarProps) {
  const activePage =
    ['client-detail'].includes(currentPage)
      ? 'clients'
      : ['project-detail'].includes(currentPage)
        ? 'projects'
        : currentPage;

  return (
    <aside className="hidden md:flex fixed z-30 left-4 top-4 bottom-4 w-56 flex-col rounded-[1.85rem] border border-white/[0.07] bg-ws-panel/88 backdrop-blur-xl shadow-dock overflow-hidden">
      <div className="px-4 pt-5 pb-4 border-b border-ws-line/80">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-ws-accent-soft to-ws-accent-muted flex items-center justify-center flex-shrink-0 shadow-glow-sm border border-white/10">
            <LayoutDashboard size={22} className="text-ws-cream" strokeWidth={2} />
          </div>
          <div>
            <p className="text-ws-paper text-sm font-bold tracking-tight leading-tight">CRM</p>
            <p className="text-[10px] font-medium text-ws-mist tracking-wide mt-0.5">Command center</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-ws-mist px-3 mb-2">Menu</p>
        {MAIN_NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-3 pl-2 pr-3 py-2 rounded-2xl text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-ws-accent-muted/35 text-ws-cream border border-white/[0.08] shadow-glow-sm'
                  : 'text-ws-ink hover:text-ws-paper hover:bg-white/[0.04] border border-transparent'
              }`}
            >
              <span
                className={`flex items-center justify-center w-10 h-10 rounded-full flex-shrink-0 transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-b from-ws-cream to-ws-cream-dim text-[#3d2a1c] shadow-nav-orb'
                    : 'text-ws-mist'
                }`}
              >
                <Icon size={20} strokeWidth={isActive ? 2.2 : 1.55} />
              </span>
              <span className="flex-1 text-left">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="px-3 py-4 border-t border-ws-line bg-black/20">
        <div className="flex items-center gap-3 px-1">
          <div className="w-10 h-10 rounded-xl bg-ws-line flex items-center justify-center border border-white/[0.06]">
            <span className="text-ws-gold font-mono text-xs font-bold">CD</span>
          </div>
          <div>
            <p className="text-ws-paper text-xs font-semibold">Commercial</p>
            <p className="text-ws-mist text-[10px]">En ligne</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
