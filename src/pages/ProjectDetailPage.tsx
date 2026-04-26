import { useMemo, useState } from 'react';
import { ArrowLeft, Pencil, Plus } from 'lucide-react';
import { Header } from '../components/layout/Header';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { ProjectForm } from '../components/projects/ProjectForm';
import { ProjectCardPreview } from '../components/projects/ProjectCardPreview';
import { ClientPortalSection } from '../components/projects/ClientPortalSection';
import { ClientDocumentsManager } from '../components/projects/ClientDocumentsManager';
import { TaskForm } from '../components/tasks/TaskForm';
import { ProgressBar } from '../components/ui/ProgressBar';
import type {
  CalendarEvent,
  Client,
  Interaction,
  Invoice,
  Project,
  ProjectChecklistItem,
  Quote,
  Task,
} from '../lib/types';
import { Page } from '../lib/types';
import { formatCurrency, formatDate, formatDateTime } from '../lib/utils';
import { resolveProjectProgress } from '../lib/projectProgress';
import { buildProjectTimeline } from '../lib/projectTimeline';

interface ProjectDetailPageProps {
  project: Project | undefined;
  clients: Client[];
  tasks: Task[];
  clientInteractions: Interaction[];
  projectInvoices: Invoice[];
  projectQuotes: Quote[];
  projectCalendarEvents: CalendarEvent[];
  checklistItems: ProjectChecklistItem[];
  onToggleChecklistItem: (id: string, done: boolean) => Promise<void>;
  onBack: () => void;
  onNavigate: (page: Page, id?: string) => void;
  onUpdateProject: (id: string, data: Partial<Project>) => Promise<Project>;
  onUpdateClient?: (id: string, data: Partial<Client>) => Promise<Client | unknown>;
  onDeleteProject: (id: string) => Promise<void>;
  onCreateTask: (data: Omit<Task, 'id' | 'created_at' | 'updated_at' | 'project'>) => Promise<Task>;
}

export function ProjectDetailPage({
  project,
  clients,
  tasks,
  clientInteractions,
  projectInvoices,
  projectQuotes,
  projectCalendarEvents,
  checklistItems,
  onToggleChecklistItem,
  onBack,
  onNavigate,
  onUpdateProject,
  onUpdateClient,
  onDeleteProject,
  onCreateTask,
}: ProjectDetailPageProps) {
  const [showEdit, setShowEdit] = useState(false);
  const [showTask, setShowTask] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const timeline = useMemo(() => {
    if (!project) return [];
    const pt = tasks.filter((t) => t.project_id === project.id);
    return buildProjectTimeline(
      project,
      pt,
      clientInteractions,
      projectInvoices,
      projectQuotes,
      projectCalendarEvents
    );
  }, [project, tasks, clientInteractions, projectInvoices, projectQuotes, projectCalendarEvents]);

  if (!project) {
    return (
      <div className="px-4 py-6 md:p-8 bg-ws-deep/20">
        <p className="text-ws-mist font-mono text-sm">Projet introuvable.</p>
        <Button variant="secondary" className="mt-4 normal-case tracking-normal" onClick={onBack}>
          Retour
        </Button>
      </div>
    );
  }

  const projectTasks = tasks.filter((t) => t.project_id === project.id);
  const progress = resolveProjectProgress(project, tasks);

  const handleDelete = async () => {
    setDeleteLoading(true);
    await onDeleteProject(project.id);
    setDeleteLoading(false);
    setShowDelete(false);
    onBack();
  };

  return (
    <div>
      <div className="px-4 md:px-8 pt-3 md:pt-4 bg-ws-deep/10">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-ws-ink hover:text-ws-gold mb-2 font-mono uppercase tracking-wider transition-colors"
        >
          <ArrowLeft size={16} />
          Retour aux projets
        </button>
      </div>
      <Header
        title={project.name}
        subtitle={project.client?.name || 'Sans contrepartie'}
        actions={
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="secondary"
              icon={<Pencil size={16} />}
              className="normal-case tracking-normal"
              onClick={() => setShowEdit(true)}
            >
              Modifier
            </Button>
            <Button variant="danger" className="normal-case tracking-normal" onClick={() => setShowDelete(true)}>
              Supprimer
            </Button>
          </div>
        }
      />

      <div className="px-4 py-6 md:p-8 space-y-6 md:space-y-8 max-w-4xl bg-ws-deep/20 min-h-[calc(100vh-160px)]">
        {project.site_url && (
          <ProjectCardPreview
            siteUrl={project.site_url}
            projectName={project.name}
            layout="hero"
            className="shadow-[0_24px_60px_-24px_rgba(0,0,0,0.85)]"
          />
        )}
        <div className="ws-card rounded-lg p-6">
          <div className="flex flex-wrap gap-2 mb-4">
            <Badge value={project.status} />
            {project.type && <Badge value={project.type} />}
          </div>
          <div
            className={`rounded-2xl border px-4 py-4 mb-6 ${
              progress.percent >= 100
                ? 'border-emerald-500/35 bg-emerald-500/[0.07]'
                : 'border-ws-accent/25 bg-ws-accent-dim/20'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-ws-mist">Avancement</p>
              <span className="text-2xl font-display font-bold text-ws-cream tabular-nums">{progress.percent}%</span>
            </div>
            <ProgressBar value={progress.percent} size="lg" color="bull" className="mb-2" />
            <p className="text-xs text-ws-ink font-mono leading-relaxed">
              {progress.taskDriven ? (
                <>
                  <span className="text-ws-paper font-semibold">
                    {progress.completed}/{progress.total}
                  </span>{' '}
                  tâches terminées — chaque tâche cochée « terminée » fait monter la barre (et met à jour la liste
                  projets).
                </>
              ) : (
                <>
                  Pas encore de tâches sur ce projet : l’avancement est manuel. Utilisez le bouton ci-dessous pour
                  en ajouter.
                </>
              )}
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            {project.budget != null && (
              <div>
                <p className="text-[10px] font-mono uppercase tracking-wider text-ws-mist mb-1">Budget</p>
                <p className="font-mono font-semibold text-ws-bull tabular-nums">{formatCurrency(project.budget)}</p>
              </div>
            )}
            <div>
              <p className="text-[10px] font-mono uppercase tracking-wider text-ws-mist mb-1">Début</p>
              <p className="font-mono text-ws-paper">{formatDate(project.start_date)}</p>
            </div>
            <div>
              <p className="text-[10px] font-mono uppercase tracking-wider text-ws-mist mb-1">Fin prévue</p>
              <p className="font-mono text-ws-paper">{formatDate(project.end_date)}</p>
            </div>
          </div>
          {project.description && (
            <p className="mt-5 text-sm text-ws-ink whitespace-pre-wrap border-t border-ws-line pt-4 leading-relaxed">
              {project.description}
            </p>
          )}
          {project.client_id && (
            <button
              type="button"
              onClick={() => onNavigate('client-detail', project.client_id!)}
              className="mt-4 ws-link !text-sm"
            >
              Fiche client →
            </button>
          )}
        </div>

        {checklistItems.length > 0 && (
          <div className="ws-card rounded-lg p-6">
            <h2 className="font-display text-lg font-bold text-ws-paper tracking-tight mb-4">
              Checklist livrable
            </h2>
            <ul className="space-y-2">
              {checklistItems.map((item) => (
                <li key={item.id} className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={item.done}
                    onChange={(e) => onToggleChecklistItem(item.id, e.target.checked)}
                    className="mt-1 rounded border-ws-line"
                    aria-label={item.label}
                  />
                  <span
                    className={`text-sm ${item.done ? 'text-ws-mist line-through' : 'text-ws-paper'}`}
                  >
                    {item.label}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="ws-card rounded-lg p-6">
          <h2 className="font-display text-lg font-bold text-ws-paper tracking-tight mb-4">
            Timeline projet
          </h2>
          {timeline.length === 0 ? (
            <p className="text-sm text-ws-mist font-mono">Aucun événement agrégé pour l’instant.</p>
          ) : (
            <ul className="relative border-l border-ws-line/80 pl-4 space-y-4 ml-2">
              {timeline.map((row) => (
                <li key={row.id} className="relative">
                  <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-ws-accent/80 ring-4 ring-ws-deep" />
                  <p className="text-xs font-mono text-ws-mist">{formatDateTime(row.at)}</p>
                  <p className="text-sm text-ws-paper font-medium">{row.label}</p>
                  <p className="text-xs text-ws-mist mt-0.5 leading-relaxed">{row.sub}</p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg font-bold text-ws-paper tracking-tight">Tâches rattachées</h2>
            <Button icon={<Plus size={16} />} className="normal-case tracking-normal" onClick={() => setShowTask(true)}>
              Ajouter une tâche
            </Button>
          </div>
          {projectTasks.length === 0 ? (
            <p className="text-sm text-ws-mist py-8 ws-card rounded-lg text-center font-mono">
              Aucune tâche pour ce projet
            </p>
          ) : (
            <div className="space-y-2">
              {projectTasks.map((t) => (
                <div
                  key={t.id}
                  className="ws-card rounded-lg p-4 flex items-center justify-between gap-4 border-ws-line/80"
                >
                  <div>
                    <p className="font-medium text-ws-paper">{t.title}</p>
                    <p className="text-xs text-ws-mist mt-1 flex flex-wrap items-center gap-2 font-mono">
                      <span>{formatDate(t.due_date)}</span>
                      <Badge value={t.status} />
                    </p>
                  </div>
                  <Badge value={t.priority} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="px-4 md:px-8 pb-8">
        <ClientPortalSection projectId={project.id} />
      </div>

      {project.client_id && (
        <div className="px-4 md:px-8 pb-8">
          <ClientDocumentsManager clientId={project.client_id} projectId={project.id} />
        </div>
      )}

      <Modal isOpen={showEdit} onClose={() => setShowEdit(false)} title="Modifier le projet" size="lg">
        <ProjectForm
          initial={project}
          clients={clients}
          tasks={tasks}
          onSubmit={async (data) => {
            await onUpdateProject(project.id, data);
            setShowEdit(false);
          }}
          onUpdateClient={onUpdateClient}
          onCancel={() => setShowEdit(false)}
        />
      </Modal>

      <Modal isOpen={showTask} onClose={() => setShowTask(false)} title="Nouvelle tâche" size="md">
        <TaskForm
          projects={[project]}
          defaultProjectId={project.id}
          onSubmit={async (data) => {
            await onCreateTask(data);
            setShowTask(false);
          }}
          onCancel={() => setShowTask(false)}
        />
      </Modal>

      <ConfirmDialog
        isOpen={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={handleDelete}
        title="Supprimer ce projet ?"
        description="Cette action est définitive pour ce projet dans le CRM."
        loading={deleteLoading}
      />
    </div>
  );
}
