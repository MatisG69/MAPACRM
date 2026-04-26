import { useEffect, useMemo, useState } from 'react';
import { BellRing, ChevronRight, EyeOff, RotateCcw, Loader2 } from 'lucide-react';
import { Header } from '../components/layout/Header';
import { Button } from '../components/ui/Button';
import { useBulkSelection } from '../hooks/useBulkSelection';
import { BulkActionBar } from '../components/ui/BulkActionBar';
import type { Client, Interaction, Invoice, Project, Quote, Task, Page } from '../lib/types';
import { buildRelanceSuggestions } from '../lib/relances';

interface RelancesPageProps {
  clients: Client[];
  interactions: Interaction[];
  projects: Project[];
  tasks: Task[];
  invoices: Invoice[];
  quotes: Quote[];
  onNavigate: (page: Page, id?: string) => void;
}

const DISMISSED_STORAGE_KEY = 'mapa.relances.dismissed';

/** Charge la liste des suggestions ignorées (persiste en localStorage). */
function loadDismissed(): Set<string> {
  try {
    const raw = localStorage.getItem(DISMISSED_STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

function persistDismissed(set: Set<string>) {
  try {
    localStorage.setItem(DISMISSED_STORAGE_KEY, JSON.stringify(Array.from(set)));
  } catch {
    /* localStorage indisponible */
  }
}

export function RelancesPage({
  clients,
  interactions,
  projects,
  tasks,
  invoices,
  quotes,
  onNavigate,
}: RelancesPageProps) {
  const allSuggestions = useMemo(
    () => buildRelanceSuggestions(clients, interactions, projects, tasks, invoices, quotes),
    [clients, interactions, projects, tasks, invoices, quotes]
  );

  const [dismissed, setDismissed] = useState<Set<string>>(() => loadDismissed());
  const [showDismissed, setShowDismissed] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);

  useEffect(() => {
    persistDismissed(dismissed);
  }, [dismissed]);

  // Suggestions actives (par défaut) ou archive des ignorées (via toggle)
  const visibleSuggestions = useMemo(
    () =>
      showDismissed
        ? allSuggestions.filter((s) => dismissed.has(s.id))
        : allSuggestions.filter((s) => !dismissed.has(s.id)),
    [allSuggestions, dismissed, showDismissed]
  );

  const visibleIds = useMemo(() => visibleSuggestions.map((s) => s.id), [visibleSuggestions]);
  const selection = useBulkSelection(visibleIds);

  const dismissedCount = useMemo(
    () => allSuggestions.filter((s) => dismissed.has(s.id)).length,
    [allSuggestions, dismissed]
  );

  const bulkDismiss = () => {
    setBulkBusy(true);
    try {
      setDismissed((prev) => {
        const next = new Set(prev);
        for (const id of selection.selectedIds) next.add(id);
        return next;
      });
      selection.clear();
    } finally {
      setBulkBusy(false);
    }
  };

  const bulkRestore = () => {
    setBulkBusy(true);
    try {
      setDismissed((prev) => {
        const next = new Set(prev);
        for (const id of selection.selectedIds) next.delete(id);
        return next;
      });
      selection.clear();
    } finally {
      setBulkBusy(false);
    }
  };

  return (
    <div>
      <Header
        title="Centre de relance"
        subtitle={
          showDismissed
            ? `Archive · ${dismissedCount} relance${dismissedCount > 1 ? 's' : ''} ignorée${dismissedCount > 1 ? 's' : ''}`
            : 'Suggestions actives · devis sans réponse · factures · prospects · projets à réactiver'
        }
        actions={
          dismissedCount > 0 ? (
            <Button
              variant="secondary"
              icon={<RotateCcw size={14} />}
              onClick={() => setShowDismissed((s) => !s)}
              className="normal-case tracking-normal"
            >
              {showDismissed
                ? 'Voir les actives'
                : `Voir les ignorées (${dismissedCount})`}
            </Button>
          ) : undefined
        }
      />
      <div className="px-4 py-4 md:p-8 space-y-4 bg-ws-deep/20 min-h-[calc(100vh-120px)]">
        {visibleSuggestions.length === 0 ? (
          <p className="text-sm text-ws-mist font-mono text-center py-16 ws-card rounded-xl">
            {showDismissed
              ? 'Aucune relance archivée.'
              : 'Rien à signaler pour l’instant — continuez comme ça.'}
          </p>
        ) : (
          <>
            <label className="flex items-center gap-2 px-2 text-xs text-ws-mist font-mono cursor-pointer select-none">
              <input
                type="checkbox"
                checked={selection.allSelected}
                ref={(el) => {
                  if (el) el.indeterminate = selection.someSelected;
                }}
                onChange={() => selection.toggleAll()}
                className="w-4 h-4 accent-ws-accent"
              />
              Tout sélectionner ({visibleSuggestions.length})
            </label>
            <ul className="space-y-2">
              {visibleSuggestions.map((s) => (
                <li key={s.id}>
                  <div
                    className={`ws-card rounded-xl p-4 border flex items-start gap-3 transition-colors ${
                      selection.has(s.id)
                        ? 'border-ws-accent/50 bg-ws-accent/5'
                        : 'border-ws-line/80 hover:border-ws-accent/30'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selection.has(s.id)}
                      onChange={() => selection.toggle(s.id)}
                      className="mt-1.5 w-4 h-4 accent-ws-accent flex-shrink-0"
                      aria-label={`Sélectionner relance : ${s.title}`}
                    />
                    <button
                      type="button"
                      onClick={() => s.navigate && onNavigate(s.navigate.page, s.navigate.id)}
                      className="flex items-start gap-3 flex-1 text-left group touch-manipulation"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ws-accent-dim border border-ws-accent/25 text-ws-accent-soft">
                        <BellRing size={18} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-ws-paper">{s.title}</p>
                        <p className="text-xs text-ws-mist mt-1 leading-relaxed">
                          {s.description}
                        </p>
                      </div>
                      <ChevronRight
                        size={18}
                        className="text-ws-mist shrink-0 mt-2 group-hover:text-ws-accent transition-colors"
                      />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      <BulkActionBar
        count={selection.count}
        itemLabel="relance"
        onClear={() => selection.clear()}
      >
        {showDismissed ? (
          <Button
            variant="secondary"
            icon={
              bulkBusy ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />
            }
            onClick={() => bulkRestore()}
            disabled={bulkBusy}
            className="normal-case tracking-normal text-xs py-1.5"
          >
            Restaurer
          </Button>
        ) : (
          <Button
            variant="secondary"
            icon={
              bulkBusy ? <Loader2 size={14} className="animate-spin" /> : <EyeOff size={14} />
            }
            onClick={() => bulkDismiss()}
            disabled={bulkBusy}
            className="normal-case tracking-normal text-xs py-1.5"
          >
            Ignorer
          </Button>
        )}
      </BulkActionBar>
    </div>
  );
}
