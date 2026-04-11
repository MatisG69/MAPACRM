import { useState } from 'react';
import { Client, ClientStatus } from '../../lib/types';
import { Button } from '../ui/Button';
import { getRandomColor } from '../../lib/utils';

type FormData = Omit<Client, 'id' | 'created_at' | 'updated_at'>;

interface ClientFormProps {
  initial?: Partial<Client>;
  onSubmit: (data: FormData) => Promise<void>;
  onCancel: () => void;
}

const statusOptions: { value: ClientStatus; label: string }[] = [
  { value: 'prospect', label: 'Prospect' },
  { value: 'active', label: 'Actif' },
  { value: 'inactive', label: 'Inactif' },
];

const sourceOptions = ['Site web', 'Référence', 'LinkedIn', 'Appel entrant', 'Réseaux sociaux', 'Salon / Événement', 'Autre'];

export function ClientForm({ initial, onSubmit, onCancel }: ClientFormProps) {
  const [form, setForm] = useState<FormData>({
    name: initial?.name || '',
    email: initial?.email || '',
    phone: initial?.phone || '',
    company: initial?.company || '',
    address: initial?.address || '',
    city: initial?.city || '',
    website: initial?.website || '',
    status: initial?.status || 'prospect',
    source: initial?.source || '',
    notes: initial?.notes || '',
    avatar_color: initial?.avatar_color || getRandomColor(),
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (key: keyof FormData, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Le nom est requis'); return; }
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
        <div className="col-span-2">
          <label className="form-label">Nom complet *</label>
          <input className="input" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Jean Dupont" required />
        </div>
        <div>
          <label className="form-label">Entreprise</label>
          <input className="input" value={form.company || ''} onChange={(e) => set('company', e.target.value)} placeholder="Dupont SARL" />
        </div>
        <div>
          <label className="form-label">Statut</label>
          <select className="input" value={form.status} onChange={(e) => set('status', e.target.value as ClientStatus)}>
            {statusOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <label className="form-label">Email</label>
          <input className="input" type="email" value={form.email || ''} onChange={(e) => set('email', e.target.value)} placeholder="jean@dupont.fr" />
        </div>
        <div>
          <label className="form-label">Téléphone</label>
          <input className="input" value={form.phone || ''} onChange={(e) => set('phone', e.target.value)} placeholder="+33 6 12 34 56 78" />
        </div>
        <div>
          <label className="form-label">Ville</label>
          <input className="input" value={form.city || ''} onChange={(e) => set('city', e.target.value)} placeholder="Paris" />
        </div>
        <div>
          <label className="form-label">Site web</label>
          <input className="input" value={form.website || ''} onChange={(e) => set('website', e.target.value)} placeholder="https://dupont.fr" />
        </div>
        <div className="col-span-2">
          <label className="form-label">Source</label>
          <select className="input" value={form.source || ''} onChange={(e) => set('source', e.target.value)}>
            <option value="">Sélectionner une source</option>
            {sourceOptions.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="col-span-2">
          <label className="form-label">Notes</label>
          <textarea className="input resize-none" rows={3} value={form.notes || ''} onChange={(e) => set('notes', e.target.value)} placeholder="Informations complémentaires..." />
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="button" variant="secondary" className="flex-1 normal-case tracking-normal" onClick={onCancel}>Annuler</Button>
        <Button type="submit" className="flex-1 normal-case tracking-normal" loading={loading}>{initial ? 'Enregistrer' : 'Créer le client'}</Button>
      </div>
    </form>
  );
}
