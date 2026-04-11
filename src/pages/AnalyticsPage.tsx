import { useMemo } from 'react';
import { Users, FolderKanban, Euro, Target } from 'lucide-react';
import { Header } from '../components/layout/Header';
import { StatCard } from '../components/ui/StatCard';
import { DonutChart } from '../components/charts/DonutChart';
import { RevenueDesk } from '../components/revenue/RevenueDesk';
import { Client, Invoice, Project } from '../lib/types';
import { formatCurrency } from '../lib/utils';

const MONTHS_FR = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

interface AnalyticsPageProps {
  clients: Client[];
  projects: Project[];
  invoices: Invoice[];
}

export function AnalyticsPage({ clients, projects, invoices }: AnalyticsPageProps) {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const bySource = useMemo(() => {
    const map = new Map<string, number>();
    clients.forEach((c) => {
      const s = c.source?.trim() || 'Non renseigné';
      map.set(s, (map.get(s) || 0) + 1);
    });
    const colors = ['#60a5fa', '#34d399', '#d4a853', '#a78bfa', '#f472b6', '#22d3ee', '#8fa3b8'];
    return Array.from(map.entries())
      .map(([label, value], i) => ({ label, value, color: colors[i % colors.length] }))
      .filter((x) => x.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [clients]);

  const revenueByMonth = useMemo(() => {
    const last6 = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(currentYear, currentMonth - 5 + i, 1);
      return { month: d.getMonth(), year: d.getFullYear(), label: MONTHS_FR[d.getMonth()] };
    });
    return last6.map(({ month, year, label }) => {
      const paidInMonth = invoices.filter((inv) => {
        if (inv.status !== 'paid') return false;
        const d = new Date(inv.paid_date || inv.created_at);
        return d.getMonth() === month && d.getFullYear() === year;
      });
      return {
        label,
        value: paidInMonth.reduce((s, i) => s + i.amount, 0),
        invoiceCount: paidInMonth.length,
      };
    });
  }, [invoices, currentMonth, currentYear]);
  const pipelineValue = useMemo(
    () =>
      projects.filter((p) => p.status !== 'completed').reduce((s, p) => s + (p.budget || 0), 0),
    [projects]
  );

  const wonRevenue = invoices.filter((i) => i.status === 'paid').reduce((s, i) => s + i.amount, 0);

  return (
    <div>
      <Header
        title="Research & données"
        subtitle="Indicateurs de pipeline, encaissements et acquisition — même logique qu’un desk d’analystes"
      />
      <div className="px-4 py-4 md:p-8 space-y-6 md:space-y-8 bg-ws-deep/20 min-h-[calc(100vh-120px)]">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatCard
            label="Total clients"
            value={clients.length}
            icon={<Users size={20} className="text-ws-highlight" strokeWidth={2} />}
            iconBg="bg-ws-wire/15"
            trendLabel={`${clients.filter((c) => c.status === 'prospect').length} prospects`}
          />
          <StatCard
            label="Projets actifs"
            value={projects.filter((p) => p.status === 'in_progress' || p.status === 'planning').length}
            icon={<FolderKanban size={20} className="text-ws-bull" strokeWidth={2} />}
            iconBg="bg-ws-bull-dim"
            trendLabel={`${projects.length} projets au total`}
          />
          <StatCard
            label="CA encaissé"
            value={formatCurrency(wonRevenue)}
            icon={<Euro size={20} className="text-ws-gold" strokeWidth={2} />}
            iconBg="bg-ws-gold-dim"
          />
          <StatCard
            label="Pipeline (budgets)"
            value={formatCurrency(pipelineValue)}
            icon={<Target size={20} className="text-ws-highlight" strokeWidth={2} />}
            iconBg="bg-ws-wire/15"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <RevenueDesk
              monthlyRows={revenueByMonth}
              invoices={invoices}
              title="Performance encaissements"
              subtitle="Vue consolidée pour l’analyse — même logique qu’un écran de suivi des flux trésorerie."
            />
          </div>
          <div className="ws-card rounded-lg p-5">
            <h3 className="ws-section-title mb-1">Origine des leads</h3>
            <p className="text-[10px] font-mono text-ws-mist mb-4 uppercase tracking-wider">Répartition</p>
            {bySource.length > 0 ? (
              <DonutChart segments={bySource} />
            ) : (
              <p className="text-sm text-ws-mist text-center py-8 font-mono">Renseignez la source sur les fiches clients</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
