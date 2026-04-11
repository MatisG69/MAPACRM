import { useState } from 'react';
import type { CalendarEvent, CalendarRecurrence, Client, Project } from '../../lib/types';
import { Button } from '../ui/Button';

type FormData = Omit<CalendarEvent, 'id' | 'created_at' | 'updated_at' | 'client' | 'project'>;

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

function toDatetimeLocalValue(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function toDateInputValue(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function localMidnightISO(y: number, m: number, day: number): string {
  return new Date(y, m - 1, day, 0, 0, 0, 0).toISOString();
}

function fromDatetimeLocal(s: string): string {
  return new Date(s).toISOString();
}

function emptyForm(defaultStart?: Date): FormData {
  const base = defaultStart ? new Date(defaultStart) : new Date();
  base.setHours(9, 0, 0, 0);
  const end = new Date(base.getTime() + 60 * 60 * 1000);
  return {
    title: '',
    description: null,
    start_at: fromDatetimeLocal(toDatetimeLocalValue(base)),
    end_at: fromDatetimeLocal(toDatetimeLocalValue(end)),
    all_day: false,
    recurrence: 'none',
    recurrence_until: null,
    client_id: null,
    project_id: null,
    color: null,
  };
}

function eventToForm(ev: CalendarEvent): FormData {
  const start = new Date(ev.start_at);
  if (ev.all_day) {
    return {
      title: ev.title,
      description: ev.description,
      start_at: localMidnightISO(start.getFullYear(), start.getMonth() + 1, start.getDate()),
      end_at: null,
      all_day: true,
      recurrence: ev.recurrence,
      recurrence_until: ev.recurrence_until,
      client_id: ev.client_id,
      project_id: ev.project_id,
      color: ev.color,
    };
  }
  const end = ev.end_at ? new Date(ev.end_at) : new Date(start.getTime() + 60 * 60 * 1000);
  return {
    title: ev.title,
    description: ev.description,
    start_at: fromDatetimeLocal(toDatetimeLocalValue(start)),
    end_at: fromDatetimeLocal(toDatetimeLocalValue(end)),
    all_day: false,
    recurrence: ev.recurrence,
    recurrence_until: ev.recurrence_until,
    client_id: ev.client_id,
    project_id: ev.project_id,
    color: ev.color,
  };
}

interface CalendarEventFormProps {
  initial?: CalendarEvent | null;
  defaultStart?: Date;
  clients: Client[];
  projects: Project[];
  onSubmit: (data: FormData) => Promise<void>;
  onCancel: () => void;
}

const recurrenceOptions: { value: CalendarRecurrence; label: string }[] = [
  { value: 'none', label: 'Une fois' },
  { value: 'daily', label: 'Chaque jour' },
  { value: 'weekly', label: 'Chaque semaine' },
  { value: 'monthly', label: 'Chaque mois' },
];

export function CalendarEventForm({
  initial,
  defaultStart,
  clients,
  projects,
  onSubmit,
  onCancel,
}: CalendarEventFormProps) {
  const [form, setForm] = useState<FormData>(() =>
    initial ? eventToForm(initial) : emptyForm(defaultStart)
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = <K extends keyof FormData>(key: K, value: FormData[K]) => setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      setError('Indiquez un titre');
      return;
    }
    setLoading(true);
    setError('');
    try {
      let payload: FormData = { ...form };
      if (form.all_day) {
        const [y, m, d] = toDateInputValue(new Date(form.start_at)).split('-').map(Number);
        payload = {
          ...form,
          start_at: localMidnightISO(y, m, d),
          end_at: null,
          recurrence_until: form.recurrence === 'none' ? null : form.recurrence_until,
        };
      } else {
        const startISO = fromDatetimeLocal(toDatetimeLocalValue(new Date(form.start_at)));
        let endISO: string | null = null;
        if (form.end_at) {
          const endVal = toDatetimeLocalValue(new Date(form.end_at));
          if (endVal) endISO = fromDatetimeLocal(endVal);
        }
        payload = {
          ...form,
          start_at: startISO,
          end_at: endISO,
          recurrence_until: form.recurrence === 'none' ? null : form.recurrence_until,
        };
      }
      await onSubmit(payload);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const startDateOnly = toDateInputValue(new Date(form.start_at));

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="form-error">{error}</div>}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2">
          <label className="form-label">Titre</label>
          <input
            className="input"
            value={form.title}
            onChange={(e) => set('title', e.target.value)}
            placeholder="Ex. Livraison site, Rapport hebdo, Appel client…"
            required
          />
        </div>

        <div className="sm:col-span-2 flex items-center gap-2">
          <input
            id="cal-all-day"
            type="checkbox"
            className="rounded border-ws-line"
            checked={form.all_day}
            onChange={(e) => {
              const ad = e.target.checked;
              const dateOnly = toDateInputValue(new Date(form.start_at));
              if (ad) {
                const [y, m, d0] = dateOnly.split('-').map(Number);
                set('all_day', true);
                set('start_at', localMidnightISO(y, m, d0));
                set('end_at', null);
              } else {
                const [y, m, d0] = dateOnly.split('-').map(Number);
                const d = new Date(y, m - 1, d0, 9, 0, 0, 0);
                const end = new Date(d.getTime() + 60 * 60 * 1000);
                set('all_day', false);
                set('start_at', fromDatetimeLocal(toDatetimeLocalValue(d)));
                set('end_at', fromDatetimeLocal(toDatetimeLocalValue(end)));
              }
            }}
          />
          <label htmlFor="cal-all-day" className="text-sm text-ws-paper cursor-pointer">
            Journée entière
          </label>
        </div>

        {form.all_day ? (
          <div className="sm:col-span-2">
            <label className="form-label">Date</label>
            <input
              className="input"
              type="date"
              value={startDateOnly}
              onChange={(e) => {
                const v = e.target.value;
                if (!v) return;
                const [y, m, d] = v.split('-').map(Number);
                set('start_at', localMidnightISO(y, m, d));
              }}
            />
          </div>
        ) : (
          <>
            <div>
              <label className="form-label">Début</label>
              <input
                className="input"
                type="datetime-local"
                value={toDatetimeLocalValue(new Date(form.start_at))}
                onChange={(e) => set('start_at', fromDatetimeLocal(e.target.value))}
              />
            </div>
            <div>
              <label className="form-label">Fin (optionnel)</label>
              <input
                className="input"
                type="datetime-local"
                value={form.end_at ? toDatetimeLocalValue(new Date(form.end_at)) : ''}
                onChange={(e) =>
                  set('end_at', e.target.value ? fromDatetimeLocal(e.target.value) : null)
                }
              />
            </div>
          </>
        )}

        <div>
          <label className="form-label">Répétition</label>
          <select
            className="input"
            value={form.recurrence}
            onChange={(e) => set('recurrence', e.target.value as CalendarRecurrence)}
          >
            {recurrenceOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="form-label">Fin de série (optionnel)</label>
          <input
            className="input"
            type="date"
            disabled={form.recurrence === 'none'}
            value={form.recurrence_until || ''}
            onChange={(e) => set('recurrence_until', e.target.value || null)}
          />
        </div>

        <div>
          <label className="form-label">Client (optionnel)</label>
          <select
            className="input"
            value={form.client_id || ''}
            onChange={(e) => set('client_id', e.target.value || null)}
          >
            <option value="">—</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="form-label">Projet (optionnel)</label>
          <select
            className="input"
            value={form.project_id || ''}
            onChange={(e) => set('project_id', e.target.value || null)}
          >
            <option value="">—</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-2 flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[140px]">
            <label className="form-label">Couleur (optionnel)</label>
            <input
              className="input h-10"
              type="color"
              value={form.color && /^#[0-9A-Fa-f]{6}$/.test(form.color) ? form.color : '#7c6cf0'}
              onChange={(e) => set('color', e.target.value)}
            />
          </div>
          <button
            type="button"
            className="text-xs font-mono text-ws-mist hover:text-ws-paper underline pb-2"
            onClick={() => set('color', null)}
          >
            Sans couleur
          </button>
        </div>

        <div className="sm:col-span-2">
          <label className="form-label">Notes</label>
          <textarea
            className="input resize-none"
            rows={3}
            value={form.description || ''}
            onChange={(e) => set('description', e.target.value || null)}
            placeholder="Détails, lien, consignes…"
          />
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <Button
          type="button"
          variant="secondary"
          className="flex-1 normal-case tracking-normal"
          onClick={onCancel}
        >
          Annuler
        </Button>
        <Button type="submit" className="flex-1 normal-case tracking-normal" loading={loading}>
          {initial ? 'Enregistrer' : 'Ajouter'}
        </Button>
      </div>
    </form>
  );
}
