import { useMemo, useState } from 'react';
import { Plus, Search, FolderKanban, Trash2, Pencil, ListChecks } from 'lucide-react';
import { Header } from '../components/layout/Header';
import type { AppNotification } from '../components/layout/Header';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { EmptyState } from '../components/ui/EmptyState';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { ProjectForm } from '../components/projects/ProjectForm';
import { ProjectCardPreview } from '../components/projects/ProjectCardPreview';
import { ProgressBar } from '../components/ui/ProgressBar';
import { Client, Project, ProjectStatus, Task } from '../lib/types';
import { formatCurrency, formatDate, isOverdue } from '../lib/utils';
import { resolveProjectProgress } from '../lib/projectProgress';

const statusFilters: { value: ProjectStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Tous' },
  { value: 'planning', label: 'Planif.' },
  { value: 'quote_sent', label: 'Devis envoye' },
  { value: 'in_progress', label: 'En cours' },
  { value: 'review', label: 'Revision' },
  { value: 'completed', label: 'Termines' },
  { value: 'on_hold', label: 'Pause' },
];

const STATUS_STRIP: Record<ProjectStatus, string> = {
  planning: 'border-l-stone-500/45',
  quote_sent: 'border-l-amber-500/55',
  in_progress: 'border-l-ws-accent-soft',
  review: 'border-l-ws-highlight',
  completed: 'border-l-emerald-500/55',
  on_hold: 'border-l-ws-mist/35',
};

const SECTION_ORDER: { status: ProjectStatus; label: string }[] = [
  { status: 'in_progress', label: 'En cours' },
  { status: 'review', label: 'En revision' },
  { status: 'quote_sent', label: 'Devis envoye' },
  { status: 'planning', label: 'Planification' },
  { status: 'on_hold', label: 'En pause' },
  { status: 'completed', label: 'Termines' },
];

interface ProjectsPageProps {
  projects: Project[];
  clients: Client[];
  tasks: Task[];
  onCreate: (data: Omit<Project, 'id' | 'created_at' | 'updated_at' | 'client'>) => Promise<Project>;
  onUpdate: (id: string, data: Partial<Project>) => Promise<Project>;
  onUpdateClient?: (id: string, data: Partial<Client>) => Promise<Client | unknown>;
  onDelete: (id: string) => Promise<void>;
  onSelect: (id: string) => void;
}

function ProjectProgressSection({ project, tasks }: { project: Project; tasks: Task[] }) {
  const r = resolveProjectProgress(project, tasks);
  return (
    <div className="rounded-xl bg-black/20 border border-ws-line/50 px-3 py-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-ws-mist">Avancement</span>
        {r.taskDriven ? (
          <span className="inline-flex items-center gap-1 text-[9px] font-mono text-ws-accent-soft">
            <ListChecks size={11} strokeWidth={2} />
            Taches
          </span>
        ) : (
          <span className="text-[9px] font-mono text-ws-mist">Manuel</span>
        )}
      </div>
      <ProgressBar value={r.percent} size="lg" color="bull" showLabel className="gap-3" />
      <p className="text-[10px] font-mono text-ws-ink leading-snug">
        {r.taskDriven ? (
          <>
            <span className="text-ws-paper font-semibold tabular-nums">
              {r.completed}/{r.total}
            </span>{' '}
            taches terminees — la barre se met a jour quand vous cochez une tache.
          </>
        ) : (
          <>Aucune tache sur ce projet : utilisez le curseur dans Modifier ou ajoutez des taches depuis la fiche.</>
        )}
      </p>
    </div>
  );
}

export function ProjectsPage({
  projects,
  clients,
  tasks,
  onCreate,
  onUpdate,
  onUpdateClient,
  onDelete,
  onSelect,
}: ProjectsPageProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'all'>('all');
  const [showCreate, setShowCreate] = useState(false);

  const [editProject, setEditProject] = useState<Project | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const notifications = useMemo<AppNotification[]>(() => {
    const result: AppNotification[] = [];
    const overdueProjects = projects.filter(
      (p) => p.end_date && p.status !== 'completed' && isOverdue(p.end_date)
    );
    if (overdueProjects.length > 0) {
      result.push({
        id: 'overdue-projects',
        type: 'warning',
        message: overdueProjects.length + ' projet' + (overdueProjects.length > 1 ? 's' : '') + ' en retard sur l\'echeance',
      });
    }
    const inReview = projects.filter((p) => p.status === 'review');
    if (inReview.length > 0) {
      result.push({
        id: 'review-projects',
        type: 'info',
        message: inReview.length + ' projet' + (inReview.length > 1 ? 's' : '') + ' en revision — retour client attendu',
      });
    }
    return result;
  }, [projects]);

  const filtered = projects.filter((p) => {
    const okStatus = statusFilter === 'all' || p.status === statusFilter;
    const q = search.toLowerCase();
    const okSearch =
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.client?.name?.toLowerCase().includes(q) ||
      p.description?.toLowerCase().includes(q) ||
      p.site_url?.toLowerCase().includes(q);
    return okStatus && okSearch;
  });

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleteLoading(true);
    await onDelete(deleteId);
    setDeleteLoading(false);
    setDeleteId(null);
  };

  const renderCard = (p: Project) => (
    <div
      key={p.id}
      className={`ws-card-hover rounded-2xl overflow-hidden group border border-ws-line/35 shadow-[0_20px_50px_-28px_rgba(0,0,0,0.85)] border-l-[3px] ${STATUS_STRIP[p.status]}`}
    >
      <div className="cursor-pointer" onClick={() => onSelect(p.id)} role="presentation">
        <ProjectCardPreview siteUrl={p.site_url} projectName={p.name} />
      </div>
      <div className="p-5 cursor-pointer" onClick={() => onSelect(p.id)} role="presentation">
        <div className="flex items-start justify-between mb-3 gap-2">
          <div className="min-w-0">
            <p className="font-semibold text-ws-paper group-hover:text-ws-accent-soft transition-colors font-display tracking-tight">
              {p.name}
            </p>
            <p className="text-xs text-ws-ink mt-0.5 font-mono">
              {p.client?.name || 'Sans client'}
              {p.type && <span className="text-ws-mist"> · {p.type.replace('_', ' ')}</span>}
            </p>
          </div>
          <Badge value={p.status} />
        </div>
        <ProjectProgressSection project={p} tasks={tasks} />
        <div className="flex flex-wrap gap-3 text-xs font-mono text-ws-accent-soft/90 mt-4 pt-3 border-t border-ws-line/40">
          {p.budget != null && <span>{formatCurrency(p.budget)}</span>}
          {p.start_date && <span className="text-ws-mist">Debut {formatDate(p.start_date)}</span>}
          {p.end_date && <span className="text-ws-mist">Fin {formatDate(p.end_date)}</span>}
        </div>
      </div>
      <div className="px-5 py-3 border-t border-ws-line flex justify-end gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity bg-ws-deep/40">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setEditProject(p);
          }}
          className="p-1.5 rounded-md hover:bg-ws-panel text-ws-mist hover:text-ws-paper"
        >
          <Pencil size={13} />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setDeleteId(p.id);
          }}
          className="p-1.5 rounded-md hover:bg-ws-bear-dim text-ws-mist hover:text-ws-bear"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );

  return (
    <div>
      <Header
        title="Book projets"
        subtitle={projects.length + ' mandat' + (projects.length > 1 ? 's' : '') + ' · progression liee aux taches'}
        searchValue={search}
        onSearchChange={setSearch}
        notifications={notifications}
        actions={
          <Button icon={<Plus size={16} />} onClick={() => setShowCreate(true)}>
            Nouveau projet
          </Button>
        }
      />

      <div className="px-4 py-4 md:p-8 bg-ws-deep/20 min-h-[calc(100vh-120px)]">
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ws-mist" />
            <input
              type="text"
              placeholder="Filtrer par projet, client..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-9 w-full font-mono text-xs"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {statusFilters.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setStatusFilter(f.value)}
                className={`pill-filter ${statusFilter === f.value ? 'pill-filter-active' : 'pill-filter-idle'}`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon={<FolderKanban size={24} />}
            title={search || statusFilter !== 'all' ? 'Aucun resultat' : 'Aucun projet'}
            description={
              search || statusFilter !== 'all'
                ? 'Modifiez les filtres'
                : 'Ouvrez une ligne pour chaque mandat (site, refonte, maintenance...)'
            }
            action={
              !search && statusFilter === 'all'
                ? { label: 'Nouveau projet', onClick: () => setShowCreate(true) }
                : undefined
            }
          />
        ) : statusFilter === 'all' ? (
          <div className="space-y-10">
            {SECTION_ORDER.map(({ status, label }) => {
              const group = filtered.filter((p) => p.status === status);
              if (group.length === 0) return null;
              return (
                <section key={status}>
                  <h3 className="font-display text-sm font-bold text-ws-cream tracking-tight mb-4 flex items-center gap-2">
                    <span className="h-px flex-1 max-w-[2rem] bg-ws-line" aria-hidden />
                    {label}
                    <span className="text-ws-mist font-mono text-xs font-normal">({group.length})</span>
                    <span className="h-px flex-1 bg-ws-line" aria-hidden />
                  </h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">{group.map((p) => renderCard(p))}</div>
                </section>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">{filtered.map((p) => renderCard(p))}</div>
        )}
      </div>

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Nouveau projet" size="lg">
        <ProjectForm
          clients={clients}
          tasks={tasks}
          onSubmit={async (data) => {
            await onCreate(data);
            setShowCreate(false);
          }}
          onUpdateClient={onUpdateClient}
          onCancel={() => setShowCreate(false)}
        />
      </Modal>

      <Modal isOpen={!!editProject} onClose={() => setEditProject(null)} title="Modifier le projet" size="lg">
        {editProject && (
          <ProjectForm
            initial={editProject}
            clients={clients}
            tasks={tasks}
            onSubmit={async (data) => {
              await onUpdate(editProject.id, data);
              setEditProject(null);
            }}
            onUpdateClient={onUpdateClient}
            onCancel={() => setEditProject(null)}
          />
        )}
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Supprimer le projet"
        description="Les taches liees seront conservees sans projet. Les factures seront dissociees de ce projet."
        loading={deleteLoading}
      />
    </div>
  );
}
