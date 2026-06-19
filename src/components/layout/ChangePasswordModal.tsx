import { useState, type FormEvent } from 'react';
import { X, Eye, EyeOff, AlertCircle, CheckCircle2, Loader2, KeyRound } from 'lucide-react';
import { supabase } from '../../lib/supabase';

/**
 * Changement du mot de passe de l'utilisateur connecté (Supabase Auth).
 * Aucune vérification d'email requise : la session active autorise
 * `updateUser`. Plus simple et fiable que le flux de reset par email.
 */
export function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    if (password.length < 8) {
      setError('8 caractères minimum.');
      return;
    }
    if (password !== confirm) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }
    setSubmitting(true);
    setError(null);
    const { error: err } = await supabase.auth.updateUser({ password });
    setSubmitting(false);
    if (err) {
      setError(err.message);
      return;
    }
    setDone(true);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-ws-panel border border-ws-lineStrong/60 rounded-2xl shadow-[0_25px_80px_-12px_rgba(0,0,0,0.85)] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-ws-line">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-ws-accent/15 border border-ws-accent/30 flex items-center justify-center">
              <KeyRound size={15} className="text-ws-accent-soft" />
            </div>
            <p className="font-display font-semibold text-ws-paper">Changer le mot de passe</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0 md:p-1.5 flex items-center justify-center rounded-lg hover:bg-ws-raised text-ws-mist hover:text-ws-paper"
          >
            <X size={16} />
          </button>
        </div>

        {done ? (
          <div className="px-5 py-8 flex flex-col items-center text-center gap-3">
            <CheckCircle2 size={36} className="text-emerald-400" />
            <p className="text-ws-paper font-medium">Mot de passe mis à jour</p>
            <p className="text-sm text-ws-mist">Utilise-le à ta prochaine connexion.</p>
            <button
              type="button"
              onClick={onClose}
              className="mt-2 px-5 py-2.5 rounded-xl bg-gradient-to-b from-ws-accent-soft to-ws-accent text-ws-void font-semibold text-sm border border-white/15"
            >
              Fermer
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="px-5 py-5 space-y-4">
            <div className="space-y-1">
              <label htmlFor="np" className="text-[10px] font-mono uppercase tracking-widest text-ws-mist">
                Nouveau mot de passe
              </label>
              <div className="relative">
                <input
                  id="np"
                  type={show ? 'text' : 'password'}
                  autoComplete="new-password"
                  autoFocus
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input w-full text-sm pr-11"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-ws-mist hover:text-ws-paper"
                  aria-label={show ? 'Masquer' : 'Afficher'}
                  tabIndex={-1}
                >
                  {show ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label htmlFor="cp" className="text-[10px] font-mono uppercase tracking-widest text-ws-mist">
                Confirmer
              </label>
              <input
                id="cp"
                type={show ? 'text' : 'password'}
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="input w-full text-sm"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-200 text-sm">
                <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-b from-ws-accent-soft to-ws-accent text-ws-void font-semibold tracking-wide hover:brightness-110 active:scale-[0.98] transition-all border border-white/15 disabled:opacity-60"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Mettre à jour'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
