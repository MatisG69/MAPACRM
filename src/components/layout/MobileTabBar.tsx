import type { Page } from '../../lib/types';
import { MAIN_NAV_ITEMS } from '../../lib/navItems';

interface MobileTabBarProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
}

export function MobileTabBar({ currentPage, onNavigate }: MobileTabBarProps) {
  const activeId =
    currentPage === 'client-detail'
      ? 'clients'
      : currentPage === 'project-detail'
        ? 'projects'
        : currentPage;

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 md:hidden pb-[max(0.85rem,env(safe-area-inset-bottom))] pointer-events-none"
      aria-label="Navigation principale"
    >
      <div className="pointer-events-auto mx-3 mb-1 rounded-[1.75rem] border border-white/[0.1] bg-zinc-950/88 backdrop-blur-2xl shadow-[0_-8px_40px_rgba(0,0,0,0.55)] w-[calc(100%-1.5rem)] max-w-xl mx-auto [color-scheme:dark]">
        <div
          className="flex items-end justify-between gap-0.5 px-1.5 pt-2.5 pb-2 overflow-x-auto scrollbar-ws snap-x snap-mandatory touch-pan-x"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {MAIN_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeId === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id)}
                className={`flex flex-col items-center justify-center min-w-[3.35rem] flex-1 max-w-[4.85rem] snap-center rounded-2xl py-2 px-1 transition-all duration-300 active:scale-95 touch-manipulation ${
                  isActive ? '' : 'text-ws-ink active:bg-white/[0.04]'
                }`}
                aria-current={isActive ? 'page' : undefined}
              >
                <span
                  className={`flex items-center justify-center w-[2.85rem] h-[2.85rem] rounded-full transition-all duration-300 ${
                    isActive
                      ? 'bg-gradient-to-b from-ws-cream to-ws-cream-dim shadow-nav-orb'
                      : 'bg-transparent'
                  }`}
                >
                  <Icon
                    size={21}
                    strokeWidth={isActive ? 2.1 : 1.45}
                    className={
                      isActive ? 'text-[#3d2a1c]' : 'text-ws-mist'
                    }
                  />
                </span>
                <span
                  className={`text-[9px] font-semibold mt-1 leading-tight text-center truncate w-full px-0.5 tracking-wide ${
                    isActive ? 'text-ws-cream' : 'text-ws-mist'
                  }`}
                >
                  {item.shortLabel}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
