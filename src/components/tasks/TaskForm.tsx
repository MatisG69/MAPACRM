import { useState } from 'react';
import { Task, TaskStatus, TaskPriority } from '../../lib/types';
import { Project } from '../../lib/types';
import { Button } from '../ui/Button';

type FormData = Omit<Task, 'id' | 'created_at' | 'updated_at' | 'project'>;

interface TaskFormProps {
  initial?: Partial<Task>;
  projects: Project[];
  defaultProjectId?: string;
  onSubmit: (data: FormData) => Promise<void>;
  onCancel: () => void;
}

const priorityOptions: { value: TaskPriority; label: string }[] = [
  { value: 'low', label: 'Faible' },
  { value: 'medium', label: 'Moyen' },
  { value: 'high', label: 'Élevé' },
  { value: 'urgent', label: 'Urgent' },
];

const statusOptions: { value: TaskStatus; label: string }[] = [
  { value: 'todo', label: 'À faire' },
  { value: 'in_progress', label: 'En cours' },
  { value: 'completed', label: 'Terminé' },
];

export function TaskForm({ initial, projects, defaultProjectId, onSubmit, onCancel }: TaskFormProps) {
  const [form, setForm] = useState<FormData>({
    project_id: initial?.project_id || defaultProjectId || null,
    title: initial?.title || '',
    description: initial?.description || '',
    status: initial?.status || 'todo',
    priority: initial?.priority || 'medium',
    due_date: initial?.due_date || '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = <K extends keyof FormData>(key: K, value: FormData[K]) => setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { setError('Le titre est requis'); return; }
    setLoading(true);
    setError('');
    try {
      await onSubmit({ ...form, due_date: form.due_date || null });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="form-error">{error}</div>}

      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="form-label">Titre *</label>
          <input className="input" value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="Rédiger le cahier des charges" required />
        </div>
        <div>
          <label className="form-label">Projet</label>
          <select className="input" value={form.project_id || ''} onChange={(e) => set('project_id', e.target.value || null)}>
            <option value="">Aucun projet</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label className="form-label">Priorité</label>
          <select className="input" value={form.priority} onChange={(e) => set('priority', e.target.value as TaskPriority)}>
            {priorityOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <label className="form-label">Statut</label>
          <select className="input" value={form.status} onChange={(e) => set('status', e.target.value as TaskStatus)}>
            {statusOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <label className="form-label">Échéance</label>
          <input className="input" type="date" value={form.due_date || ''} onChange={(e) => set('due_date', e.target.value)} />
        </div>
        <div className="col-span-2">
          <label className="form-label">Description</label>
          <textarea className="input resize-none" rows={3} value={form.description || ''} onChange={(e) => set('description', e.target.value)} placeholder="Description de la tâche..." />
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="button" variant="secondary" className="flex-1 normal-case tracking-normal" onClick={onCancel}>Annuler</Button>
        <Button type="submit" className="flex-1 normal-case tracking-normal" loading={loading}>{initial ? 'Enregistrer' : 'Créer la tâche'}</Button>
      </div>
    </form>
  );
}