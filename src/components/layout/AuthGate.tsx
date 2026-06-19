import { useState, useEffect, type FormEvent, type ReactNode } from 'react';
import { Lock, AlertCircle, Eye, EyeOff, Loader2 } from 'lucide-react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';

/**
 * Verrou d'accès au CRM via authentification Supabase (email + mot de passe).
 *
 * Une vraie session `authenticated` est ouverte : c'est elle qui porte les
 * droits RLS côté base (politiques admin). Le client Supabase attache
 * automatiquement le JWT à toutes les requêtes une fois connecté.
 *
 * Si Supabase n'est pas configuré (mode local), le verrou est neutre.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!supabase) {
      setChecking(false);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setChecking(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Mode local (pas de Supabase) : aucune auth possible, accès direct.
  if (!supabase) return <>{children}</>;

  if (checking) {
    return (
      <div className="min-h-[100dvh] min-h-screen flex items-center justify-center bg-ws-mystic bg-ws-vignette bg-ws-noise">
        <Loader2 className="h-6 w-6 text-ws-accent-soft animate-spin" />
      </div>
    );
  }

  if (session) return <>{children}</>;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setSubmitting(true);
    setError(null);
    const { error: err } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setSubmitting(false);
    if (err) {
      setError('Email ou mot de passe incorrect.');
      setPassword('');
    }
    // Succès : onAuthStateChange met à jour la session et affiche le CRM.
  };

  return (
    <div className="min-h-[100dvh] min-h-screen flex items-center justify-center px-4 py-12 bg-ws-mystic bg-ws-vignette bg-ws-noise">
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
            MAPA CRM
          </h1>
          <p className="text-sm text-ws-mist mt-3 max-w-xs leading-relaxed">
            Connecte-toi pour accéder au CRM.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label
              htmlFor="crm-email"
              className="block text-[10px] font-mono uppercase tracking-[0.25em] text-ws-mist mb-2"
            >
              Email
            </label>
            <input
              id="crm-email"
              type="email"
              autoComplete="username"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-ws-deep/60 border border-ws-line text-ws-paper font-mono focus:outline-none focus:border-ws-accent placeholder:text-ws-mist/40"
              placeholder="email@exemple.com"
            />
          </div>

          <div>
            <label
              htmlFor="crm-pwd"
              className="block text-[10px] font-mono uppercase tracking-[0.25em] text-ws-mist mb-2"
            >
              Mot de passe
            </label>
            <div className="relative">
              <input
                id="crm-pwd"
                type={show ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
            disabled={submitting}
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-gradient-to-b from-ws-accent-soft to-ws-accent text-ws-void font-semibold tracking-wide hover:brightness-110 active:scale-[0.98] transition-all shadow-glow-sm border border-white/15 disabled:opacity-60"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Se connecter'}
          </button>
        </div>
      </form>
    </div>
  );
}
