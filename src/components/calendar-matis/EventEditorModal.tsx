import { useEffect, useState, type FormEvent } from 'react';
import { Calendar, Clock, MapPin, FileText, Trash2, Save, AlertCircle, Loader2 } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import type { IcsEvent } from '../../lib/icsParser';
import type { CaldavEventInput } from '../../hooks/useCaldavCalendar';

interface EventEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Event existant à éditer ; null = création */
  initial: IcsEvent | null;
  /** Si initial null et defaultStart fourni, pré-remplit la date/heure de début */
  defaultStart?: Date;
  onCreate: (input: CaldavEventInput) => Promise<unknown>;
  onUpdate: (uid: string, input: CaldavEventInput) => Promise<unknown>;
  onDelete: (uid: string) => Promise<unknown>;
}

/** YYYY-MM-DD pour input[type=date] */
function toDateInputValue(d: Date): string {
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** HH:MM pour input[type=time] */
function toTimeInputValue(d: Date): string {
  const h = d.getHours().toString().padStart(2, '0');
  const m = d.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
}

function combineDateTime(date: string, time: string): Date {
  return new Date(`${date}T${time}:00`);
}

export function EventEditorModal({
  isOpen,
  onClose,
  initial,
  defaultStart,
  onCreate,
  onUpdate,
  onDelete,
}: EventEditorModalProps) {
  const isEditing = !!initial;
  const isRecurring = initial?.recurring ?? false;

  const [summary, setSummary] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [allDay, setAllDay] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('10:00');

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Re-init form quand le modal s'ouvre
  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    if (initial) {
      setSummary(initial.summary || '');
      setLocation(initial.location || '');
      setDescription(initial.description || '');
      setAllDay(initial.allDay);
      setStartDate(toDateInputValue(initial.start));
      setStartTime(toTimeInputValue(initial.start));
      // Pour all-day l'end peut être 1 jour après ; on remet à la date de start pour l'UI
      const endRef = initial.allDay ? new Date(initial.start) : initial.end;
      setEndDate(toDateInputValue(endRef));
      setEndTime(toTimeInputValue(initial.end));
    } else {
      const d = defaultStart || new Date();
      const startD = new Date(d);
      // Cale à la prochaine demi-heure si ce n'est pas un slot rond
      if (startD.getMinutes() > 0) {
        startD.setHours(startD.getHours() + 1);
        startD.setMinutes(0, 0, 0);
      }
      const endD = new Date(startD);
      endD.setHours(endD.getHours() + 1);
      setSummary('');
      setLocation('');
      setDescription('');
      setAllDay(false);
      setStartDate(toDateInputValue(startD));
      setStartTime(toTimeInputValue(startD));
      setEndDate(toDateInputValue(endD));
      setEndTime(toTimeInputValue(endD));
    }
  }, [isOpen, initial, defaultStart]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!summary.trim()) {
      setError('Le titre est obligatoire.');
      return;
    }
    let start: Date;
    let end: Date;
    if (allDay) {
      start = new Date(`${startDate}T00:00:00`);
      end = new Date(`${endDate || startDate}T00:00:00`);
    } else {
      start = combineDateTime(startDate, startTime);
      end = combineDateTime(endDate || startDate, endTime);
    }
    if (end <= start) {
      setError('La fin doit être après le début.');
      return;
    }

    const input: CaldavEventInput = {
      summary: summary.trim(),
      description: description.trim() || null,
      location: location.trim() || null,
      start: start.toISOString(),
      end: end.toISOString(),
      allDay,
    };

    setBusy(true);
    try {
      if (isEditing && initial) {
        await onUpdate(initial.uid, input);
      } else {
        await onCreate(input);
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!initial) return;
    setBusy(true);
    setError(null);
    try {
      await onDelete(initial.uid);
      setConfirmDelete(false);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la suppression');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={isEditing ? 'Modifier l\'évènement' : 'Nouvel évènement'}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {isRecurring && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs">
              <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
              <span>
                Cet évènement fait partie d'une série récurrente. La modification depuis le CRM
                affectera la définition de base — l'édition fine d'occurrences (this-only / future)
                n'est pas encore supportée. Pour une modification précise, utilise Apple Calendar.
              </span>
            </div>
          )}

          <div>
            <label className="block text-[10px] font-mono uppercase tracking-[0.2em] text-ws-mist mb-1.5">
              Titre *
            </label>
            <input
              type="text"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              autoFocus
              required
              placeholder="Ex. Rdv client LDK"
              className="w-full px-4 py-3 rounded-xl bg-ws-deep/50 border border-ws-line text-ws-paper focus:outline-none focus:border-ws-accent placeholder:text-ws-mist/50"
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-ws-ink cursor-pointer select-none">
            <input
              type="checkbox"
              checked={allDay}
              onChange={(e) => setAllDay(e.target.checked)}
              className="w-4 h-4 accent-ws-accent"
            />
            Journée entière
          </label>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-mono uppercase tracking-[0.2em] text-ws-mist mb-1.5 flex items-center gap-1.5">
                <Calendar size={10} /> Début
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  if (!endDate || endDate < e.target.value) setEndDate(e.target.value);
                }}
                required
                className="w-full px-3 py-2.5 rounded-xl bg-ws-deep/50 border border-ws-line text-ws-paper focus:outline-none focus:border-ws-accent text-sm"
              />
            </div>
            {!allDay && (
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-[0.2em] text-ws-mist mb-1.5 flex items-center gap-1.5">
                  <Clock size={10} /> Heure début
                </label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 rounded-xl bg-ws-deep/50 border border-ws-line text-ws-paper focus:outline-none focus:border-ws-accent text-sm"
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-mono uppercase tracking-[0.2em] text-ws-mist mb-1.5 flex items-center gap-1.5">
                <Calendar size={10} /> Fin
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
                min={startDate}
                className="w-full px-3 py-2.5 rounded-xl bg-ws-deep/50 border border-ws-line text-ws-paper focus:outline-none focus:border-ws-accent text-sm"
              />
            </div>
            {!allDay && (
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-[0.2em] text-ws-mist mb-1.5 flex items-center gap-1.5">
                  <Clock size={10} /> Heure fin
                </label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 rounded-xl bg-ws-deep/50 border border-ws-line text-ws-paper focus:outline-none focus:border-ws-accent text-sm"
                />
              </div>
            )}
          </div>

          <div>
            <label className="block text-[10px] font-mono uppercase tracking-[0.2em] text-ws-mist mb-1.5 flex items-center gap-1.5">
              <MapPin size={10} /> Lieu
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Adresse, lien Zoom, …"
              className="w-full px-3 py-2.5 rounded-xl bg-ws-deep/50 border border-ws-line text-ws-paper focus:outline-none focus:border-ws-accent text-sm placeholder:text-ws-mist/50"
            />
          </div>

          <div>
            <label className="block text-[10px] font-mono uppercase tracking-[0.2em] text-ws-mist mb-1.5 flex items-center gap-1.5">
              <FileText size={10} /> Notes
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Détails, ordre du jour, contacts…"
              className="w-full px-3 py-2.5 rounded-xl bg-ws-deep/50 border border-ws-line text-ws-paper focus:outline-none focus:border-ws-accent text-sm resize-none placeholder:text-ws-mist/50"
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-200 text-sm">
              <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
              <span className="font-mono break-all">{error}</span>
            </div>
          )}

          <div className="flex flex-wrap gap-2 justify-between pt-2">
            <div>
              {isEditing && (
                <Button
                  type="button"
                  variant="secondary"
                  icon={<Trash2 size={14} />}
                  onClick={() => setConfirmDelete(true)}
                  disabled={busy}
                  className="normal-case tracking-normal text-red-300 hover:text-red-200"
                >
                  Supprimer
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={onClose}
                disabled={busy}
                className="normal-case tracking-normal"
              >
                Annuler
              </Button>
              <Button
                type="submit"
                loading={busy}
                icon={busy ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                className="normal-case tracking-normal"
              >
                {isEditing ? 'Enregistrer' : 'Créer'}
              </Button>
            </div>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={handleDelete}
        title="Supprimer cet évènement ?"
        description={`« ${initial?.summary || '(sans titre)'} » sera supprimé d'Apple Calendar et de tous tes appareils synchronisés. Action irréversible.`}
      />
    </>
  );
}
