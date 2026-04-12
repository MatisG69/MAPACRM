import { useState } from 'react';
import { Invoice, InvoiceStatus } from '../../lib/types';
import { Client } from '../../lib/types';
import { Project } from '../../lib/types';
import { Button } from '../ui/Button';
import { generateInvoiceNumber } from '../../lib/utils';

type FormData = Omit<Invoice, 'id' | 'created_at' | 'updated_at' | 'client' | 'project'>;

interface InvoiceFormProps {
  initial?: Partial<Invoice>;
  clients: Client[];
  projects: Project[];
  onSubmit: (data: FormData) => Promise<void>;
  onCancel: () => void;
}

const statusOptions: { value: InvoiceStatus; label: string }[] = [
  { value: 'draft', label: 'Brouillon' },
  { value: 'sent', label: 'Envoyée' },
  { value: 'paid', label: 'Payée' },
  { value: 'overdue', label: 'En retard' },
  { value: 'cancelled', label: 'Annulée' },
];

export function InvoiceForm({ initial, clients, projects, onSubmit, onCancel }: InvoiceFormProps) {
  const [form, setForm] = useState<FormData>({
    client_id: initial?.client_id ?? null,
    project_id: initial?.project_id ?? null,
    source_quote_id: initial?.source_quote_id ?? null,
    invoice_number: initial?.invoice_number || generateInvoiceNumber(),
    amount: initial?.amount ?? 0,
    status: initial?.status || 'draft',
    due_date: initial?.due_date || '',
    paid_date: initial?.paid_date || '',
    notes: initial?.notes || '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = <K extends keyof FormData>(key: K, value: FormData[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.amount < 0) {
      setError('Le montant doit être positif');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await onSubmit({
        ...form,
        source_quote_id: form.source_quote_id || null,
        due_date: form.due_date || null,
        paid_date: form.paid_date || null,
        notes: form.notes || null,
      });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const filteredProjects = form.client_id
    ? projects.filter((p) => p.client_id === form.client_id)
    : projects;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="form-error">{error}</div>}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="form-label">N° facture</label>
          <input
            className="input"
            value={form.invoice_number || ''}
            onChange={(e) => set('invoice_number', e.target.value || null)}
            placeholder="MAPA-2026..."
          />
        </div>
        <div>
          <label className="form-label">Montant (€) *</label>
          <input
            className="input"
            type="number"
            min={0}
            step="0.01"
            value={form.amount || ''}
            onChange={(e) => set('amount', Number(e.target.value) || 0)}
            required
          />
        </div>
        <div>
          <label className="form-label">Client</label>
          <select
            className="input"
            value={form.client_id || ''}
            onChange={(e) => {
              const v = e.target.value || null;
              set('client_id', v);
              set('project_id', null);
            }}
          >
            <option value="">Aucun</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.company ? ` — ${c.company}` : ''}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="form-label">Projet</label>
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
        <div>
          <label className="form-label">Statut</label>
          <select
            className="input"
            value={form.status}
            onChange={(e) => set('status', e.target.value as InvoiceStatus)}
          >
            {statusOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="form-label">Échéance</label>
          <input
            className="input"
            type="date"
            value={form.due_date || ''}
            onChange={(e) => set('due_date', e.target.value)}
          />
        </div>
        <div className="col-span-2">
          <label className="form-label">Date de paiement</label>
          <input
            className="input"
            type="date"
            value={form.paid_date || ''}
            onChange={(e) => set('paid_date', e.target.value)}
          />
        </div>
        <div className="col-span-2">
          <label className="form-label">Notes</label>
          <textarea
            className="input resize-none"
            rows={3}
            value={form.notes || ''}
            onChange={(e) => set('notes', e.target.value)}
            placeholder="Conditions, mentions..."
          />
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="button" variant="secondary" className="flex-1 normal-case tracking-normal" onClick={onCancel}>
          Annuler
        </Button>
        <Button type="submit" className="flex-1 normal-case tracking-normal" loading={loading}>
          {initial ? 'Enregistrer' : 'Créer la facture'}
        </Button>
      </div>
    </form>
  );
}
