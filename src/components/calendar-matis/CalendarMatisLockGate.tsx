import { useState, type FormEvent, type ReactNode } from 'react';
import { Lock, AlertCircle, Eye, EyeOff, LogOut } from 'lucide-react';

const PASSWORD = 'MatisMAPA15';
const STORAGE_KEY = 'mapa.calendarMatis.unlocked';

/**
 * Verrou « confort » sur la page Calendrier Matis.
 * Stocke l'état déverrouillé en sessionStorage : la session navigateur
 * (jusqu'à fermeture de l'onglet) reste ouverte. Une fermeture/réouverture
 * du navigateur redemande le mot de passe.
 *
 * Note sécurité : le mot de passe est inclus dans le bundle (visible côté
 * client). Ce gate empêche les regards occasionnels, pas un attaquant motivé.
 */
export function CalendarMatisLockGate({ children }: { children: ReactNode }) {
  const [unlocked, setUnlocked] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem(STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [draft, setDraft] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (draft === PASSWORD) {
      try {
        sessionStorage.setItem(STORAGE_KEY, '1');
      } catch {
        /* sessionStorage indisponible */
      }
      setUnlocked(true);
      setError(null);
    } else {
      setError('Mot de passe incorrect.');
      setDraft('');
    }
  };

  const handleLock = () => {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* noop */
    }
    setUnlocked(false);
    setDraft('');
  };

  if (unlocked) {
    return (
      <div className="relative">
        {children}
        <button
          type="button"
          onClick={handleLock}
          className="fixed bottom-4 right-4 z-40 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-ws-line bg-ws-panel/90 backdrop-blur text-[10px] font-mono uppercase tracking-[0.18em] text-ws-mist hover:text-ws-paper hover:border-ws-accent/40 transition-all shadow-glow-sm"
          title="Reverrouiller la page"
        >
          <LogOut size={12} />
          Reverrouiller
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-80px)] flex items-center justify-center px-4 py-12">
      <div
        className="absolute inset-0 pointer-events-none opacity-30"
        aria-hidden
        style={{
          background:
            'radial-gradient(ellipse at 50% 30%, rgba(175,112,55,0.18) 0%, transparent 60%)',
        }}
      />
      <form
        onSubmit={handleSubmit}
        className="relative w-full max-w-md rounded-3xl border border-ws-line bg-ws-panel/90 backdrop-blur-xl p-8 md:p-10 shadow-glow"
      >
        <div className="flex flex-col items-center text-center mb-7">
          <div className="h-14 w-14 rounded-2xl bg-ws-accent/15 border border-ws-accent/30 flex items-center justify-center mb-4 shadow-glow-sm">
            <Lock className="h-6 w-6 text-ws-accent-soft" strokeWidth={2} />
          </div>
          <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-ws-accent mb-2">
            Espace privé
          </div>
          <h1 className="font-serif text-2xl font-light text-ws-paper tracking-wide">
            Calendrier Matis
          </h1>
          <p className="text-sm text-ws-mist mt-3 max-w-xs leading-relaxed">
            Cette page contient des données personnelles. Saisis le mot de passe pour y accéder.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label
              htmlFor="cal-pwd"
              className="block text-[10px] font-mono uppercase tracking-[0.25em] text-ws-mist mb-2"
            >
              Mot de passe
            </label>
            <div className="relative">
              <input
                id="cal-pwd"
                type={show ? 'text' : 'password'}
                autoComplete="current-password"
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                className="w-full pl-4 pr-11 py-3 rounded-xl bg-ws-deep/60 border border-ws-line text-ws-paper font-mono focus:outline-none focus:border-ws-accent placeholder:text-ws-mist/40"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-ws-mist hover:text-ws-paper transition-colors"
                aria-label={show ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                tabIndex={-1}
              >
                {show ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-200 text-sm">
              <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-gradient-to-b from-ws-accent-soft to-ws-accent text-ws-void font-semibold tracking-wide hover:brightness-110 active:scale-[0.98] transition-all shadow-glow-sm border border-white/15"
          >
            Déverrouiller
          </button>
        </div>

        <p className="text-[10px] font-mono text-ws-mist/60 text-center mt-6 leading-relaxed">
          Le verrou se réinitialise à la fermeture du navigateur.
        </p>
      </form>
    </div>
  );
}
