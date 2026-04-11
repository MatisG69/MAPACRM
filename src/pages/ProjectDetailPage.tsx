import { useState } from 'react';
import { ArrowLeft, Pencil, Plus } from 'lucide-react';
import { Header } from '../components/layout/Header';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { ProjectForm } from '../components/projects/ProjectForm';
import { TaskForm } from '../components/tasks/TaskForm';
import { ProgressBar } from '../components/ui/ProgressBar';
import { Client, Project, Task } from '../lib/types';
import { formatCurrency, formatDate } from '../lib/utils';
import { Page } from '../lib/types';

interface ProjectDetailPageProps {
  project: Project | undefined;
  clients: Client[];
  tasks: Task[];
  onBack: () => void;
  onNavigate: (page: Page, id?: string) => void;
  onUpdateProject: (id: string, data: Partial<Project>) => Promise<Project>;
  onDeleteProject: (id: string) => Promise<void>;
  onCreateTask: (data: Omit<Task, 'id' | 'created_at' | 'updated_at' | 'project'>) => Promise<Task>;
}

export function ProjectDetailPage({
  project,
  clients,
  tasks,
  onBack,
  onNavigate,
  onUpdateProject,
  onDeleteProject,
  onCreateTask,
}: ProjectDetailPageProps) {
  const [showEdit, setShowEdit] = useState(false);
  const [showTask, setShowTask] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

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
          Book projets
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
        <div className="ws-card rounded-lg p-6">
          <div className="flex flex-wrap gap-2 mb-4">
            <Badge value={project.status} />
            {project.type && <Badge value={project.type} />}
          </div>
          <ProgressBar value={project.progress} color="bull" className="mb-5" />
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

      <Modal isOpen={showEdit} onClose={() => setShowEdit(false)} title="Modifier le projet" size="lg">
        <ProjectForm
          initial={project}
          clients={clients}
          onSubmit={async (data) => {
            await onUpdateProject(project.id, data);
            setShowEdit(false);
          }}
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
