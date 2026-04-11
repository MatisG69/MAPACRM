import { useState } from 'react';
import { Plus, Search, FolderKanban, Trash2, Pencil } from 'lucide-react';
import { Header } from '../components/layout/Header';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { EmptyState } from '../components/ui/EmptyState';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { ProjectForm } from '../components/projects/ProjectForm';
import { ProgressBar } from '../components/ui/ProgressBar';
import { Client, Project, ProjectStatus } from '../lib/types';
import { formatCurrency, formatDate } from '../lib/utils';

const statusFilters: { value: ProjectStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Tous' },
  { value: 'planning', label: 'Planif.' },
  { value: 'in_progress', label: 'En cours' },
  { value: 'review', label: 'Révision' },
  { value: 'completed', label: 'Terminés' },
  { value: 'on_hold', label: 'Pause' },
];

interface ProjectsPageProps {
  projects: Project[];
  clients: Client[];
  onCreate: (data: Omit<Project, 'id' | 'created_at' | 'updated_at' | 'client'>) => Promise<Project>;
  onUpdate: (id: string, data: Partial<Project>) => Promise<Project>;
  onDelete: (id: string) => Promise<void>;
  onSelect: (id: string) => void;
}

export function ProjectsPage({
  projects,
  clients,
  onCreate,
  onUpdate,
  onDelete,
  onSelect,
}: ProjectsPageProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'all'>('all');
  const [showCreate, setShowCreate] = useState(false);
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const filtered = projects.filter((p) => {
    const okStatus = statusFilter === 'all' || p.status === statusFilter;
    const q = search.toLowerCase();
    const okSearch =
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.client?.name?.toLowerCase().includes(q) ||
      p.description?.toLowerCase().includes(q);
    return okStatus && okSearch;
  });

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleteLoading(true);
    await onDelete(deleteId);
    setDeleteLoading(false);
    setDeleteId(null);
  };

  return (
    <div>
      <Header
        title="Book projets"
        subtitle={`${projects.length} position${projects.length > 1 ? 's' : ''} · livrables & prestations`}
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
              placeholder="Filtrer par projet, client…"
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
            title={search || statusFilter !== 'all' ? 'Aucun résultat' : 'Aucun projet'}
            description={
              search || statusFilter !== 'all'
                ? 'Modifiez les filtres'
                : 'Ouvrez une ligne pour chaque mandat (site, refonte, maintenance…)'
            }
            action={
              !search && statusFilter === 'all'
                ? { label: 'Nouveau projet', onClick: () => setShowCreate(true) }
                : undefined
            }
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filtered.map((p) => (
              <div key={p.id} className="ws-card-hover rounded-lg group">
                <div className="p-5 cursor-pointer" onClick={() => onSelect(p.id)} role="presentation">
                  <div className="flex items-start justify-between mb-3">
                    <div>
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
                  <ProgressBar value={p.progress} color="bull" className="mb-3" />
                  <div className="flex flex-wrap gap-3 text-xs font-mono text-ws-accent-soft/90">
                    {p.budget != null && <span>{formatCurrency(p.budget)}</span>}
                    {p.end_date && <span className="text-ws-mist">Échéance {formatDate(p.end_date)}</span>}
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
            ))}
          </div>
        )}
      </div>

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Nouveau projet" size="lg">
        <ProjectForm
          clients={clients}
          onSubmit={async (data) => {
            await onCreate(data);
            setShowCreate(false);
          }}
          onCancel={() => setShowCreate(false)}
        />
      </Modal>

      <Modal isOpen={!!editProject} onClose={() => setEditProject(null)} title="Modifier le projet" size="lg">
        {editProject && (
          <ProjectForm
            initial={editProject}
            clients={clients}
            onSubmit={async (data) => {
              await onUpdate(editProject.id, data);
              setEditProject(null);
            }}
            onCancel={() => setEditProject(null)}
          />
        )}
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Supprimer le projet"
        description="Les tâches liées seront conservées sans projet. Les factures seront dissociées de ce projet."
        loading={deleteLoading}
      />
    </div>
  );
}
