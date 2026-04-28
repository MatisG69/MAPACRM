import { useState, useMemo, useEffect } from 'react';
import { Project, ProjectStatus, ProjectType, Task } from '../../lib/types';
import { Client } from '../../lib/types';
import { normalizeSiteUrl } from '../../lib/sitePreview';
import { Button } from '../ui/Button';

type FormData = Omit<Project, 'id' | 'created_at' | 'updated_at' | 'client'>;

/** Champs juridiques + contact décisionnaire saisis dans le projet et persistés sur le client lié */
interface ClientLegalFields {
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  address: string | null;
  city: string | null;
  legal_form: string | null;
  siret: string | null;
  vat_number: string | null;
  contact_role: string | null;
}

interface ProjectFormProps {
  initial?: Partial<Project>;
  clients: Client[];
  /** Pour masquer le curseur manuel quand des tâches pilotent déjà l’avancement */
  tasks?: Task[];
  onSubmit: (data: FormData) => Promise<void>;
  /** Si fourni, permet de sauvegarder dans la même opération les infos contractuelles du client lié */
  onUpdateClient?: (clientId: string, partial: Partial<Client>) => Promise<Client | unknown>;
  onCancel: () => void;
}

const statusOptions: { value: ProjectStatus; label: string }[] = [
  { value: 'planning', label: 'Planification' },
  { value: 'quote_sent', label: 'Devis envoyé' },
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
  { value: 'automation', label: 'Automatisation (logiciel / site)' },
  { value: 'other', label: 'Autre' },
];

export function ProjectForm({ initial, clients, tasks = [], onSubmit, onUpdateClient, onCancel }: ProjectFormProps) {
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
    budget: initial?.budget ?? null,
    start_date: initial?.start_date || '',
    end_date: initial?.end_date || '',
    progress: initial?.progress || 0,
    type: initial?.type || null,
    has_recurring_support: initial?.has_recurring_support ?? false,
    recurring_support_amount: initial?.recurring_support_amount ?? null,
    recurring_support_label: initial?.recurring_support_label ?? null,
    prestation_scope: initial?.prestation_scope ?? null,
  });

  // Récupère le client lié (s'il existe) pour pré-remplir les infos contractuelles
  const linkedClient = useMemo(
    () => (form.client_id ? clients.find((c) => c.id === form.client_id) ?? null : null),
    [form.client_id, clients]
  );

  // État local pour les champs juridiques et contact (édité depuis la fiche projet)
  const [legalForm, setLegalForm] = useState<ClientLegalFields>({
    name: '',
    email: null,
    phone: null,
    company: null,
    address: null,
    city: null,
    legal_form: null,
    siret: null,
    vat_number: null,
    contact_role: null,
  });

  // Synchronise quand on change de client (pré-remplit les champs juridiques)
  useEffect(() => {
    if (linkedClient) {
      setLegalForm({
        name: linkedClient.name ?? '',
        email: linkedClient.email,
        phone: linkedClient.phone,
        company: linkedClient.company,
        address: linkedClient.address,
        city: linkedClient.city,
        legal_form: linkedClient.legal_form ?? null,
        siret: linkedClient.siret ?? null,
        vat_number: linkedClient.vat_number ?? null,
        contact_role: linkedClient.contact_role ?? null,
      });
    }
  }, [linkedClient]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = <K extends keyof FormData>(key: K, value: FormData[K]) => setForm((f) => ({ ...f, [key]: value }));
  const setLegal = <K extends keyof ClientLegalFields>(key: K, value: ClientLegalFields[K]) =>
    setLegalForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Le nom est requis'); return; }
    setLoading(true);
    setError('');
    try {
      const base = {
        ...form,
        site_url: normalizeSiteUrl(form.site_url || undefined),
        start_date: form.start_date || null,
        end_date: form.end_date || null,
      };
      if (taskDriven) {
        const { progress: _p, ...rest } = base;
        await onSubmit(rest);
      } else {
        await onSubmit(base);
      }

      // Si un client est lié et qu'un callback est fourni, on persiste les infos contractuelles
      if (form.client_id && onUpdateClient && linkedClient) {
        const trim = (v: string | null) => (v && v.trim() ? v.trim() : null);
        const patch: Partial<Client> = {
          name: legalForm.name.trim() || linkedClient.name,
          email: trim(legalForm.email),
          phone: trim(legalForm.phone),
          company: trim(legalForm.company),
          address: trim(legalForm.address),
          city: trim(legalForm.city),
          legal_form: trim(legalForm.legal_form),
          siret: trim(legalForm.siret),
          vat_number: trim(legalForm.vat_number),
          contact_role: trim(legalForm.contact_role),
        };
        // Ne déclenche l'update que si au moins un champ a changé
        const changed = (Object.keys(patch) as (keyof typeof patch)[]).some(
          (k) => patch[k] !== (linkedClient as unknown as Record<string, unknown>)[k]
        );
        if (changed) {
          await onUpdateClient(form.client_id, patch);
        }
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

      {/* ─────────────────────────────────────────────────────────
          Périmètre de la prestation (utilisé sur le PDF de devis)
          Si vide, le devis utilise la liste catalogue par défaut
          selon le type du projet.
          ───────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-ws-line bg-ws-deep/30 px-4 py-4 space-y-2">
        <div className="flex items-baseline justify-between gap-3 flex-wrap">
          <label className="form-label" htmlFor="prestation-scope">
            Périmètre de la prestation
          </label>
          <span className="text-[10px] font-mono text-ws-mist">
            apparaît tel quel sur le devis · une ligne = un point
          </span>
        </div>
        <textarea
          id="prestation-scope"
          className="input resize-none font-mono text-[13px] leading-[1.6]"
          rows={6}
          value={form.prestation_scope ?? ''}
          onChange={(e) => set('prestation_scope', e.target.value || null)}
          placeholder={`Design sur mesure - maquette validée avant intégration\nIntégration responsive - mobile, tablette, desktop\nRéférencement local SEO de base\nAccompagnement post-livraison inclus - 30 jours`}
        />
        <p className="text-[10px] font-mono text-ws-mist leading-relaxed">
          Listez ici les éléments concrets livrés au client. Si laissé vide, le devis utilise
          automatiquement la trame standard selon le type de projet
          {form.type ? ` (« ${form.type} »)` : ''}.
        </p>
      </div>

      {/* ─────────────────────────────────────────────────────────
          Suivi après-vente mensuel (récurrent)
          Apparaît dans la section "Tarification mensuelle" du devis PDF
          ───────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-ws-line bg-ws-deep/30 px-4 py-4 space-y-3">
        <label className="flex items-center gap-2.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={!!form.has_recurring_support}
            onChange={(e) => set('has_recurring_support', e.target.checked)}
            className="w-4 h-4 rounded accent-ws-accent"
          />
          <div>
            <span className="text-sm text-ws-paper font-medium">Suivi après-vente mensuel</span>
            <span className="block text-[10px] font-mono text-ws-mist mt-0.5">
              Ajoute une ligne récurrente HT au devis (cumulable avec les autres projets du même client).
            </span>
          </div>
        </label>

        {form.has_recurring_support && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <div>
              <label className="form-label">Montant mensuel HT (€)</label>
              <input
                type="number"
                className="input font-mono"
                value={form.recurring_support_amount ?? ''}
                onChange={(e) =>
                  set(
                    'recurring_support_amount',
                    e.target.value ? Number(e.target.value) : null
                  )
                }
                placeholder="ex : 80"
                min={0}
                step={5}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="form-label">Libellé du suivi (facultatif)</label>
              <input
                type="text"
                className="input"
                value={form.recurring_support_label ?? ''}
                onChange={(e) =>
                  set('recurring_support_label', e.target.value || null)
                }
                placeholder="ex : SEO + statistiques · Supervision automatisations"
              />
            </div>
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────
          Informations contractuelles du client
          Persistées sur la fiche client (devis + CGV utilisent ces données)
          ───────────────────────────────────────────────────────── */}
      {form.client_id && onUpdateClient && (
        <div className="rounded-2xl border border-ws-line bg-ws-deep/30 px-4 py-4 space-y-3">
          <div className="flex items-center justify-between gap-3 mb-1">
            <div>
              <h4 className="text-sm font-semibold text-ws-paper">Informations contractuelles du client</h4>
              <p className="text-[10px] font-mono text-ws-mist mt-0.5">
                Reprises automatiquement dans le devis et les CGV générés.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="form-label">Dénomination sociale</label>
              <input
                className="input"
                value={legalForm.company ?? ''}
                onChange={(e) => setLegal('company', e.target.value || null)}
                placeholder="Cabinet Dupont & Associés"
              />
            </div>
            <div>
              <label className="form-label">Forme juridique</label>
              <input
                className="input"
                value={legalForm.legal_form ?? ''}
                onChange={(e) => setLegal('legal_form', e.target.value || null)}
                placeholder="SAS, SARL, SCP, EI…"
              />
            </div>
            <div>
              <label className="form-label">SIRET</label>
              <input
                className="input font-mono text-sm"
                value={legalForm.siret ?? ''}
                onChange={(e) => setLegal('siret', e.target.value || null)}
                placeholder="123 456 789 00012"
                inputMode="numeric"
              />
            </div>
            <div className="col-span-2">
              <label className="form-label">Adresse du siège</label>
              <input
                className="input"
                value={legalForm.address ?? ''}
                onChange={(e) => setLegal('address', e.target.value || null)}
                placeholder="12 rue de la République"
              />
            </div>
            <div>
              <label className="form-label">Ville</label>
              <input
                className="input"
                value={legalForm.city ?? ''}
                onChange={(e) => setLegal('city', e.target.value || null)}
                placeholder="59000 Lille"
              />
            </div>
            <div>
              <label className="form-label">N° TVA intracommunautaire</label>
              <input
                className="input font-mono text-sm"
                value={legalForm.vat_number ?? ''}
                onChange={(e) => setLegal('vat_number', e.target.value || null)}
                placeholder="FR12345678901"
              />
            </div>

            <div className="col-span-2 mt-2 pt-3 border-t border-ws-line">
              <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-ws-mist mb-2">
                Contact / décisionnaire
              </p>
            </div>
            <div>
              <label className="form-label">Nom du contact</label>
              <input
                className="input"
                value={legalForm.name}
                onChange={(e) => setLegal('name', e.target.value)}
                placeholder="Jean Dupont"
              />
            </div>
            <div>
              <label className="form-label">Fonction</label>
              <input
                className="input"
                value={legalForm.contact_role ?? ''}
                onChange={(e) => setLegal('contact_role', e.target.value || null)}
                placeholder="Gérant, Responsable communication…"
              />
            </div>
            <div>
              <label className="form-label">Email du contact</label>
              <input
                className="input"
                type="email"
                value={legalForm.email ?? ''}
                onChange={(e) => setLegal('email', e.target.value || null)}
                placeholder="jean@dupont.fr"
              />
            </div>
            <div>
              <label className="form-label">Téléphone du contact</label>
              <input
                className="input font-mono text-sm"
                value={legalForm.phone ?? ''}
                onChange={(e) => setLegal('phone', e.target.value || null)}
                placeholder="+33 6 12 34 56 78"
              />
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <Button type="button" variant="secondary" className="flex-1 normal-case tracking-normal" onClick={onCancel}>Annuler</Button>
        <Button type="submit" className="flex-1 normal-case tracking-normal" loading={loading}>{initial ? 'Enregistrer' : 'Créer le projet'}</Button>
      </div>
    </form>
  );
}