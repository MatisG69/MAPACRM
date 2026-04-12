import { useMemo } from 'react';
import { BellRing, ChevronRight } from 'lucide-react';
import { Header } from '../components/layout/Header';
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

export function RelancesPage({
  clients,
  interactions,
  projects,
  tasks,
  invoices,
  quotes,
  onNavigate,
}: RelancesPageProps) {
  const suggestions = useMemo(
    () => buildRelanceSuggestions(clients, interactions, projects, tasks, invoices, quotes),
    [clients, interactions, projects, tasks, invoices, quotes]
  );

  return (
    <div>
      <Header
        title="Centre de relance"
        subtitle="Suggestions actives · devis sans réponse · factures · prospects · projets à réactiver"
      />
      <div className="px-4 py-4 md:p-8 space-y-4 bg-ws-deep/20 min-h-[calc(100vh-120px)]">
        {suggestions.length === 0 ? (
          <p className="text-sm text-ws-mist font-mono text-center py-16 ws-card rounded-xl">
            Rien à signaler pour l’instant — continuez comme ça.
          </p>
        ) : (
          <ul className="space-y-2">
            {suggestions.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => s.navigate && onNavigate(s.navigate.page, s.navigate.id)}
                  className="w-full text-left ws-card rounded-xl p-4 border-ws-line/80 flex items-start gap-3 hover:border-ws-accent/30 transition-colors group touch-manipulation"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ws-accent-dim border border-ws-accent/25 text-ws-accent-soft">
                    <BellRing size={18} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-ws-paper">{s.title}</p>
                    <p className="text-xs text-ws-mist mt-1 leading-relaxed">{s.description}</p>
                  </div>
                  <ChevronRight
                    size={18}
                    className="text-ws-mist shrink-0 mt-2 group-hover:text-ws-accent transition-colors"
                  />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
