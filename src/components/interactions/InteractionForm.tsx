import { useState } from 'react';
import { Interaction, InteractionType } from '../../lib/types';
import { Client } from '../../lib/types';
import { Button } from '../ui/Button';

type FormData = Omit<Interaction, 'id' | 'created_at' | 'client'>;

interface InteractionFormProps {
  clients: Client[];
  defaultClientId?: string;
  onSubmit: (data: FormData) => Promise<void>;
  onCancel: () => void;
}

const typeOptions: { value: InteractionType; label: string }[] = [
  { value: 'call', label: 'Appel téléphonique' },
  { value: 'email', label: 'Email' },
  { value: 'meeting', label: 'Réunion' },
  { value: 'note', label: 'Note interne' },
  { value: 'demo', label: 'Démonstration' },
];

export function InteractionForm({ clients, defaultClientId, onSubmit, onCancel }: InteractionFormProps) {
  const [form, setForm] = useState<FormData>({
    client_id: defaultClientId || '',
    type: 'call',
    description: '',
    date: new Date().toISOString().slice(0, 16),
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = <K extends keyof FormData>(key: K, value: FormData[K]) => setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.client_id) { setError('Sélectionnez un client'); return; }
    if (!form.description.trim()) { setError('La description est requise'); return; }
    setLoading(true);
    setError('');
    try {
      await onSubmit(form);
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
        <div>
          <label className="form-label">Client *</label>
          <select className="input" value={form.client_id} onChange={(e) => set('client_id', e.target.value)} required>
            <option value="">Sélectionner</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="form-label">Type</label>
          <select className="input" value={form.type} onChange={(e) => set('type', e.target.value as InteractionType)}>
            {typeOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div className="col-span-2">
          <label className="form-label">Date et heure</label>
          <input className="input" type="datetime-local" value={form.date.slice(0, 16)} onChange={(e) => set('date', e.target.value)} />
        </div>
        <div className="col-span-2">
          <label className="form-label">Description *</label>
          <textarea className="input resize-none" rows={4} value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Résumé de l'échange..." required />
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="button" variant="secondary" className="flex-1 normal-case tracking-normal" onClick={onCancel}>Annuler</Button>
        <Button type="submit" className="flex-1 normal-case tracking-normal" loading={loading}>Ajouter l&apos;interaction</Button>
      </div>
    </form>
  );
}