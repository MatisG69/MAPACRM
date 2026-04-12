import { useMemo } from 'react';
import {
  Users,
  FolderKanban,
  CheckSquare,
  TrendingUp,
  Clock,
  AlertCircle,
  Phone,
  Mail,
  CalendarCheck,
  MessageSquare,
  type LucideIcon,
} from 'lucide-react';
import { StatCard } from '../components/ui/StatCard';
import { ProgressBar } from '../components/ui/ProgressBar';
import { Badge } from '../components/ui/Badge';
import { DonutChart } from '../components/charts/DonutChart';
import { RevenueDesk } from '../components/revenue/RevenueDesk';
import { Header } from '../components/layout/Header';
import { Client, Project, Task, Interaction, Invoice } from '../lib/types';
import { formatCurrency, formatRelativeDate, formatDate, isOverdue, daysUntil } from '../lib/utils';
import { resolveProjectProgress } from '../lib/projectProgress';
import { Page } from '../lib/types';

const MONTHS_FR = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

const INTERACTION_ICONS: Record<string, LucideIcon> = {
  call: Phone,
  email: Mail,
  meeting: CalendarCheck,
  note: MessageSquare,
  demo: Users,
};

interface DashboardProps {
  clients: Client[];
  projects: Project[];
  tasks: Task[];
  interactions: Interaction[];
  invoices: Invoice[];
  onNavigate: (page: Page, id?: string) => void;
}

export function Dashboard({ clients, projects, tasks, interactions, invoices, onNavigate }: DashboardProps) {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const stats = useMemo(() => {
    const activeClients = clients.filter((c) => c.status === 'active').length;
    const prospects = clients.filter((c) => c.status === 'prospect').length;
    const activeProjects = projects.filter((p) => p.status === 'in_progress').length;
    const pendingTasks = tasks.filter((t) => t.status !== 'completed').length;
    const overdueTasks = tasks.filter((t) => t.status !== 'completed' && isOverdue(t.due_date)).length;
    const paidInvoices = invoices.filter((i) => i.status === 'paid');
    const revenueThisMonth = paidInvoices
      .filter((i) => {
        const d = new Date(i.paid_date || i.created_at);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      })
      .reduce((s, i) => s + i.amount, 0);
    const totalRevenue = paidInvoices.reduce((s, i) => s + i.amount, 0);
    const pendingRevenue = invoices.filter((i) => i.status === 'sent').reduce((s, i) => s + i.amount, 0);
    return {
      activeClients,
      prospects,
      activeProjects,
      pendingTasks,
      overdueTasks,
      revenueThisMonth,
      totalRevenue,
      pendingRevenue,
    };
  }, [clients, projects, tasks, invoices, currentMonth, currentYear]);

  const projectStatusData = useMemo(
    () =>
      [
        { label: 'Planification', value: projects.filter((p) => p.status === 'planning').length, color: '#78716c' },
        { label: 'En cours', value: projects.filter((p) => p.status === 'in_progress').length, color: '#af7037' },
        { label: 'En révision', value: projects.filter((p) => p.status === 'review').length, color: '#c98a4c' },
        { label: 'Terminés', value: projects.filter((p) => p.status === 'completed').length, color: '#d4a574' },
        { label: 'En pause', value: projects.filter((p) => p.status === 'on_hold').length, color: '#8b572a' },
      ].filter((d) => d.value > 0),
    [projects]
  );

  const revenueByMonth = useMemo(() => {
    const last6 = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(currentYear, currentMonth - 5 + i, 1);
      return { month: d.getMonth(), year: d.getFullYear(), label: MONTHS_FR[d.getMonth()] };
    });
    return last6.map(({ month, year, label }) => {
      const paidInMonth = invoices.filter((i) => {
        if (i.status !== 'paid') return false;
        const d = new Date(i.paid_date || i.created_at);
        return d.getMonth() === month && d.getFullYear() === year;
      });
      return {
        label,
        value: paidInMonth.reduce((s, i) => s + i.amount, 0),
        invoiceCount: paidInMonth.length,
      };
    });
  }, [invoices, currentMonth, currentYear]);

  const recentProjects = projects.slice(0, 4);
  const upcomingTasks = tasks
    .filter((t) => t.status !== 'completed' && t.due_date)
    .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime())
    .slice(0, 5);
  const recentInteractions = interactions.slice(0, 5);

  return (
    <div>
      <Header
        title="Tableau de bord"
        subtitle={`${new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} · synthèse commerciale`}
      />
      <div className="relative px-4 py-6 md:p-8 space-y-6 md:space-y-8 min-h-[calc(100vh-1px)] overflow-hidden">
        <div className="pointer-events-none absolute -right-24 top-0 w-[min(420px,55vw)] h-[420px] opacity-[0.35] hidden sm:block">
          <svg viewBox="0 0 400 400" className="w-full h-full" aria-hidden>
            <circle cx="200" cy="200" r="188" fill="none" stroke="#af7037" strokeWidth="0.75" opacity="0.85" />
            <circle cx="200" cy="200" r="150" fill="none" stroke="#8b572a" strokeWidth="0.5" opacity="0.45" />
            <circle cx="200" cy="200" r="112" fill="none" stroke="#c98a4c" strokeWidth="0.5" opacity="0.4" />
            <circle cx="200" cy="200" r="74" fill="none" stroke="#d4a574" strokeWidth="0.4" opacity="0.32" />
            {Array.from({ length: 12 }, (_, i) => i * 30).map((deg) => {
              const rad = (deg * Math.PI) / 180;
              return (
                <line
                  key={deg}
                  x1="200"
                  y1="200"
                  x2={200 + 188 * Math.cos(rad)}
                  y2={200 + 188 * Math.sin(rad)}
                  stroke="#af7037"
                  strokeWidth="0.35"
                  opacity="0.22"
                />
              );
            })}
          </svg>
        </div>

        <div className="relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatCard
            label="Clients actifs"
            value={stats.activeClients}
            icon={<Users size={20} className="text-ws-accent-soft" strokeWidth={2} />}
            iconBg="bg-ws-accent-dim"
            trend={stats.prospects > 0 ? undefined : undefined}
            trendLabel={`${stats.prospects} prospect${stats.prospects > 1 ? 's' : ''}`}
            onClick={() => onNavigate('clients')}
          />
          <StatCard
            label="Projets en cours"
            value={stats.activeProjects}
            icon={<FolderKanban size={20} className="text-ws-accent" strokeWidth={2} />}
            iconBg="bg-ws-accent-dim"
            trendLabel={`${projects.length} total`}
            onClick={() => onNavigate('projects')}
          />
          <StatCard
            label="Tâches en attente"
            value={stats.pendingTasks}
            icon={<CheckSquare size={20} className="text-ws-accent-soft" strokeWidth={2} />}
            iconBg="bg-ws-accent-dim"
            trendLabel={stats.overdueTasks > 0 ? `${stats.overdueTasks} en retard` : 'Tout est à jour'}
          />
          <StatCard
            label="CA ce mois"
            value={formatCurrency(stats.revenueThisMonth)}
            icon={<TrendingUp size={20} className="text-ws-accent-soft" strokeWidth={2} />}
            iconBg="bg-ws-accent-dim"
            trendLabel={`${formatCurrency(stats.pendingRevenue)} en attente`}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <RevenueDesk
              monthlyRows={revenueByMonth}
              invoices={invoices}
              title="Chiffre d'affaires encaissé"
              subtitle="Série mensuelle, variation mois sur mois, répartition et journal des règlements — lecture type desk financier."
            />
          </div>
          <div className="ws-card rounded-2xl p-5 relative z-[1]">
            <h3 className="ws-section-title mb-1">Allocation projets</h3>
            <p className="text-[10px] font-mono text-ws-mist mb-4 uppercase tracking-wider">Par statut</p>
            {projectStatusData.length > 0 ? (
              <DonutChart segments={projectStatusData} />
            ) : (
              <p className="text-sm text-ws-mist text-center py-8 font-mono">Aucun projet</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 ws-card rounded-2xl p-5 relative z-[1]">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="ws-section-title">Carnet d&apos;ordres</h3>
                <p className="text-xs text-ws-mist mt-1 font-mono uppercase tracking-wider">Projets récents</p>
              </div>
              <button type="button" onClick={() => onNavigate('projects')} className="ws-link">
                Voir tout
              </button>
            </div>
            {recentProjects.length === 0 ? (
              <p className="text-sm text-ws-mist text-center py-6 font-mono">Aucun projet</p>
            ) : (
              <div className="space-y-2">
                {recentProjects.map((p) => {
                  const rp = resolveProjectProgress(p, tasks);
                  return (
                    <div
                      key={p.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => onNavigate('project-detail', p.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onNavigate('project-detail', p.id);
                        }
                      }}
                      className="flex items-center gap-4 p-3 rounded-2xl border border-transparent hover:border-ws-accent/20 hover:bg-ws-raised/40 cursor-pointer transition-all group"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <p className="text-sm font-medium text-ws-paper truncate group-hover:text-ws-accent-soft transition-colors">
                            {p.name}
                          </p>
                          <Badge value={p.status} />
                        </div>
                        <p className="text-xs text-ws-mist truncate font-mono">{p.client?.name || 'Sans client'}</p>
                        <ProgressBar value={rp.percent} size="sm" color="bull" className="mt-2" showLabel />
                        {rp.taskDriven && (
                          <p className="text-[9px] font-mono text-ws-mist mt-1">
                            {rp.completed}/{rp.total} tâches
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="ws-card rounded-2xl p-5 relative z-[1]">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="ws-section-title">Échéances</h3>
                  <p className="text-xs text-ws-mist mt-1 font-mono uppercase tracking-wider">Tâches urgentes</p>
                </div>
                <button type="button" onClick={() => onNavigate('tasks')} className="ws-link">
                  Voir tout
                </button>
              </div>
              {upcomingTasks.length === 0 ? (
                <p className="text-sm text-ws-mist text-center py-4 font-mono">Aucune tâche</p>
              ) : (
                <div className="space-y-2">
                  {upcomingTasks.map((t) => {
                    const days = daysUntil(t.due_date);
                    const late = isOverdue(t.due_date);
                    return (
                      <div key={t.id} className="flex items-start gap-3 py-2 border-b border-ws-line/40 last:border-0">
                        <div
                          className={`mt-0.5 flex-shrink-0 ${late ? 'text-ws-bear' : days !== null && days <= 2 ? 'text-ws-accent-soft' : 'text-ws-mist'}`}
                        >
                          {late ? <AlertCircle size={14} /> : <Clock size={14} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-ws-paper truncate">{t.title}</p>
                          <p className="text-[10px] text-ws-mist mt-0.5 font-mono">
                            {late
                              ? `En retard de ${Math.abs(days!)} j`
                              : days !== null
                                ? `Dans ${days} j`
                                : formatDate(t.due_date)}
                          </p>
                        </div>
                        <Badge value={t.priority} className="flex-shrink-0" />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="ws-card rounded-2xl p-5 relative z-[1]">
              <div className="mb-4">
                <h3 className="ws-section-title">Flux commercial</h3>
                <p className="text-xs text-ws-mist mt-1 font-mono uppercase tracking-wider">Interactions récentes</p>
              </div>
              {recentInteractions.length === 0 ? (
                <p className="text-sm text-ws-mist text-center py-4 font-mono">Aucune interaction</p>
              ) : (
                <div className="space-y-3">
                  {recentInteractions.map((i) => {
                    const Icon = INTERACTION_ICONS[i.type] || MessageSquare;
                    return (
                      <div key={i.id} className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-md bg-ws-deep border border-ws-line flex items-center justify-center flex-shrink-0">
                          <Icon size={14} className="text-ws-accent" strokeWidth={2} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-ws-paper truncate">{i.client?.name || 'Client'}</p>
                          <p className="text-[10px] text-ws-ink line-clamp-2 mt-0.5">{i.description}</p>
                          <p className="text-[10px] text-ws-mist mt-0.5 font-mono">{formatRelativeDate(i.date)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
