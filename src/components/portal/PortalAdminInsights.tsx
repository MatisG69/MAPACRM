import {
  Calendar,
  CalendarClock,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  ListChecks,
  Wallet,
  Hourglass,
  Tag,
} from 'lucide-react';
import type {
  CalendarEvent,
  Invoice,
  Project,
  ProjectChecklistItem,
  Quote,
} from '../../lib/types';
import { formatCurrency, formatDate, formatDateTime } from '../../lib/utils';

interface PortalAdminInsightsProps {
  project: Project | null;
  quotes: Quote[];
  invoices: Invoice[];
  events: CalendarEvent[];
  checklist: ProjectChecklistItem[];
}

const PROJECT_TYPE_LABEL: Record<string, string> = {
  website: 'Site vitrine',
  ecommerce: 'E-commerce',
  webapp: 'Application web',
  redesign: 'Refonte',
  maintenance: 'Maintenance',
  seo: 'SEO & référencement',
  other: 'Prestation sur mesure',
};

/**
 * Vue admin : infos projet complètes, finances, agenda, checklist.
 * Affichée dans PortalUserExpandedOverlay au-dessus de la ClientPortalSection
 * (qui gère les étapes et la messagerie).
 */
export function PortalAdminInsights({
  project,
  quotes,
  invoices,
  events,
  checklist,
}: PortalAdminInsightsProps) {
  if (!project) return null;

  const now = Date.now();
  const startMs = project.start_date ? new Date(project.start_date).getTime() : null;
  const endMs = project.end_date ? new Date(project.end_date).getTime() : null;
  const elapsedDays = startMs ? Math.max(0, Math.round((now - startMs) / 864e5)) : null;
  const remainingDays = endMs ? Math.round((endMs - now) / 864e5) : null;

  const primaryQuote =
    quotes.find((q) => q.status === 'signed') ??
    quotes.find((q) => q.status === 'sent') ??
    quotes[0] ??
    null;

  const paid = invoices.filter((i) => i.status === 'paid').reduce((s, i) => s + i.amount, 0);
  const pending = invoices
    .filter((i) => i.status === 'sent' || i.status === 'draft')
    .reduce((s, i) => s + i.amount, 0);
  const overdue = invoices
    .filter((i) => i.status === 'overdue')
    .reduce((s, i) => s + i.amount, 0);

  const checklistDone = checklist.filter((c) => c.done).length;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
      {/* BLOC 1 : Infos projet */}
      <section className="ws-card rounded-2xl border border-ws-line overflow-hidden">
        <div className="px-4 py-3 border-b border-ws-line bg-ws-deep/30 flex items-center gap-2">
          <Tag size={13} className="text-ws-accent" />
          <h4 className="text-sm font-semibold text-ws-paper">Détails projet</h4>
        </div>
        <div className="p-4 space-y-3">
          <Row icon={<Tag size={11} />} label="Type">
            {project.type ? PROJECT_TYPE_LABEL[project.type] ?? project.type : '—'}
          </Row>
          <Row icon={<Calendar size={11} />} label="Démarrage">
            {formatDate(project.start_date)}
            {elapsedDays != null && (
              <span className="text-[10px] font-mono text-ws-mist ml-2">(il y a {elapsedDays} j)</span>
            )}
          </Row>
          <Row icon={<Calendar size={11} />} label="Livraison estimée">
            <span className={remainingDays != null && remainingDays < 0 ? 'text-red-300' : ''}>
              {formatDate(project.end_date)}
            </span>
            {remainingDays != null && (
              <span className="text-[10px] font-mono text-ws-mist ml-2">
                {remainingDays > 0
                  ? `dans ${remainingDays} j`
                  : remainingDays === 0
                  ? "aujourd'hui"
                  : `dépassée de ${Math.abs(remainingDays)} j`}
              </span>
            )}
          </Row>
          <Row icon={<Wallet size={11} />} label="Budget">
            {project.budget != null ? formatCurrency(project.budget) : '—'}
          </Row>
          <Row icon={<Hourglass size={11} />} label="Progression">
            <span className="font-mono text-ws-accent tabular-nums">{project.progress}%</span>
          </Row>
          {project.site_url && (
            <div className="pt-2 border-t border-ws-line">
              <a
                href={project.site_url}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] font-mono text-ws-accent hover:text-ws-accent-soft transition-colors break-all"
              >
                ↗ {project.site_url}
              </a>
            </div>
          )}
        </div>
      </section>

      {/* BLOC 2 : Finances */}
      <section className="ws-card rounded-2xl border border-ws-line overflow-hidden">
        <div className="px-4 py-3 border-b border-ws-line bg-ws-deep/30 flex items-center gap-2">
          <Wallet size={13} className="text-ws-accent" />
          <h4 className="text-sm font-semibold text-ws-paper">Finances</h4>
        </div>
        <div className="p-4 space-y-3">
          {primaryQuote ? (
            <div className="rounded-xl bg-ws-deep/30 border border-ws-line p-3">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="min-w-0">
                  <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-ws-mist flex items-center gap-1.5">
                    <FileText size={10} />
                    Devis de référence
                  </div>
                  <div className="text-sm text-ws-paper font-medium truncate mt-0.5">
                    {primaryQuote.quote_number ?? 'Sans n°'}
                  </div>
                </div>
                <QuoteStatusPill status={primaryQuote.status} />
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                <div>
                  <div className="text-ws-mist">Total</div>
                  <div className="text-ws-paper font-semibold tabular-nums">
                    {formatCurrency(primaryQuote.amount)}
                  </div>
                </div>
                <div>
                  <div className="text-ws-mist">Acompte</div>
                  <div className="text-ws-accent font-semibold tabular-nums">
                    {primaryQuote.deposit_amount != null
                      ? formatCurrency(primaryQuote.deposit_amount)
                      : '—'}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-xs text-ws-mist font-mono py-1">Aucun devis pour ce projet.</div>
          )}

          <div className="grid grid-cols-3 gap-2">
            <FinanceCell
              icon={<CheckCircle2 size={11} />}
              label="Réglé"
              value={formatCurrency(paid)}
              color="emerald"
            />
            <FinanceCell
              icon={<Clock size={11} />}
              label="Attente"
              value={formatCurrency(pending)}
              color="gold"
            />
            <FinanceCell
              icon={<AlertCircle size={11} />}
              label="Retard"
              value={formatCurrency(overdue)}
              color="red"
            />
          </div>

          {invoices.length > 0 && (
            <div className="text-[10px] font-mono text-ws-mist pt-1">
              {invoices.length} facture{invoices.length > 1 ? 's' : ''} au total
            </div>
          )}
        </div>
      </section>

      {/* BLOC 3 : Agenda + Checklist */}
      <section className="ws-card rounded-2xl border border-ws-line overflow-hidden">
        <div className="px-4 py-3 border-b border-ws-line bg-ws-deep/30 flex items-center gap-2">
          <CalendarClock size={13} className="text-ws-accent" />
          <h4 className="text-sm font-semibold text-ws-paper">Agenda & checklist</h4>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-ws-mist mb-1.5">
              Prochains événements
            </div>
            {events.length === 0 ? (
              <div className="text-xs text-ws-mist font-mono">Aucun événement programmé.</div>
            ) : (
              <ul className="space-y-1.5">
                {events.slice(0, 3).map((ev) => (
                  <li
                    key={ev.id}
                    className="flex items-center justify-between gap-2 rounded-lg bg-ws-deep/30 border border-ws-line px-3 py-1.5"
                  >
                    <span className="text-[12px] text-ws-paper truncate">{ev.title}</span>
                    <span className="text-[10px] font-mono text-ws-mist flex-shrink-0">
                      {formatDateTime(ev.start_at)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="pt-2 border-t border-ws-line">
            <div className="flex items-center justify-between mb-1.5">
              <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-ws-mist flex items-center gap-1.5">
                <ListChecks size={10} />
                Checklist
              </div>
              <span className="text-[11px] font-mono text-ws-accent tabular-nums">
                {checklistDone}/{checklist.length}
              </span>
            </div>
            {checklist.length === 0 ? (
              <div className="text-xs text-ws-mist font-mono">Aucun point défini.</div>
            ) : (
              <div className="h-1 rounded-full bg-ws-deep/60 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-ws-accent-muted to-ws-accent transition-all duration-500"
                  style={{
                    width: `${
                      checklist.length > 0 ? Math.round((checklistDone / checklist.length) * 100) : 0
                    }%`,
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function Row({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-ws-mist flex items-center gap-1.5 flex-shrink-0">
        {icon}
        {label}
      </span>
      <span className="text-ws-paper text-right min-w-0 truncate">{children}</span>
    </div>
  );
}

function FinanceCell({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: 'emerald' | 'gold' | 'red';
}) {
  const styles = {
    emerald: 'text-emerald-300 border-emerald-500/25 bg-emerald-500/5',
    gold: 'text-ws-accent border-ws-accent/30 bg-ws-accent/5',
    red: 'text-red-300 border-red-500/25 bg-red-500/5',
  } as const;
  return (
    <div className={`rounded-lg border px-2.5 py-2 ${styles[color]}`}>
      <div className="flex items-center gap-1 text-[8.5px] font-mono uppercase tracking-[0.12em] opacity-85">
        {icon}
        {label}
      </div>
      <div className="text-[11.5px] font-mono font-semibold tabular-nums mt-0.5">{value}</div>
    </div>
  );
}

function QuoteStatusPill({ status }: { status: Quote['status'] }) {
  const map: Record<Quote['status'], { label: string; cls: string }> = {
    draft: { label: 'Brouillon', cls: 'bg-ws-deep/40 text-ws-mist border-ws-line' },
    sent: { label: 'Envoyé', cls: 'bg-ws-accent/15 text-ws-accent border-ws-accent/35' },
    signed: { label: 'Signé', cls: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' },
    refused: { label: 'Refusé', cls: 'bg-red-500/10 text-red-300 border-red-500/30' },
    expired: { label: 'Expiré', cls: 'bg-ws-deep/40 text-ws-mist border-ws-line' },
  };
  const s = map[status];
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-mono uppercase tracking-[0.15em] border ${s.cls} flex-shrink-0`}
    >
      {s.label}
    </span>
  );
}
