import { useState, useMemo } from 'react';
import { Project, ProjectStatus, ProjectType, Task } from '../../lib/types';
import { Client } from '../../lib/types';
import { normalizeSiteUrl } from '../../lib/sitePreview';
import { Button } from '../ui/Button';

type FormData = Omit<Project, 'id' | 'created_at' | 'updated_at' | 'client'>;

interface ProjectFormProps {
  initial?: Partial<Project>;
  clients: Client[];
  /** Pour masquer le curseur manuel quand des tâches pilotent déjà l’avancement */
  tasks?: Task[];
  onSubmit: (data: FormData) => Promise<void>;
  onCancel: () => void;
}

const statusOptions: { value: ProjectStatus; label: string }[] = [
  { value: 'planning', label: 'Planification' },
  { value: 'in_progress', label: 'En cours' },
  { value: 'review', label: 'En révision' },
  { value: 'completed', label: 'Terminé' },
  { value: 'on_hold', label: 'En pause' },
];

const typeOptions: { value: ProjectType; label: string }[] = [
  { value: 'website', label: 'Site vitrine' },
  { value: 'ecommerce', label: 'E-commerce' },
  { value: 'webapp', label: 'Application web' },
  { value: 'redesign', label: 'Refonte' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'seo', label: 'SEO' },
  { value: 'other', label: 'Autre' },
];

export function ProjectForm({ initial, clients, tasks = [], onSubmit, onCancel }: ProjectFormProps) {
  const linkedTasks = useMemo(
    () => (initial?.id ? tasks.filter((t) => t.project_id === initial.id) : []),
    [initial?.id, tasks]
  );
  const taskDriven = linkedTasks.length > 0;
  const taskProgressPct = taskDriven
    ? Math.round(
        (linkedTasks.filter((t) => t.status === 'completed').length / linkedTasks.length) * 100
      )
    : null;

  const [form, setForm] = useState<FormData>({
    client_id: initial?.client_id || null,
    name: initial?.name || '',
    site_url: initial?.site_url ?? null,
    description: initial?.description || '',
    status: initial?.status || 'planning',
    budget: initial?.budget || null,
    start_date: initial?.start_date || '',
    end_date: initial?.end_date || '',
    progress: initial?.progress || 0,
    type: initial?.type || null,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = <K extends keyof FormData>(key: K, value: FormData[K]) => setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Le nom est requis'); return; }
    setLoading(true);
    setError('');
    try {
      const base = {
        ...form,
        site_url: normalizeSiteUrl(form.site_url || undefined),
      };
      if (taskDriven) {
        const { progress: _p, ...rest } = base;
        await onSubmit(rest);
      } else {
        await onSubmit(base);
      }
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
          <label className="form-label">Nom du projet *</label>
          <input className="input" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Site web Dupont SARL" required />
        </div>
        <div className="col-span-2">
          <label className="form-label">URL du site</label>
          <input
            className="input font-mono text-xs"
            type="url"
            inputMode="url"
            value={form.site_url || ''}
            onChange={(e) => set('site_url', e.target.value.trim() || null)}
            placeholder="https://exemple.fr"
          />
          <p className="mt-1.5 text-[10px] text-ws-mist font-mono leading-relaxed">
            Aperçu automatique (image Open Graph ou capture). Laissez vide si pas encore en ligne.
          </p>
        </div>
        <div>
          <label className="form-label">Client</label>
          <select className="input" value={form.client_id || ''} onChange={(e) => set('client_id', e.target.value || null)}>
            <option value="">Aucun client</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.name}{c.company ? ` — ${c.company}` : ''}</option>)}
          </select>
        </div>
        <div>
          <label className="form-label">Type</label>
          <select className="input" value={form.type || ''} onChange={(e) => set('type', (e.target.value || null) as ProjectType | null)}>
            <option value="">Sélectionner</option>
            {typeOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <label className="form-label">Statut</label>
          <select className="input" value={form.status} onChange={(e) => set('status', e.target.value as ProjectStatus)}>
            {statusOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <label className="form-label">Budget (€)</label>
          <input className="input" type="number" step="100" value={form.budget || ''} onChange={(e) => set('budget', e.target.value ? Number(e.target.value) : null)} placeholder="3500" />
        </div>
        <div>
          <label className="form-label">Date de début</label>
          <input className="input" type="date" value={form.start_date || ''} onChange={(e) => set('start_date', e.target.value || '')} />
        </div>
        <div>
          <label className="form-label">Date de fin</label>
          <input className="input" type="date" value={form.end_date || ''} onChange={(e) => set('end_date', e.target.value || '')} />
        </div>
        <div className="col-span-2">
          {taskDriven ? (
            <div className="rounded-xl border border-ws-accent/25 bg-ws-accent-dim/30 px-3 py-3">
              <p className="form-label mb-1">Avancement</p>
              <p className="text-sm font-semibold text-ws-cream tabular-nums">{taskProgressPct}%</p>
              <p className="text-[10px] text-ws-mist font-mono mt-1 leading-relaxed">
                Calculé automatiquement : {linkedTasks.filter((t) => t.status === 'completed').length}/
                {linkedTasks.length} tâche{linkedTasks.length > 1 ? 's' : ''} terminée
                {linkedTasks.length > 1 ? 's' : ''}. Cochez les tâches du projet pour faire avancer la barre.
              </p>
            </div>
          ) : (
            <>
              <label className="form-label">Avancement manuel ({form.progress}%)</label>
              <input
                type="range"
                min={0}
                max={100}
                value={form.progress}
                onChange={(e) => set('progress', Number(e.target.value))}
                className="w-full accent-[#af7037]"
              />
              <p className="text-[10px] text-ws-mist font-mono mt-1">
                Sans tâches liées, vous réglez la barre à la main. Ajoutez des tâches au projet pour un suivi
                automatique.
              </p>
            </>
          )}
        </div>
        <div className="col-span-2">
          <label className="form-label">Description</label>
          <textarea className="input resize-none" rows={3} value={form.description || ''} onChange={(e) => set('description', e.target.value)} placeholder="Description du projet..." />
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="button" variant="secondary" className="flex-1 normal-case tracking-normal" onClick={onCancel}>Annuler</Button>
        <Button type="submit" className="flex-1 normal-case tracking-normal" loading={loading}>{initial ? 'Enregistrer' : 'Créer le projet'}</Button>
      </div>
    </form>
  );
}