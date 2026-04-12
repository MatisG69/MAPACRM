import { useState } from 'react';
import type { Client, DealStage, LostReason, Opportunity, Project } from '../../lib/types';
import { Button } from '../ui/Button';
import { PIPELINE_STAGES } from '../../lib/pipelineStages';

type FormData = Omit<Opportunity, 'id' | 'created_at' | 'updated_at' | 'client' | 'project'>;

const LOST_REASONS: { value: LostReason; label: string }[] = [
  { value: 'too_expensive', label: 'Trop cher' },
  { value: 'not_priority', label: 'Pas prioritaire' },
  { value: 'competitor', label: 'Concurrent' },
  { value: 'no_budget', label: 'Pas de budget' },
  { value: 'ghosted', label: 'Sans réponse' },
  { value: 'other', label: 'Autre' },
];

interface OpportunityFormProps {
  initial?: Partial<Opportunity>;
  clients: Client[];
  projects: Project[];
  onSubmit: (data: FormData) => Promise<void>;
  onCancel: () => void;
}

export function OpportunityForm({ initial, clients, projects, onSubmit, onCancel }: OpportunityFormProps) {
  const [form, setForm] = useState<FormData>({
    client_id: initial?.client_id ?? clients[0]?.id ?? '',
    project_id: initial?.project_id ?? null,
    name: initial?.name ?? '',
    stage: initial?.stage ?? 'lead_detected',
    probability: initial?.probability ?? 25,
    estimated_amount: initial?.estimated_amount ?? null,
    expected_close_date: initial?.expected_close_date ?? null,
    lost_reason: initial?.lost_reason ?? null,
    notes: initial?.notes ?? null,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = <K extends keyof FormData>(key: K, value: FormData[K]) => setForm((f) => ({ ...f, [key]: value }));

  const filteredProjects = form.client_id
    ? projects.filter((p) => p.client_id === form.client_id)
    : projects;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.client_id || !form.name.trim()) {
      setError('Client et nom de l’opportunité sont requis');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const est =
        form.estimated_amount == null || Number.isNaN(Number(form.estimated_amount))
          ? null
          : Number(form.estimated_amount);
      await onSubmit({
        ...form,
        name: form.name.trim(),
        project_id: form.project_id || null,
        estimated_amount: est,
        expected_close_date: form.expected_close_date || null,
        lost_reason: form.stage === 'lost' ? form.lost_reason : null,
        notes: form.notes?.trim() || null,
      });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="form-error">{error}</div>}

      <div>
        <label className="form-label">Nom de l’opportunité *</label>
        <input className="input" value={form.name} onChange={(e) => set('name', e.target.value)} required />
      </div>
      <div>
        <label className="form-label">Client *</label>
        <select
          className="input"
          value={form.client_id}
          onChange={(e) => {
            set('client_id', e.target.value);
            set('project_id', null);
          }}
          required
        >
          {clients.length === 0 && <option value="">Aucun client</option>}
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="form-label">Projet livré (optionnel)</label>
        <select
          className="input"
          value={form.project_id || ''}
          onChange={(e) => set('project_id', e.target.value || null)}
        >
          <option value="">Aucun</option>
          {filteredProjects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="form-label">Étape</label>
          <select
            className="input"
            value={form.stage}
            onChange={(e) => set('stage', e.target.value as DealStage)}
          >
            {PIPELINE_STAGES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="form-label">Probabilité (%)</label>
          <input
            className="input"
            type="number"
            min={0}
            max={100}
            value={form.probability}
            onChange={(e) => set('probability', Number(e.target.value) || 0)}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="form-label">Montant estimé (€)</label>
          <input
            className="input"
            type="number"
            min={0}
            step="0.01"
            value={form.estimated_amount ?? ''}
            onChange={(e) =>
              set('estimated_amount', e.target.value === '' ? null : Number(e.target.value))
            }
          />
        </div>
        <div>
          <label className="form-label">Signature prévue</label>
          <input
            className="input"
            type="date"
            value={form.expected_close_date || ''}
            onChange={(e) => set('expected_close_date', e.target.value || null)}
          />
        </div>
      </div>
      {form.stage === 'lost' && (
        <div>
          <label className="form-label">Motif de perte</label>
          <select
            className="input"
            value={form.lost_reason || ''}
            onChange={(e) => set('lost_reason', (e.target.value || null) as LostReason | null)}
          >
            <option value="">—</option>
            {LOST_REASONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
      )}
      <div>
        <label className="form-label">Notes</label>
        <textarea
          className="input resize-none"
          rows={3}
          value={form.notes || ''}
          onChange={(e) => set('notes', e.target.value)}
        />
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="button" variant="secondary" className="flex-1 normal-case tracking-normal" onClick={onCancel}>
          Annuler
        </Button>
        <Button type="submit" className="flex-1 normal-case tracking-normal" loading={loading}>
          {initial?.id ? 'Enregistrer' : 'Créer'}
        </Button>
      </div>
    </form>
  );
}
