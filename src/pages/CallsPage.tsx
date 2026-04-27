import { useEffect, useMemo, useRef, useState } from 'react';
import {
  PhoneCall,
  Plus,
  Search,
  Trash2,
  Mail,
  Phone,
  Globe,
  Loader2,
  Check,
  X as XIcon,
  ChevronDown,
  TrendingUp,
  Calendar as CalendarIcon,
  Clock,
  Sparkles,
  CheckCircle2,
  Circle,
  CornerDownLeft,
} from 'lucide-react';
import { Header } from '../components/layout/Header';
import { Button } from '../components/ui/Button';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { useCalls } from '../hooks/useCalls';
import type { Call, Client } from '../lib/types';

interface CallsPageProps {
  clients: Client[];
}

type Filter = 'all' | 'todo' | 'called' | 'interested';

/* ─────────────────────────────────────────────
   Utils
   ───────────────────────────────────────────── */

const isToday = (iso?: string | null) => {
  if (!iso) return false;
  const d = new Date(iso);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
};

const formatDateShort = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });

const formatTimeShort = (iso: string) =>
  new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

/* ─────────────────────────────────────────────
   Toast (léger, interne)
   ───────────────────────────────────────────── */

interface ToastState {
  id: number;
  message: string;
  tone: 'success' | 'info';
}

function useToast() {
  const [toasts, setToasts] = useState<ToastState[]>([]);
  const counter = useRef(0);

  const push = (message: string, tone: ToastState['tone'] = 'success') => {
    const id = ++counter.current;
    setToasts((prev) => [...prev, { id, message, tone }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 1800);
  };

  return { toasts, push };
}

function ToastViewport({ toasts }: { toasts: ToastState[] }) {
  return (
    <div
      className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none"
      role="status"
      aria-live="polite"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-mono uppercase tracking-[0.15em] backdrop-blur-md border shadow-lg animate-toast-in ${
            t.tone === 'success'
              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200'
              : 'bg-ws-panel/90 border-ws-line text-ws-paper'
          }`}
        >
          {t.tone === 'success' ? <CheckCircle2 size={13} /> : <Sparkles size={13} />}
          {t.message}
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Page
   ───────────────────────────────────────────── */

export function CallsPage({ clients }: CallsPageProps) {
  const { calls, loading, error, createCall, updateCall, deleteCall } = useCalls();
  const { toasts, push: pushToast } = useToast();

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Call | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);

  const sortedClients = useMemo(
    () => [...clients].sort((a, b) => a.name.localeCompare(b.name)),
    [clients],
  );

  /* ─── Filtering ───────────────────────────── */
  const filtered = useMemo(() => {
    let list = calls;
    if (filter === 'todo') list = list.filter((c) => !c.called);
    else if (filter === 'called') list = list.filter((c) => c.called);
    else if (filter === 'interested') list = list.filter((c) => c.interested === true);

    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((c) => {
        const cl = c.client;
        if (!cl) return false;
        return (
          cl.name.toLowerCase().includes(q) ||
          (cl.company ?? '').toLowerCase().includes(q) ||
          (cl.email ?? '').toLowerCase().includes(q) ||
          (cl.phone ?? '').toLowerCase().includes(q) ||
          (c.notes ?? '').toLowerCase().includes(q)
        );
      });
    }
    return list;
  }, [calls, filter, search]);

  /* ─── Stats ───────────────────────────────── */
  const stats = useMemo(() => {
    const total = calls.length;
    const todo = calls.filter((c) => !c.called).length;
    const called = calls.filter((c) => c.called).length;
    const interested = calls.filter((c) => c.interested === true).length;
    const todayCalls = calls.filter((c) => isToday(c.called_at)).length;
    const conversionRate = called > 0 ? Math.round((interested / called) * 100) : 0;
    return { total, todo, called, interested, todayCalls, conversionRate };
  }, [calls]);

  /* ─── Actions ─────────────────────────────── */
  const handleAddCall = async (clientId: string) => {
    setCreating(true);
    try {
      const created = await createCall(clientId);
      setHighlightId(created.id);
      setTimeout(() => setHighlightId(null), 1500);
      pushToast('Appel ajouté');
    } finally {
      setCreating(false);
      setPickerOpen(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!confirmDelete) return;
    try {
      await deleteCall(confirmDelete.id);
      pushToast('Appel supprimé');
    } finally {
      setConfirmDelete(null);
    }
  };

  /* ─── Keyboard shortcuts ──────────────────── */
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInputting =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        (target?.getAttribute && target.getAttribute('contenteditable') === 'true');
      if (isInputting) return;
      if (e.key === '/') {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        setPickerOpen(true);
      } else if (e.key === 'Escape') {
        setPickerOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  /* ─── Render ──────────────────────────────── */
  return (
    <div className="space-y-5">
      <Header
        title="Appels"
        subtitle="Journal d'appels — coordonnées auto-remplies depuis la fiche client"
        actions={
          <div className="relative">
            <Button
              size="sm"
              icon={<Plus size={14} />}
              onClick={() => setPickerOpen((v) => !v)}
              loading={creating}
              className="normal-case tracking-normal"
              aria-haspopup="dialog"
              aria-expanded={pickerOpen}
            >
              Nouvel appel
              <kbd className="hidden md:inline-flex ml-2 px-1.5 py-0.5 rounded bg-black/20 border border-white/10 text-[9px] font-mono opacity-70">
                N
              </kbd>
            </Button>
            {pickerOpen && (
              <ClientPicker
                clients={sortedClients}
                onSelect={handleAddCall}
                onClose={() => setPickerOpen(false)}
              />
            )}
          </div>
        }
      />

      {/* ─── Stats strip (desk-style, low chrome) ─── */}
      <StatsBar stats={stats} />

      {/* ─── Filters + search local ─── */}
      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          {(
            [
              ['all', 'Tous', stats.total],
              ['todo', 'À appeler', stats.todo],
              ['called', 'Appelés', stats.called],
              ['interested', 'Intéressés', stats.interested],
            ] as const
          ).map(([k, label, n]) => {
            const active = filter === k;
            return (
              <button
                key={k}
                type="button"
                onClick={() => setFilter(k)}
                className={`group relative inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-mono uppercase tracking-[0.14em] transition-all duration-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ws-accent/50 focus-visible:ring-offset-1 focus-visible:ring-offset-ws-void ${
                  active
                    ? 'bg-ws-accent/15 border-ws-accent/45 text-ws-paper shadow-[0_0_0_1px_rgba(184,151,58,0.12)]'
                    : 'bg-ws-deep/40 border-ws-line text-ws-mist hover:text-ws-paper hover:border-ws-accent/25'
                }`}
                aria-pressed={active}
              >
                {label}
                <span
                  className={`text-[10px] tabular-nums ${active ? 'text-ws-accent' : 'opacity-60'}`}
                >
                  {n}
                </span>
              </button>
            );
          })}
        </div>

        <div className="md:ml-auto relative min-w-[240px] md:min-w-[280px]">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-ws-mist pointer-events-none"
          />
          <input
            ref={searchInputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un client, note…"
            className="w-full pl-9 pr-12 py-2 rounded-lg bg-ws-deep/60 border border-ws-line text-sm text-ws-paper placeholder:text-ws-mist/60 focus:outline-none focus:border-ws-accent/50 focus:bg-ws-deep transition-colors"
            aria-label="Rechercher dans les appels"
          />
          <kbd className="hidden md:inline-flex absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded bg-black/30 border border-white/10 text-[9px] font-mono text-ws-mist pointer-events-none">
            /
          </kbd>
        </div>
      </div>

      {/* ─── Error ─── */}
      {error && (
        <div
          className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300 font-mono"
          role="alert"
        >
          {error}
        </div>
      )}

      {/* ─── Table or empty / loading ─── */}
      {loading && calls.length === 0 ? (
        <SkeletonTable />
      ) : filtered.length === 0 ? (
        <CallsEmptyState
          isFiltered={!!search || filter !== 'all'}
          onCreate={() => setPickerOpen(true)}
        />
      ) : (
        <>
          {/* Desktop : table */}
          <div className="hidden md:block ws-card rounded-2xl border border-ws-line overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10">
                  <tr className="border-b border-ws-line bg-ws-deep/80 backdrop-blur">
                    <Th>Client</Th>
                    <Th>Téléphone</Th>
                    <Th>Email</Th>
                    <Th>Site</Th>
                    <Th className="text-center w-[88px]">Appelé</Th>
                    <Th className="min-w-[260px]">Notes</Th>
                    <Th className="text-center w-[110px]">Intéressé</Th>
                    <Th className="text-right pr-4 w-[110px]">Date</Th>
                    <Th className="w-[44px]" aria-label="Actions" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-ws-line/60">
                  {filtered.map((call, idx) => (
                    <CallRow
                      key={call.id}
                      call={call}
                      clients={sortedClients}
                      indexInList={idx}
                      highlight={highlightId === call.id}
                      onUpdate={updateCall}
                      onDelete={() => setConfirmDelete(call)}
                      onSaved={() => pushToast('Notes sauvegardées')}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile : cartes */}
          <div className="md:hidden flex flex-col gap-2.5">
            {filtered.map((call, idx) => (
              <CallCard
                key={call.id}
                call={call}
                clients={sortedClients}
                indexInList={idx}
                highlight={highlightId === call.id}
                onUpdate={updateCall}
                onDelete={() => setConfirmDelete(call)}
                onSaved={() => pushToast('Notes sauvegardées')}
              />
            ))}
          </div>
        </>
      )}

      <ConfirmDialog
        isOpen={!!confirmDelete}
        title="Supprimer cet appel ?"
        description={
          confirmDelete?.client
            ? `La ligne pour ${confirmDelete.client.name} sera supprimée définitivement.`
            : 'Cette ligne sera supprimée définitivement.'
        }
        onConfirm={handleConfirmDelete}
        onClose={() => setConfirmDelete(null)}
      />

      <ToastViewport toasts={toasts} />

      {/* Animations CSS injectées localement (pas de fichier global polluer) */}
      <style>{`
        @keyframes calls-row-in {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: none; }
        }
        @keyframes calls-row-highlight {
          0%   { background: rgba(184, 151, 58, 0.15); }
          100% { background: transparent; }
        }
        @keyframes toast-in {
          from { opacity: 0; transform: translateY(8px) scale(0.97); }
          to   { opacity: 1; transform: none; }
        }
        .animate-row-in { animation: calls-row-in 220ms cubic-bezier(0.22, 1, 0.36, 1) both; }
        .animate-row-highlight { animation: calls-row-highlight 1500ms ease-out both; }
        .animate-toast-in { animation: toast-in 220ms cubic-bezier(0.22, 1, 0.36, 1) both; }
        @media (prefers-reduced-motion: reduce) {
          .animate-row-in, .animate-row-highlight, .animate-toast-in { animation: none !important; }
        }
      `}</style>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Sub-components
   ───────────────────────────────────────────── */

function Th({ children, className = '', ...rest }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      scope="col"
      className={`px-3 py-2.5 text-left font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-ws-mist ${className}`}
      {...rest}
    >
      {children}
    </th>
  );
}

interface Stats {
  total: number;
  todo: number;
  called: number;
  interested: number;
  todayCalls: number;
  conversionRate: number;
}

function StatsBar({ stats }: { stats: Stats }) {
  const items: { label: string; value: string; hint?: string; icon: React.ReactNode; tone?: string }[] = [
    {
      label: 'À appeler',
      value: String(stats.todo),
      icon: <Circle size={13} className="text-ws-accent" />,
      tone: stats.todo > 0 ? 'text-ws-paper' : 'text-ws-mist',
    },
    {
      label: 'Aujourd\'hui',
      value: String(stats.todayCalls),
      hint: 'appels passés',
      icon: <CalendarIcon size={13} className="text-emerald-400" />,
    },
    {
      label: 'Total appelés',
      value: String(stats.called),
      icon: <PhoneCall size={13} className="text-ws-accent" />,
    },
    {
      label: 'Conversion',
      value: stats.called > 0 ? `${stats.conversionRate} %` : '—',
      hint: stats.called > 0 ? `${stats.interested}/${stats.called} intéressés` : 'Pas encore d\'appels',
      icon: <TrendingUp size={13} className="text-emerald-400" />,
    },
  ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
      {items.map((it) => (
        <div
          key={it.label}
          className="ws-card rounded-xl border border-ws-line bg-ws-panel/70 px-3.5 py-2.5"
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-ws-mist">
              {it.label}
            </span>
            {it.icon}
          </div>
          <div className="flex items-baseline gap-2">
            <span
              className={`font-display text-2xl font-bold tabular-nums ${it.tone ?? 'text-ws-paper'}`}
            >
              {it.value}
            </span>
            {it.hint && (
              <span className="text-[10px] font-mono text-ws-mist truncate">{it.hint}</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function SkeletonTable() {
  return (
    <div className="ws-card rounded-2xl border border-ws-line overflow-hidden">
      <div className="px-4 py-3 border-b border-ws-line/60 bg-ws-deep/40 flex gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-3 w-20 rounded bg-white/[0.04] animate-pulse" />
        ))}
      </div>
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="px-4 py-4 flex items-center gap-4 border-b border-ws-line/40 last:border-b-0"
        >
          <div className="h-7 w-7 rounded-md bg-white/[0.04] animate-pulse" />
          <div className="h-3 flex-1 rounded bg-white/[0.04] animate-pulse" />
          <div className="h-3 w-24 rounded bg-white/[0.04] animate-pulse" />
          <div className="h-3 w-16 rounded bg-white/[0.04] animate-pulse" />
        </div>
      ))}
    </div>
  );
}

function CallsEmptyState({
  isFiltered,
  onCreate,
}: {
  isFiltered: boolean;
  onCreate: () => void;
}) {
  return (
    <div className="ws-card rounded-2xl border border-ws-line bg-ws-panel/40 px-6 py-16 flex flex-col items-center text-center">
      <div className="relative mb-6">
        <div
          className="absolute inset-0 rounded-2xl bg-ws-accent/10 blur-2xl"
          aria-hidden="true"
        />
        <div className="relative w-16 h-16 rounded-2xl bg-ws-deep border border-ws-accent/30 flex items-center justify-center text-ws-accent">
          <PhoneCall size={26} strokeWidth={1.6} />
        </div>
      </div>
      <h3 className="font-display text-lg font-bold text-ws-paper mb-2">
        {isFiltered ? 'Aucun appel correspondant' : 'Démarrons votre prospection'}
      </h3>
      <p className="text-sm text-ws-mist max-w-md leading-relaxed mb-6">
        {isFiltered
          ? 'Aucun appel ne correspond à votre filtre ou recherche. Essayez d\'élargir.'
          : 'Cliquez sur « Nouvel appel » pour ajouter une ligne. Sélectionnez un client — ses coordonnées se remplissent automatiquement.'}
      </p>
      {!isFiltered && (
        <Button
          size="md"
          icon={<Plus size={15} />}
          onClick={onCreate}
          className="normal-case tracking-normal"
        >
          Nouvel appel
        </Button>
      )}
      {!isFiltered && (
        <div className="mt-8 flex items-center gap-4 text-[10px] font-mono uppercase tracking-[0.18em] text-ws-mist/60">
          <span className="flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 rounded bg-white/[0.05] border border-white/10 text-ws-mist normal-case tracking-normal">
              N
            </kbd>
            Nouvel appel
          </span>
          <span className="flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 rounded bg-white/[0.05] border border-white/10 text-ws-mist normal-case tracking-normal">
              /
            </kbd>
            Rechercher
          </span>
        </div>
      )}
    </div>
  );
}

/* ─── Client picker (popover desktop / sheet mobile) ─── */

function ClientPicker({
  clients,
  onSelect,
  onClose,
}: {
  clients: Client[];
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState('');
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return clients;
    return clients.filter(
      (c) => c.name.toLowerCase().includes(s) || (c.company ?? '').toLowerCase().includes(s),
    );
  }, [clients, q]);

  useEffect(() => {
    setActiveIdx(0);
  }, [q]);

  // Scroll active into view
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const el = list.querySelector<HTMLElement>(`[data-idx="${activeIdx}"]`);
    if (el) el.scrollIntoView({ block: 'nearest' });
  }, [activeIdx]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => Math.min(filtered.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => Math.max(0, i - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const c = filtered[activeIdx];
      if (c) onSelect(c.id);
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] md:bg-transparent md:backdrop-blur-0"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className="fixed inset-x-3 top-20 md:absolute md:inset-x-auto md:top-full md:right-0 md:mt-2 z-50 w-auto md:w-80 rounded-xl border border-ws-line bg-ws-panel shadow-2xl overflow-hidden animate-row-in"
        role="dialog"
        aria-label="Sélectionner un client"
      >
        <div className="p-2 border-b border-ws-line">
          <div className="relative">
            <Search
              size={14}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ws-mist"
            />
            <input
              ref={inputRef}
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Rechercher un client…"
              className="w-full pl-8 pr-12 py-2 rounded-lg bg-ws-deep border border-ws-line text-sm text-ws-paper placeholder:text-ws-mist/60 focus:outline-none focus:border-ws-accent"
              aria-label="Rechercher un client"
              aria-autocomplete="list"
              aria-controls="client-picker-list"
              aria-activedescendant={filtered[activeIdx] ? `picker-item-${filtered[activeIdx].id}` : undefined}
            />
            <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-black/30 border border-white/10 text-[9px] font-mono text-ws-mist pointer-events-none">
              <CornerDownLeft size={9} />
            </kbd>
          </div>
        </div>
        <div
          ref={listRef}
          id="client-picker-list"
          role="listbox"
          className="max-h-72 overflow-y-auto scrollbar-ws"
        >
          {filtered.length === 0 ? (
            <p className="text-center py-8 text-xs text-ws-mist font-mono">
              Aucun client trouvé
            </p>
          ) : (
            filtered.map((c, idx) => {
              const isActive = idx === activeIdx;
              return (
                <button
                  key={c.id}
                  id={`picker-item-${c.id}`}
                  data-idx={idx}
                  type="button"
                  role="option"
                  aria-selected={isActive}
                  onMouseEnter={() => setActiveIdx(idx)}
                  onClick={() => onSelect(c.id)}
                  className={`w-full text-left px-3 py-2.5 transition-colors flex items-center gap-3 border-b border-ws-line/40 last:border-b-0 ${
                    isActive ? 'bg-ws-accent/10' : 'hover:bg-white/[0.04]'
                  }`}
                >
                  <div
                    className="w-8 h-8 rounded-md flex items-center justify-center text-[11px] font-bold font-mono flex-shrink-0"
                    style={{
                      background: c.avatar_color ?? 'rgba(184,151,58,0.15)',
                      color: '#09090b',
                    }}
                  >
                    {c.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-ws-paper truncate">{c.name}</p>
                    {c.company && (
                      <p className="text-[10px] text-ws-mist font-mono truncate">{c.company}</p>
                    )}
                  </div>
                  {isActive && (
                    <CornerDownLeft size={11} className="text-ws-accent flex-shrink-0" />
                  )}
                </button>
              );
            })
          )}
        </div>
        <div className="px-3 py-2 border-t border-ws-line/60 bg-ws-deep/40 text-[9px] font-mono uppercase tracking-[0.16em] text-ws-mist/70 flex items-center justify-between">
          <span>{filtered.length} client{filtered.length > 1 ? 's' : ''}</span>
          <span className="hidden md:inline-flex items-center gap-1.5">
            <kbd className="px-1 py-0.5 rounded bg-black/30 border border-white/10">↑↓</kbd>
            <kbd className="px-1 py-0.5 rounded bg-black/30 border border-white/10">Esc</kbd>
          </span>
        </div>
      </div>
    </>
  );
}

/* ─── Row (desktop) ─── */

interface RowSharedProps {
  call: Call;
  clients: Client[];
  indexInList: number;
  highlight: boolean;
  onUpdate: (
    id: string,
    patch: Partial<Pick<Call, 'called' | 'interested' | 'notes' | 'client_id'>>,
  ) => Promise<Call>;
  onDelete: () => void;
  onSaved: () => void;
}

function CallRow({
  call,
  clients,
  indexInList,
  highlight,
  onUpdate,
  onDelete,
  onSaved,
}: RowSharedProps) {
  const cl = call.client;
  const phone = cl?.phone ?? '';
  const email = cl?.email ?? '';
  const website = cl?.website ?? '';

  const [pending, setPending] = useState<'called' | 'yes' | 'no' | null>(null);
  const [clientPickerOpen, setClientPickerOpen] = useState(false);

  const toggleCalled = async () => {
    setPending('called');
    try {
      await onUpdate(call.id, { called: !call.called });
    } finally {
      setPending(null);
    }
  };

  const setInterested = async (value: boolean | null) => {
    setPending(value === true ? 'yes' : value === false ? 'no' : null);
    try {
      await onUpdate(call.id, { interested: value });
    } finally {
      setPending(null);
    }
  };

  const changeClient = async (clientId: string) => {
    setClientPickerOpen(false);
    if (clientId === call.client_id) return;
    await onUpdate(call.id, { client_id: clientId });
  };

  const rowTone = call.called
    ? call.interested === true
      ? 'border-l-2 border-l-emerald-500/50'
      : call.interested === false
        ? 'border-l-2 border-l-red-500/40'
        : 'border-l-2 border-l-ws-accent/40'
    : 'border-l-2 border-l-transparent';

  const animDelay = `${Math.min(indexInList, 12) * 24}ms`;

  return (
    <tr
      className={`group align-middle transition-colors hover:bg-white/[0.025] animate-row-in ${rowTone} ${
        highlight ? 'animate-row-highlight' : ''
      }`}
      style={{ animationDelay: animDelay }}
    >
      {/* Client (clickable to swap) */}
      <td className="px-3 py-3 relative">
        <button
          type="button"
          onClick={() => setClientPickerOpen((v) => !v)}
          className="flex items-center gap-2.5 min-w-0 -mx-2 px-2 py-1 rounded-md hover:bg-white/[0.05] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ws-accent/50"
          aria-label="Changer de client"
        >
          {cl ? (
            <>
              <div
                className="w-8 h-8 rounded-md flex items-center justify-center text-[11px] font-bold font-mono flex-shrink-0 ring-1 ring-black/30"
                style={{
                  background: cl.avatar_color ?? 'rgba(184,151,58,0.15)',
                  color: '#09090b',
                }}
              >
                {cl.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0 text-left">
                <p className="text-sm text-ws-paper font-medium truncate max-w-[180px]">
                  {cl.name}
                </p>
                {cl.company && (
                  <p className="text-[10px] text-ws-mist font-mono truncate max-w-[180px]">
                    {cl.company}
                  </p>
                )}
              </div>
            </>
          ) : (
            <span className="text-xs text-ws-mist italic">Client introuvable</span>
          )}
          <ChevronDown
            size={11}
            className="text-ws-mist transition-opacity opacity-0 group-hover:opacity-60 ml-0.5"
            aria-hidden="true"
          />
        </button>
        {clientPickerOpen && (
          <ClientPicker
            clients={clients}
            onSelect={changeClient}
            onClose={() => setClientPickerOpen(false)}
          />
        )}
      </td>

      {/* Phone (auto-fill) */}
      <td className="px-3 py-3">
        {phone ? (
          <a
            href={`tel:${phone}`}
            className="inline-flex items-center gap-1.5 text-sm text-ws-paper hover:text-ws-accent transition-colors font-mono tabular-nums"
          >
            <Phone size={11} className="text-ws-mist flex-shrink-0" />
            {phone}
          </a>
        ) : (
          <EmptyCell />
        )}
      </td>

      {/* Email (auto-fill) */}
      <td className="px-3 py-3">
        {email ? (
          <a
            href={`mailto:${email}`}
            className="inline-flex items-center gap-1.5 text-xs text-ws-ink hover:text-ws-accent transition-colors max-w-[200px]"
          >
            <Mail size={11} className="text-ws-mist flex-shrink-0" />
            <span className="truncate">{email}</span>
          </a>
        ) : (
          <EmptyCell />
        )}
      </td>

      {/* Website (auto-fill) */}
      <td className="px-3 py-3">
        {website ? (
          <a
            href={website.startsWith('http') ? website : `https://${website}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-ws-ink hover:text-ws-accent transition-colors max-w-[160px]"
          >
            <Globe size={11} className="text-ws-mist flex-shrink-0" />
            <span className="truncate">{website.replace(/^https?:\/\//, '')}</span>
          </a>
        ) : (
          <EmptyCell />
        )}
      </td>

      {/* Called toggle (gros tap target) */}
      <td className="px-3 py-3 text-center">
        <button
          type="button"
          onClick={toggleCalled}
          disabled={pending !== null}
          className={`inline-flex items-center justify-center w-9 h-9 rounded-lg border transition-all duration-200 active:scale-[0.92] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 ${
            call.called
              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/25'
              : 'bg-ws-deep/40 border-ws-line text-ws-mist hover:border-ws-accent/30 hover:text-ws-paper'
          } disabled:opacity-50`}
          aria-label={call.called ? 'Marquer comme non appelé' : 'Marquer comme appelé'}
          aria-pressed={call.called}
        >
          {pending === 'called' ? (
            <Loader2 size={14} className="animate-spin" />
          ) : call.called ? (
            <Check size={15} strokeWidth={2.5} />
          ) : (
            <Circle size={13} strokeWidth={1.5} />
          )}
        </button>
      </td>

      {/* Notes */}
      <td className="px-3 py-3 max-w-[340px]">
        <NotesCell call={call} onUpdate={onUpdate} onSaved={onSaved} />
      </td>

      {/* Interested tri-state */}
      <td className="px-3 py-3 text-center">
        <div className="inline-flex items-center gap-0.5 p-0.5 rounded-lg bg-ws-deep/50 border border-ws-line">
          <button
            type="button"
            onClick={() => setInterested(call.interested === true ? null : true)}
            disabled={pending !== null}
            className={`inline-flex items-center justify-center w-8 h-8 rounded-md transition-all duration-200 active:scale-[0.92] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 ${
              call.interested === true
                ? 'bg-emerald-500/22 text-emerald-300 shadow-[inset_0_0_0_1px_rgba(16,185,129,0.3)]'
                : 'text-ws-mist hover:text-ws-paper hover:bg-white/[0.04]'
            } disabled:opacity-50`}
            aria-label="Intéressé"
            aria-pressed={call.interested === true}
            title="Intéressé"
          >
            {pending === 'yes' ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <Check size={13} strokeWidth={2.5} />
            )}
          </button>
          <button
            type="button"
            onClick={() => setInterested(call.interested === false ? null : false)}
            disabled={pending !== null}
            className={`inline-flex items-center justify-center w-8 h-8 rounded-md transition-all duration-200 active:scale-[0.92] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/50 ${
              call.interested === false
                ? 'bg-red-500/22 text-red-300 shadow-[inset_0_0_0_1px_rgba(239,68,68,0.3)]'
                : 'text-ws-mist hover:text-ws-paper hover:bg-white/[0.04]'
            } disabled:opacity-50`}
            aria-label="Pas intéressé"
            aria-pressed={call.interested === false}
            title="Pas intéressé"
          >
            {pending === 'no' ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <XIcon size={13} strokeWidth={2.5} />
            )}
          </button>
        </div>
      </td>

      {/* Date */}
      <td className="px-3 py-3 text-right pr-4">
        <DateCell call={call} />
      </td>

      {/* Delete */}
      <td className="px-3 py-3 text-right">
        <button
          type="button"
          onClick={onDelete}
          className="p-2 rounded-md text-ws-mist hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/50"
          aria-label={`Supprimer l'appel ${cl?.name ?? ''}`}
        >
          <Trash2 size={14} />
        </button>
      </td>
    </tr>
  );
}

/* ─── Card (mobile) ─── */

function CallCard({
  call,
  clients,
  indexInList,
  highlight,
  onUpdate,
  onDelete,
  onSaved,
}: RowSharedProps) {
  const cl = call.client;
  const phone = cl?.phone ?? '';
  const email = cl?.email ?? '';
  const website = cl?.website ?? '';

  const [pending, setPending] = useState<'called' | 'yes' | 'no' | null>(null);
  const [clientPickerOpen, setClientPickerOpen] = useState(false);

  const toggleCalled = async () => {
    setPending('called');
    try {
      await onUpdate(call.id, { called: !call.called });
    } finally {
      setPending(null);
    }
  };

  const setInterested = async (value: boolean | null) => {
    setPending(value === true ? 'yes' : value === false ? 'no' : null);
    try {
      await onUpdate(call.id, { interested: value });
    } finally {
      setPending(null);
    }
  };

  const changeClient = async (clientId: string) => {
    setClientPickerOpen(false);
    if (clientId === call.client_id) return;
    await onUpdate(call.id, { client_id: clientId });
  };

  const animDelay = `${Math.min(indexInList, 12) * 24}ms`;
  const accentBorder = call.called
    ? call.interested === true
      ? 'border-emerald-500/35'
      : call.interested === false
        ? 'border-red-500/30'
        : 'border-ws-accent/35'
    : 'border-ws-line';

  return (
    <article
      className={`relative ws-card rounded-2xl border ${accentBorder} bg-ws-panel/70 p-4 animate-row-in ${
        highlight ? 'animate-row-highlight' : ''
      }`}
      style={{ animationDelay: animDelay }}
    >
      <div className="flex items-start gap-3 mb-3">
        <button
          type="button"
          onClick={() => setClientPickerOpen((v) => !v)}
          className="flex items-center gap-3 min-w-0 flex-1 -m-1 p-1 rounded-lg hover:bg-white/[0.04] transition-colors"
          aria-label="Changer de client"
        >
          {cl ? (
            <>
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center text-[12px] font-bold font-mono flex-shrink-0 ring-1 ring-black/30"
                style={{
                  background: cl.avatar_color ?? 'rgba(184,151,58,0.15)',
                  color: '#09090b',
                }}
              >
                {cl.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0 text-left">
                <p className="text-base text-ws-paper font-medium truncate">{cl.name}</p>
                {cl.company && (
                  <p className="text-xs text-ws-mist font-mono truncate">{cl.company}</p>
                )}
              </div>
            </>
          ) : (
            <span className="text-sm text-ws-mist italic">Client introuvable</span>
          )}
          <ChevronDown size={14} className="text-ws-mist flex-shrink-0" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="p-2 rounded-md text-ws-mist hover:text-red-400 hover:bg-red-500/10 transition-colors flex-shrink-0"
          aria-label={`Supprimer l'appel ${cl?.name ?? ''}`}
        >
          <Trash2 size={15} />
        </button>
        {clientPickerOpen && (
          <ClientPicker
            clients={clients}
            onSelect={changeClient}
            onClose={() => setClientPickerOpen(false)}
          />
        )}
      </div>

      {/* Coordonnées auto-fill */}
      <div className="grid grid-cols-1 gap-1.5 mb-3 pb-3 border-b border-ws-line/60">
        {phone && (
          <a
            href={`tel:${phone}`}
            className="inline-flex items-center gap-2 text-sm text-ws-paper hover:text-ws-accent transition-colors font-mono tabular-nums"
          >
            <Phone size={12} className="text-ws-mist flex-shrink-0" />
            {phone}
          </a>
        )}
        {email && (
          <a
            href={`mailto:${email}`}
            className="inline-flex items-center gap-2 text-xs text-ws-ink hover:text-ws-accent transition-colors"
          >
            <Mail size={11} className="text-ws-mist flex-shrink-0" />
            <span className="truncate">{email}</span>
          </a>
        )}
        {website && (
          <a
            href={website.startsWith('http') ? website : `https://${website}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-xs text-ws-ink hover:text-ws-accent transition-colors"
          >
            <Globe size={11} className="text-ws-mist flex-shrink-0" />
            <span className="truncate">{website.replace(/^https?:\/\//, '')}</span>
          </a>
        )}
        {!phone && !email && !website && (
          <p className="text-[11px] text-ws-mist/60 italic font-mono">
            Aucune coordonnée pour ce client
          </p>
        )}
      </div>

      {/* Actions toggles : tap targets >= 44 */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <button
          type="button"
          onClick={toggleCalled}
          disabled={pending !== null}
          className={`flex items-center justify-center gap-2 h-11 rounded-xl border text-sm font-medium transition-all duration-200 active:scale-[0.97] ${
            call.called
              ? 'bg-emerald-500/15 border-emerald-500/45 text-emerald-300'
              : 'bg-ws-deep/40 border-ws-line text-ws-mist'
          } disabled:opacity-50`}
          aria-pressed={call.called}
        >
          {pending === 'called' ? (
            <Loader2 size={14} className="animate-spin" />
          ) : call.called ? (
            <Check size={15} strokeWidth={2.4} />
          ) : (
            <Circle size={14} strokeWidth={1.5} />
          )}
          {call.called ? 'Appelé' : 'À appeler'}
        </button>

        <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-ws-deep/40 border border-ws-line">
          <button
            type="button"
            onClick={() => setInterested(call.interested === true ? null : true)}
            disabled={pending !== null}
            className={`flex items-center justify-center gap-1 h-9 rounded-lg text-xs font-medium transition-all duration-200 active:scale-[0.95] ${
              call.interested === true
                ? 'bg-emerald-500/22 text-emerald-300'
                : 'text-ws-mist'
            } disabled:opacity-50`}
            aria-pressed={call.interested === true}
            aria-label="Intéressé"
          >
            {pending === 'yes' ? <Loader2 size={12} className="animate-spin" /> : <Check size={13} />}
          </button>
          <button
            type="button"
            onClick={() => setInterested(call.interested === false ? null : false)}
            disabled={pending !== null}
            className={`flex items-center justify-center gap-1 h-9 rounded-lg text-xs font-medium transition-all duration-200 active:scale-[0.95] ${
              call.interested === false
                ? 'bg-red-500/22 text-red-300'
                : 'text-ws-mist'
            } disabled:opacity-50`}
            aria-pressed={call.interested === false}
            aria-label="Pas intéressé"
          >
            {pending === 'no' ? <Loader2 size={12} className="animate-spin" /> : <XIcon size={13} />}
          </button>
        </div>
      </div>

      {/* Notes */}
      <NotesCell call={call} onUpdate={onUpdate} onSaved={onSaved} />

      {/* Date footer */}
      <div className="mt-3 pt-3 border-t border-ws-line/60 flex items-center justify-end">
        <DateCell call={call} />
      </div>
    </article>
  );
}

/* ─── Notes cell (édition inline avec autosave + indicator) ─── */

function NotesCell({
  call,
  onUpdate,
  onSaved,
}: {
  call: Call;
  onUpdate: (id: string, patch: Partial<Pick<Call, 'notes'>>) => Promise<Call>;
  onSaved: () => void;
}) {
  const [draft, setDraft] = useState(call.notes ?? '');
  const [editing, setEditing] = useState(false);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const lastSaved = useRef(call.notes ?? '');

  // Sync from props when external update lands and we're not editing
  useEffect(() => {
    if (!editing) {
      setDraft(call.notes ?? '');
      lastSaved.current = call.notes ?? '';
    }
  }, [call.notes, editing]);

  const save = async () => {
    const next = draft.trim();
    if (next === lastSaved.current) {
      setEditing(false);
      return;
    }
    setStatus('saving');
    try {
      await onUpdate(call.id, { notes: next || null });
      lastSaved.current = next;
      setStatus('saved');
      onSaved();
      setTimeout(() => setStatus('idle'), 1200);
    } finally {
      setEditing(false);
    }
  };

  if (editing) {
    return (
      <div className="relative">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setDraft(lastSaved.current);
              setEditing(false);
            }
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              void save();
            }
          }}
          placeholder="Notes…"
          autoFocus
          rows={3}
          className="w-full px-3 py-2 rounded-md bg-ws-deep border border-ws-accent/45 text-xs text-ws-paper placeholder:text-ws-mist/60 focus:outline-none focus:border-ws-accent resize-none leading-relaxed"
        />
        <div className="flex items-center justify-between mt-1.5 text-[10px] font-mono text-ws-mist/70">
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 rounded bg-black/30 border border-white/10">⌘ ↵</kbd>
            sauver
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 rounded bg-black/30 border border-white/10">Esc</kbd>
            annuler
          </span>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="w-full text-left px-2 py-1.5 rounded-md hover:bg-white/[0.04] transition-colors min-h-[32px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ws-accent/40 group"
      aria-label="Modifier les notes"
    >
      {call.notes ? (
        <div className="flex items-start justify-between gap-2">
          <p className="text-xs text-ws-ink leading-relaxed line-clamp-3 whitespace-pre-wrap flex-1">
            {call.notes}
          </p>
          {status === 'saved' && (
            <span
              className="flex-shrink-0 inline-flex items-center gap-1 text-[9px] font-mono uppercase tracking-[0.15em] text-emerald-400"
              role="status"
            >
              <CheckCircle2 size={10} />
            </span>
          )}
          {status === 'saving' && (
            <Loader2
              size={10}
              className="flex-shrink-0 animate-spin text-ws-mist mt-0.5"
              aria-label="Sauvegarde en cours"
            />
          )}
        </div>
      ) : (
        <span className="inline-flex items-center gap-1.5 text-xs text-ws-mist/50 font-mono italic group-hover:text-ws-mist transition-colors">
          <Plus size={11} />
          Ajouter une note
        </span>
      )}
    </button>
  );
}

/* ─── Date cell ─── */

function DateCell({ call }: { call: Call }) {
  if (call.called_at) {
    const d = new Date(call.called_at);
    const today = isToday(call.called_at);
    return (
      <div
        className="inline-flex items-center gap-1 text-[10px] font-mono text-ws-paper tabular-nums whitespace-nowrap"
        title={d.toLocaleString('fr-FR')}
      >
        <Clock size={9} className="text-emerald-400/80" />
        <span>{today ? `Aujourd'hui ${formatTimeShort(call.called_at)}` : formatDateShort(call.called_at)}</span>
      </div>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] font-mono text-ws-mist/70 tabular-nums whitespace-nowrap italic"
      title={`Créé le ${new Date(call.created_at).toLocaleString('fr-FR')}`}
    >
      <span>créé&nbsp;{formatDateShort(call.created_at)}</span>
    </span>
  );
}

/* ─── Empty cell helper ─── */

function EmptyCell() {
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] font-mono text-ws-mist/40 italic"
      aria-label="Donnée non renseignée"
    >
      <span aria-hidden="true">—</span>
    </span>
  );
}
