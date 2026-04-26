import { useState } from 'react';
import { Link2, AlertCircle, RefreshCw, Trash2 } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

interface CalendarSettingsModalProps {
  isOpen: boolean;
  currentUrl: string;
  onClose: () => void;
  onSave: (url: string | null) => void;
  onRefresh: () => void;
  lastFetchedAt: Date | null;
  loading: boolean;
}

export function CalendarSettingsModal({
  isOpen,
  currentUrl,
  onClose,
  onSave,
  onRefresh,
  lastFetchedAt,
  loading,
}: CalendarSettingsModalProps) {
  const [draft, setDraft] = useState(currentUrl);
  const [error, setError] = useState<string | null>(null);

  const handleSave = () => {
    setError(null);
    const v = draft.trim();
    if (!v) {
      onSave(null);
      onClose();
      return;
    }
    if (!v.startsWith('webcal://') && !v.startsWith('https://')) {
      setError('L\'URL doit commencer par webcal:// ou https://');
      return;
    }
    onSave(v);
    onClose();
  };

  const handleClear = () => {
    setDraft('');
    onSave(null);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Connexion Apple Calendar" size="md">
      <div className="space-y-5">
        <div className="rounded-2xl border border-ws-line bg-ws-deep/40 p-4 space-y-2">
          <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-ws-mist">
            Comment obtenir l'URL
          </div>
          <ol className="text-xs text-ws-ink space-y-1 list-decimal list-inside leading-relaxed">
            <li>App Calendrier macOS → sidebar (`⌥⌘S`)</li>
            <li>Survole le calendrier dédié → clique l'icône d'antenne 📡</li>
            <li>Coche <strong className="text-ws-paper">Public Calendar</strong></li>
            <li>Copie l'URL <code className="text-ws-accent">webcal://...</code></li>
          </ol>
        </div>

        <div>
          <label
            htmlFor="ics-url"
            className="block text-[10px] font-mono uppercase tracking-[0.2em] text-ws-mist mb-1.5"
          >
            URL du calendrier public
          </label>
          <div className="relative">
            <Link2
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-ws-mist pointer-events-none"
            />
            <input
              id="ics-url"
              type="text"
              autoComplete="off"
              spellCheck={false}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="webcal://p##-caldav.icloud.com/published/2/..."
              className="w-full pl-9 pr-4 py-3 rounded-xl bg-ws-deep/50 border border-ws-line text-ws-paper font-mono text-xs focus:outline-none focus:border-ws-accent placeholder:text-ws-mist/50"
            />
          </div>
          <p className="text-[11px] text-ws-mist/80 mt-1.5">
            Stockée dans ce navigateur uniquement (localStorage). Pas de partage avec d'autres
            utilisateurs.
          </p>
        </div>

        {error && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-ws-bear-dim border border-red-500/30 text-red-200 text-sm">
            <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {lastFetchedAt && (
          <div className="text-[11px] font-mono text-ws-mist">
            Dernière synchro :{' '}
            {lastFetchedAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
          </div>
        )}

        <div className="flex flex-wrap gap-2 justify-between pt-2">
          <div className="flex gap-2">
            <Button
              variant="secondary"
              icon={<RefreshCw size={14} className={loading ? 'animate-spin' : ''} />}
              onClick={onRefresh}
              disabled={!currentUrl || loading}
              className="normal-case tracking-normal"
            >
              Rafraîchir
            </Button>
            {currentUrl && (
              <Button
                variant="secondary"
                icon={<Trash2 size={14} />}
                onClick={handleClear}
                className="normal-case tracking-normal"
              >
                Effacer
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose} className="normal-case tracking-normal">
              Annuler
            </Button>
            <Button onClick={handleSave} className="normal-case tracking-normal">
              Enregistrer
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
