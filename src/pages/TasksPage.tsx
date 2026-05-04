import { useMemo, useState } from 'react';
import { Plus, Search, CheckSquare, Trash2, Pencil } from 'lucide-react';
import { Header } from '../components/layout/Header';
import type { AppNotification } from '../components/layout/Header';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { EmptyState } from '../components/ui/EmptyState';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { TaskForm } from '../components/tasks/TaskForm';
import { Project, Task, TaskPriority, TaskStatus } from '../lib/types';
import { formatDate, isOverdue } from '../lib/utils';
import { Page } from '../lib/types';

const statusFilters: { value: TaskStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Toutes' },
  { value: 'todo', label: 'À faire' },
  { value: 'in_progress', label: 'En cours' },
  { value: 'completed', label: 'Terminées' },
];

interface TasksPageProps {
  tasks: Task[];
  projects: Project[];
  onCreate: (data: Omit<Task, 'id' | 'created_at' | 'updated_at' | 'project'>) => Promise<Task>;
  onUpdate: (id: string, data: Partial<Task>) => Promise<Task>;
  onDelete: (id: string) => Promise<void>;
  onNavigate: (page: Page, id?: string) => void;
}

export function TasksPage({ tasks, projects, onCreate, onUpdate, onDelete, onNavigate }: TasksPageProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | 'all'>('all');
  const [showCreate, setShowCreate] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);

  const notifications = useMemo<AppNotification[]>(() => {
    const result: AppNotification[] = [];
    const overdueTasks = tasks.filter(
      (t) => t.status !== 'completed' && t.due_date && isOverdue(t.due_date)
    );
    if (overdueTasks.length > 0) {
      result.push({
        id: 'overdue-tasks',
        type: 'warning',
        message: `${overdueTasks.length} tâche${overdueTasks.length > 1 ? 's' : ''} en retard`,
      });
    }
    const urgent = tasks.filter((t) => t.priority === 'urgent' && t.status !== 'completed');
    if (urgent.length > 0) {
      result.push({
        id: 'urgent-tasks',
        type: 'warning',
        message: `${urgent.length} tâche${urgent.length > 1 ? 's' : ''} urgente${urgent.length > 1 ? 's' : ''} non terminée${urgent.length > 1 ? 's' : ''}`,
      });
    }
    return result;
  }, [tasks]);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const filtered = tasks.filter((t) => {
    const okStatus = statusFilter === 'all' || t.status === statusFilter;
    const okPri = priorityFilter === 'all' || t.priority === priorityFilter;
    const q = search.toLowerCase();
    const okSearch =
      !q ||
      t.title.toLowerCase().includes(q) ||
      t.project?.name?.toLowerCase().includes(q) ||
      t.description?.toLowerCase().includes(q);
    return okStatus && okPri && okSearch;
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
        title="Bloc-notes d’exécution"
        subtitle="Ordres du jour commercial — relances, jalons, livrables"
        searchValue={search}
        onSearchChange={setSearch}
        notifications={notifications}
        actions={
          <Button icon={<Plus size={16} />} onClick={() => setShowCreate(true)}>
            Nouvelle tâche
          </Button>
        }
      />

      <div className="px-4 py-4 md:p-8 bg-ws-deep/20 min-h-[calc(100vh-120px)]">
        <div className="flex flex-col gap-3 mb-6">
          <div className="relative flex-1 max-w-xl">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ws-mist" />
            <input
              type="text"
              placeholder="Rechercher dans les tâches…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-9 w-full font-mono text-xs"
            />
          </div>
          <div className="flex flex-wrap gap-2">
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
            <select
              className="input text-base md:text-[10px] min-h-[44px] md:min-h-0 py-2 max-w-[160px] font-mono md:uppercase"
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value as TaskPriority | 'all')}
            >
              <option value="all">Toutes priorités</option>
              <option value="low">Faible</option>
              <option value="medium">Moyen</option>
              <option value="high">Élevé</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon={<CheckSquare size={24} />}
            title="Aucune tâche"
            description="Enregistrez relances et actions comme sur un carnet d’ordres"
            action={{ label: 'Nouvelle tâche', onClick: () => setShowCreate(true) }}
          />
        ) : (
          <>
            <div className="md:hidden space-y-3">
              {filtered.map((t) => (
                <div
                  key={t.id}
                  className="ws-card rounded-2xl p-4 border border-ws-line space-y-3 touch-manipulation"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-ws-paper">{t.title}</p>
                      {t.description && (
                        <p className="text-xs text-ws-mist line-clamp-2 mt-1 font-mono">{t.description}</p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <Badge value={t.priority} />
                      <Badge value={t.status} />
                    </div>
                  </div>
                  {t.project_id && t.project && (
                    <button
                      type="button"
                      onClick={() => onNavigate('project-detail', t.project_id!)}
                      className="ws-link !normal-case !tracking-normal font-mono text-[11px] text-left"
                    >
                      {t.project.name}
                    </button>
                  )}
                  <div className="flex items-center justify-between pt-2 border-t border-ws-line/60">
                    <span
                      className={`font-mono text-xs ${
                        t.due_date && t.status !== 'completed' && isOverdue(t.due_date)
                          ? 'text-ws-bear font-semibold'
                          : 'text-ws-ink'
                      }`}
                    >
                      {formatDate(t.due_date)}
                    </span>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => setEditTask(t)}
                        className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl hover:bg-ws-panel text-ws-mist hover:text-ws-paper"
                        aria-label="Modifier"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteId(t.id)}
                        className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl hover:bg-ws-bear-dim text-ws-mist hover:text-ws-bear"
                        aria-label="Supprimer"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="hidden md:block ws-card rounded-lg overflow-hidden border-ws-line overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="ws-table-header">
                  <th className="px-4 py-3">Tâche</th>
                  <th className="px-4 py-3 hidden md:table-cell">Projet</th>
                  <th className="px-4 py-3">Échéance</th>
                  <th className="px-4 py-3">Priorité</th>
                  <th className="px-4 py-3">Statut</th>
                  <th className="px-4 py-3 w-24 bg-ws-deep/30" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => (
                  <tr key={t.id} className="border-b border-ws-line/50 hover:bg-ws-raised/40 group">
                    <td className="px-4 py-3">
                      <p className="font-medium text-ws-paper">{t.title}</p>
                      {t.description && (
                        <p className="text-xs text-ws-mist line-clamp-1 mt-0.5 font-mono">{t.description}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      {t.project_id && t.project ? (
                        <button
                          type="button"
                          onClick={() => onNavigate('project-detail', t.project_id!)}
                          className="ws-link !normal-case !tracking-normal font-mono text-[11px]"
                        >
                          {t.project.name}
                        </button>
                      ) : (
                        <span className="text-ws-mist font-mono">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">
                      <span
                        className={
                          t.due_date && t.status !== 'completed' && isOverdue(t.due_date)
                            ? 'text-ws-bear font-semibold'
                            : 'text-ws-ink'
                        }
                      >
                        {formatDate(t.due_date)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge value={t.priority} />
                    </td>
                    <td className="px-4 py-3">
                      <Badge value={t.status} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                        <button
                          type="button"
                          onClick={() => setEditTask(t)}
                          className="p-1.5 rounded-md hover:bg-ws-panel text-ws-mist hover:text-ws-paper"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteId(t.id)}
                          className="p-1.5 rounded-md hover:bg-ws-bear-dim text-ws-mist hover:text-ws-bear"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}
      </div>

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Nouvelle tâche" size="md">
        <TaskForm
          projects={projects}
          onSubmit={async (data) => {
            await onCreate(data);
            setShowCreate(false);
          }}
          onCancel={() => setShowCreate(false)}
        />
      </Modal>

      <Modal isOpen={!!editTask} onClose={() => setEditTask(null)} title="Modifier la tâche" size="md">
        {editTask && (
          <TaskForm
            initial={editTask}
            projects={projects}
            onSubmit={async (data) => {
              await onUpdate(editTask.id, data);
              setEditTask(null);
            }}
            onCancel={() => setEditTask(null)}
          />
        )}
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Supprimer la tâche ?"
        description="Cette action est définitive."
        loading={deleteLoading}
      />
    </div>
  );
}
