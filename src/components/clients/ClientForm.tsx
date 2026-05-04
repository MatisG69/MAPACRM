import { useState } from 'react';
import { Client, ClientStatus, ClientTag } from '../../lib/types';
import { Button } from '../ui/Button';
import { TagPicker } from '../client-tags/TagPicker';
import { getRandomColor } from '../../lib/utils';

type FormData = Omit<Client, 'id' | 'created_at' | 'updated_at'>;

interface ClientFormProps {
  initial?: Partial<Client>;
  /** Tous les tags du référentiel (utilisés par le picker). */
  allTags?: ClientTag[];
  /** IDs initialement assignés au client (= initial.tags?.map(t => t.id) en général). */
  initialTagIds?: string[];
  /** Crée un nouveau tag dans le référentiel global. */
  onCreateTag?: (
    values: Pick<ClientTag, 'label'> & Partial<Pick<ClientTag, 'color'>>
  ) => Promise<ClientTag>;
  onSubmit: (data: FormData, selectedTagIds: string[]) => Promise<void>;
  onCancel: () => void;
}

const statusOptions: { value: ClientStatus; label: string }[] = [
  { value: 'prospect', label: 'Prospect' },
  { value: 'telephoned', label: 'Téléphoné' },
  { value: 'in_discussion', label: 'Contacté' },
  { value: 'interested', label: 'Intéressé' },
  { value: 'quote_sent', label: 'Devis envoyé' },
  { value: 'not_interested', label: 'Pas intéressé' },
];

const sourceOptions = ['Site web', 'Référence', 'LinkedIn', 'Appel entrant', 'Réseaux sociaux', 'Salon / Événement', 'Autre'];

export function ClientForm({
  initial,
  allTags = [],
  initialTagIds = [],
  onCreateTag,
  onSubmit,
  onCancel,
}: ClientFormProps) {
  const [form, setForm] = useState<FormData>({
    name: initial?.name || '',
    first_name: initial?.first_name ?? null,
    last_name: initial?.last_name ?? null,
    email: initial?.email || '',
    phone: initial?.phone || '',
    company: initial?.company || '',
    address: initial?.address || '',
    city: initial?.city || '',
    website: initial?.website || '',
    status: initial?.status || 'prospect',
    source: initial?.source || '',
    notes: initial?.notes || '',
    satisfaction_rating: initial?.satisfaction_rating ?? null,
    feedback: initial?.feedback ?? null,
    profession: initial?.profession ?? null,
    avatar_color: initial?.avatar_color || getRandomColor(),
  } as FormData);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(initialTagIds);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (key: keyof FormData, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Le nom est requis'); return; }
    setLoading(true);
    setError('');
    try {
      await onSubmit(form, selectedTagIds);
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
          <label className="form-label">Prénom</label>
          <input
            className="input"
            value={form.first_name ?? ''}
            onChange={(e) =>
              setForm((f) => ({ ...f, first_name: e.target.value.trim() || null }))
            }
            placeholder="Jean"
          />
        </div>
        <div>
          <label className="form-label">Nom de famille</label>
          <input
            className="input"
            value={form.last_name ?? ''}
            onChange={(e) =>
              setForm((f) => ({ ...f, last_name: e.target.value.trim() || null }))
            }
            placeholder="Dupont"
          />
          <p className="text-[10px] font-mono text-ws-mist mt-1 leading-snug">
            Apparaît en MAJUSCULES sur les devis et factures (convention FR).
          </p>
        </div>
        <div className="col-span-2">
          <label className="form-label">Nom complet (affiché dans les listes) *</label>
          <input className="input" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Jean Dupont" required />
          <p className="text-[10px] font-mono text-ws-mist mt-1 leading-snug">
            Si « Prénom » et « Nom de famille » sont remplis, ils sont prioritaires sur ce champ pour la mise en forme des devis.
          </p>
        </div>
        <div>
          <label className="form-label">Entreprise</label>
          <input className="input" value={form.company || ''} onChange={(e) => set('company', e.target.value)} placeholder="Dupont SARL" />
        </div>
        <div>
          <label className="form-label">Profession / Secteur</label>
          <input
            className="input"
            value={form.profession || ''}
            onChange={(e) => setForm((f) => ({ ...f, profession: e.target.value || null }))}
            placeholder="Restaurant, Charpentier, Architecte…"
          />
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
          <label className="form-label">Notes internes</label>
          <textarea className="input resize-none" rows={3} value={form.notes || ''} onChange={(e) => set('notes', e.target.value)} placeholder="Informations complémentaires..." />
        </div>
        <div>
          <label className="form-label">Satisfaction client (1–5)</label>
          <select
            className="input"
            value={form.satisfaction_rating ?? ''}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                satisfaction_rating: e.target.value === '' ? null : Number(e.target.value),
              }))
            }
          >
            <option value="">Non renseigné</option>
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {n} — {n === 5 ? 'Excellent' : n === 1 ? 'À améliorer' : '…'}
              </option>
            ))}
          </select>
        </div>
        <div className="col-span-2">
          <label className="form-label">Retour / témoignage client</label>
          <textarea
            className="input resize-none"
            rows={3}
            value={form.feedback || ''}
            onChange={(e) => setForm((f) => ({ ...f, feedback: e.target.value || null }))}
            placeholder="Citation, avis, retour d’expérience…"
          />
        </div>
        {onCreateTag && (
          <div className="col-span-2">
            <label className="form-label">Tags</label>
            <TagPicker
              allTags={allTags}
              selectedIds={selectedTagIds}
              onChange={setSelectedTagIds}
              onCreateTag={onCreateTag}
            />
          </div>
        )}
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="button" variant="secondary" className="flex-1 normal-case tracking-normal" onClick={onCancel}>Annuler</Button>
        <Button type="submit" className="flex-1 normal-case tracking-normal" loading={loading}>{initial ? 'Enregistrer' : 'Créer le client'}</Button>
      </div>
    </form>
  );
}
