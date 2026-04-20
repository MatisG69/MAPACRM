import { useState, useRef, useEffect } from 'react';
import { Bell, Search, X, Info, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { MapaLogo } from './MapaLogo';

export interface AppNotification {
  id: string
  type: 'info' | 'warning' | 'success'
  message: string
  time?: string
}

interface HeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  notifications?: AppNotification[];
}

function SearchField({
  className = '',
  value,
  onChange,
}: {
  className?: string;
  value?: string;
  onChange?: (v: string) => void;
}) {
  return (
    <div className={`relative min-w-0 ${className}`}>
      <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ws-mist pointer-events-none" />
      <input
        type="search"
        enterKeyHint="search"
        placeholder="Rechercher…"
        value={value ?? ''}
        onChange={(e) => onChange?.(e.target.value)}
        className="pl-10 pr-4 py-2.5 rounded-2xl bg-ws-panel/80 border border-ws-line text-sm max-md:text-base text-ws-paper placeholder:text-ws-mist/70 focus:outline-none focus:ring-2 focus:ring-ws-accent/30 focus:border-ws-accent/40 w-full min-h-[48px] md:min-h-0 touch-manipulation"
      />
    </div>
  );
}

const NOTIF_ICONS = {
  info: <Info size={14} className="text-ws-accent flex-shrink-0 mt-0.5" />,
  warning: <AlertTriangle size={14} className="text-ws-gold flex-shrink-0 mt-0.5" />,
  success: <CheckCircle2 size={14} className="text-ws-bull flex-shrink-0 mt-0.5" />,
}

function NotificationPanel({
  notifications,
  onClose,
}: {
  notifications: AppNotification[]
  onClose: () => void
}) {
  return (
    <div className="absolute right-0 top-full mt-2 w-72 bg-ws-panel border border-ws-line rounded-2xl shadow-2xl z-50 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-ws-line">
        <span className="text-xs font-semibold uppercase tracking-widest text-ws-accent-soft">Notifications</span>
        <button onClick={onClose} className="text-ws-mist hover:text-ws-paper transition-colors">
          <X size={14} />
        </button>
      </div>
      <div className="max-h-72 overflow-y-auto divide-y divide-ws-line/50">
        {notifications.length === 0 ? (
          <p className="text-xs text-ws-mist text-center py-6 font-mono">Aucune notification</p>
        ) : (
          notifications.map((n) => (
            <div key={n.id} className="flex items-start gap-2.5 px-4 py-3 hover:bg-ws-deep/40 transition-colors">
              {NOTIF_ICONS[n.type]}
              <div className="min-w-0">
                <p className="text-xs text-ws-paper leading-relaxed">{n.message}</p>
                {n.time && <p className="text-[10px] text-ws-mist mt-0.5 font-mono">{n.time}</p>}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export function Header({ title, subtitle, actions, searchValue, onSearchChange, notifications = [] }: HeaderProps) {
  const [notifOpen, setNotifOpen] = useState(false)
  const notifRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!notifOpen) return
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [notifOpen])

  const hasUnread = notifications.length > 0

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
          <SearchField className="w-52" value={searchValue} onChange={onSearchChange} />
          <div ref={notifRef} className="relative">
            <button
              type="button"
              onClick={() => setNotifOpen((v) => !v)}
              className="min-w-[44px] min-h-[44px] w-10 h-10 flex items-center justify-center rounded-2xl bg-ws-panel/80 border border-ws-line text-ws-ink hover:text-ws-paper hover:border-ws-accent/30 transition-all relative touch-manipulation"
              aria-label="Notifications"
            >
              <Bell size={18} strokeWidth={1.75} />
              {hasUnread && (
                <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-ws-accent rounded-full ring-2 ring-ws-panel" />
              )}
            </button>
            {notifOpen && (
              <NotificationPanel notifications={notifications} onClose={() => setNotifOpen(false)} />
            )}
          </div>
        </div>
      </div>

      <div className="md:hidden flex flex-col gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <MapaLogo variant="header" />
          <div className="min-w-0 pt-0.5">
            <p className="font-display text-[14px] font-semibold tracking-tight text-ws-paper leading-none">
              MAPACRM
            </p>
            <p className="mt-1 font-mono text-[8px] font-medium uppercase tracking-[0.18em] text-ws-mist/85">
              Suite commerciale
            </p>
          </div>
        </div>
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
          <SearchField className="flex-1" value={searchValue} onChange={onSearchChange} />
          <div ref={notifRef} className="relative flex-shrink-0">
            <button
              type="button"
              onClick={() => setNotifOpen((v) => !v)}
              className="min-w-[44px] min-h-[44px] w-11 h-11 flex items-center justify-center rounded-2xl bg-ws-panel/80 border border-ws-line text-ws-ink hover:text-ws-paper hover:border-ws-accent/30 transition-all relative touch-manipulation"
              aria-label="Notifications"
            >
              <Bell size={18} strokeWidth={1.75} />
              {hasUnread && (
                <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-ws-accent rounded-full ring-2 ring-ws-panel" />
              )}
            </button>
            {notifOpen && (
              <NotificationPanel notifications={notifications} onClose={() => setNotifOpen(false)} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
