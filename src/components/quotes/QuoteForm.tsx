import { useState } from 'react';
import type { Client, Opportunity, Project, Quote, QuoteStatus } from '../../lib/types';
import { Button } from '../ui/Button';
import { generateQuoteNumber } from '../../lib/utils';

type FormData = Omit<Quote, 'id' | 'created_at' | 'updated_at' | 'client' | 'project' | 'opportunity'>;

const statusOptions: { value: QuoteStatus; label: string }[] = [
  { value: 'draft', label: 'Brouillon' },
  { value: 'sent', label: 'Envoyé' },
  { value: 'signed', label: 'Signé' },
  { value: 'refused', label: 'Refusé' },
  { value: 'expired', label: 'Expiré' },
];

interface QuoteFormProps {
  initial?: Partial<Quote>;
  clients: Client[];
  projects: Project[];
  opportunities: Opportunity[];
  onSubmit: (data: FormData) => Promise<void>;
  onCancel: () => void;
}

export function QuoteForm({ initial, clients, projects, opportunities, onSubmit, onCancel }: QuoteFormProps) {
  const [form, setForm] = useState<FormData>({
    client_id: initial?.client_id ?? clients[0]?.id ?? '',
    project_id: initial?.project_id ?? null,
    opportunity_id: initial?.opportunity_id ?? null,
    title: initial?.title ?? '',
    quote_number: initial?.quote_number || generateQuoteNumber(),
    amount: initial?.amount ?? 0,
    status: initial?.status || 'draft',
    valid_until: initial?.valid_until ?? null,
    deposit_requested: initial?.deposit_requested ?? false,
    deposit_amount: initial?.deposit_amount ?? null,
    expected_acompte_date: initial?.expected_acompte_date ?? null,
    expected_delivery_date: initial?.expected_delivery_date ?? null,
    version: initial?.version ?? 1,
    parent_quote_id: initial?.parent_quote_id ?? null,
    notes: initial?.notes ?? null,
    signed_at: initial?.signed_at ?? null,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = <K extends keyof FormData>(key: K, value: FormData[K]) => setForm((f) => ({ ...f, [key]: value }));

  const filteredProjects = form.client_id
    ? projects.filter((p) => p.client_id === form.client_id)
    : projects;
  const filteredOpps = form.client_id
    ? opportunities.filter((o) => o.client_id === form.client_id && o.stage !== 'lost')
    : opportunities.filter((o) => o.stage !== 'lost');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.client_id || !form.title.trim()) {
      setError('Client et titre requis');
      return;
    }
    if (form.amount < 0) {
      setError('Montant invalide');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await onSubmit({
        ...form,
        title: form.title.trim(),
        project_id: form.project_id || null,
        opportunity_id: form.opportunity_id || null,
        quote_number: form.quote_number || generateQuoteNumber(),
        valid_until: form.valid_until || null,
        deposit_amount: form.deposit_requested ? form.deposit_amount ?? null : null,
        expected_acompte_date: form.expected_acompte_date || null,
        expected_delivery_date: form.expected_delivery_date || null,
        notes: form.notes?.trim() || null,
        signed_at: form.signed_at || null,
        parent_quote_id: form.parent_quote_id || null,
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
        <label className="form-label">Titre du devis *</label>
        <input className="input" value={form.title} onChange={(e) => set('title', e.target.value)} required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="form-label">N° devis</label>
          <input
            className="input"
            value={form.quote_number || ''}
            onChange={(e) => set('quote_number', e.target.value || null)}
          />
        </div>
        <div>
          <label className="form-label">Version</label>
          <input
            className="input"
            type="number"
            min={1}
            value={form.version}
            onChange={(e) => set('version', Math.max(1, Number(e.target.value) || 1))}
          />
        </div>
      </div>
      <div>
        <label className="form-label">Client *</label>
        <select
          className="input"
          value={form.client_id}
          onChange={(e) => {
            set('client_id', e.target.value);
            set('project_id', null);
            set('opportunity_id', null);
          }}
          required
        >
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="form-label">Opportunité (pipeline)</label>
        <select
          className="input"
          value={form.opportunity_id || ''}
          onChange={(e) => set('opportunity_id', e.target.value || null)}
        >
          <option value="">Aucune</option>
          {filteredOpps.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
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
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="form-label">Montant TTC (€) *</label>
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
          <label className="form-label">Valide jusqu’au</label>
          <input
            className="input"
            type="date"
            value={form.valid_until || ''}
            onChange={(e) => set('valid_until', e.target.value || null)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="form-label">Date prévue d'acompte</label>
          <input
            className="input"
            type="date"
            value={form.expected_acompte_date || ''}
            onChange={(e) => set('expected_acompte_date', e.target.value || null)}
          />
          <p className="text-[10px] text-ws-mist/70 mt-1">Reportée sur la facture d'acompte.</p>
        </div>
        <div>
          <label className="form-label">Date prévue de livraison</label>
          <input
            className="input"
            type="date"
            value={form.expected_delivery_date || ''}
            onChange={(e) => set('expected_delivery_date', e.target.value || null)}
          />
          <p className="text-[10px] text-ws-mist/70 mt-1">Reportée sur la facture de solde.</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="dep"
          checked={form.deposit_requested}
          onChange={(e) => set('deposit_requested', e.target.checked)}
          className="rounded border-ws-line"
        />
        <label htmlFor="dep" className="text-sm text-ws-ink">
          Acompte demandé
        </label>
      </div>
      {form.deposit_requested && (
        <div>
          <label className="form-label">Montant acompte (€)</label>
          <input
            className="input"
            type="number"
            min={0}
            step="0.01"
            value={form.deposit_amount ?? ''}
            onChange={(e) =>
              set('deposit_amount', e.target.value === '' ? null : Number(e.target.value))
            }
          />
        </div>
      )}
      <div>
        <label className="form-label">Statut</label>
        <select
          className="input"
          value={form.status}
          onChange={(e) => set('status', e.target.value as QuoteStatus)}
        >
          {statusOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
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
          {initial?.id ? 'Enregistrer' : 'Créer le devis'}
        </Button>
      </div>
    </form>
  );
}
