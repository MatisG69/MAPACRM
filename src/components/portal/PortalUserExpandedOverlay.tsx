import { useEffect } from 'react';
import { X, KeyRound, Mail, FolderKanban, Calendar } from 'lucide-react';
import type { PortalUser, Project } from '../../lib/types';
import { ClientPortalSection } from '../projects/ClientPortalSection';
import { formatDate } from '../../lib/utils';

interface PortalUserExpandedOverlayProps {
  user: PortalUser;
  projects: Project[];
  onClose: () => void;
  onChangeProject: (userId: string, projectId: string | null) => Promise<void>;
}

/**
 * Vue plein écran d'un identifiant client — même traitement visuel que
 * RevenueExpandedOverlay : fixed inset-0, grille dorée de fond, header avec
 * eyebrow « Vue élargie » + bouton X, ESC pour fermer.
 *
 * Contient :
 *  - Bandeau identité (email, nom, projet + switch)
 *  - ClientPortalSection : timeline projet (ajout/édition/statut/réorganisation)
 *    + messagerie bidirectionnelle realtime
 */
export function PortalUserExpandedOverlay({
  user,
  projects,
  onClose,
  onChangeProject,
}: PortalUserExpandedOverlayProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  const linkedProject = projects.find((p) => p.id === user.project_id) ?? null;

  return (
    <div
      className="fixed inset-0 z-[100] flex min-h-0 max-h-[100dvh] flex-col bg-ws-void/97 pt-[env(safe-area-inset-top)] backdrop-blur-xl"
      role="dialog"
      aria-modal="true"
      aria-labelledby="portal-user-expanded-title"
    >
      {/* Grille dorée de fond */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        aria-hidden
        style={{
          backgroundImage: `linear-gradient(rgba(175, 112, 55, 0.4) 1px, transparent 1px),
            linear-gradient(90deg, rgba(175, 112, 55, 0.3) 1px, transparent 1px)`,
          backgroundSize: '32px 32px',
        }}
      />

      {/* Header */}
      <header className="relative flex flex-shrink-0 items-start justify-between gap-3 border-b border-white/[0.08] px-3 py-3 sm:items-center sm:gap-4 sm:px-4 sm:py-4 md:px-8 md:py-5">
        <div className="flex min-w-0 flex-1 items-start gap-3 sm:items-center sm:gap-4">
          <div className="hidden h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl border border-ws-accent/35 bg-ws-accent/15 shadow-glow-sm sm:flex md:h-12 md:w-12">
            <KeyRound className="h-5 w-5 text-ws-accent-soft md:h-6 md:w-6" strokeWidth={2} />
          </div>
          <div className="min-w-0 flex-1 pr-1">
            <p className="ws-section-title mb-0.5 sm:mb-1">Vue élargie · Espace client</p>
            <h2
              id="portal-user-expanded-title"
              className="break-words font-display text-lg font-bold leading-tight text-ws-paper sm:text-xl md:text-2xl"
            >
              {user.name || user.email}
            </h2>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl border border-white/[0.1] bg-ws-panel/80 text-ws-paper transition-colors hover:bg-ws-raised hover:border-ws-accent/30 touch-manipulation"
          aria-label="Réduire la fenêtre"
        >
          <X size={20} strokeWidth={2} />
        </button>
      </header>

      {/* Body scrollable */}
      <div className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:px-4 sm:py-6 md:px-8 md:py-10 md:pb-10 scrollbar-ws">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Bandeau identité */}
          <section className="relative overflow-hidden rounded-2xl border border-ws-line bg-gradient-to-br from-ws-panel/80 via-ws-deep/70 to-ws-void p-5 md:p-7">
            <div
              className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full opacity-40"
              style={{
                background: 'radial-gradient(circle, rgba(175,112,55,0.25) 0%, transparent 70%)',
              }}
              aria-hidden
            />
            <div className="relative grid gap-5 md:grid-cols-3">
              <div className="md:col-span-2 space-y-3">
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-ws-gold">
                  Identifiant client
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  <Mail size={14} className="text-ws-accent flex-shrink-0" />
                  <span className="font-mono text-sm text-ws-paper break-all">{user.email}</span>
                </div>
                {user.name && (
                  <p className="text-base text-ws-paper font-medium">{user.name}</p>
                )}
                <p className="text-xs font-mono text-ws-mist flex items-center gap-2">
                  <Calendar size={12} />
                  Compte créé le {formatDate(user.created_at)}
                </p>
              </div>
              <div className="md:col-span-1">
                <label className="block text-[10px] font-mono uppercase tracking-[0.25em] text-ws-mist mb-2">
                  Projet assigné
                </label>
                <div className="relative">
                  <FolderKanban
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-ws-mist pointer-events-none"
                  />
                  <select
                    value={user.project_id ?? ''}
                    onChange={(e) => {
                      void onChangeProject(user.id, e.target.value || null);
                    }}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-ws-deep/60 border border-ws-line hover:border-ws-accent/40 text-ws-paper text-sm focus:outline-none focus:border-ws-accent appearance-none"
                  >
                    <option value="">— Sans projet —</option>
                    {projects
                      .slice()
                      .sort((a, b) =>
                        a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' })
                      )
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                  </select>
                </div>
                {linkedProject?.site_url && (
                  <a
                    href={linkedProject.site_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 mt-2 text-[11px] font-mono text-ws-accent hover:text-ws-accent-soft transition-colors"
                  >
                    Aperçu site →
                  </a>
                )}
              </div>
            </div>
          </section>

          {/* Contenu principal : étapes + messagerie */}
          {user.project_id ? (
            <ClientPortalSection projectId={user.project_id} />
          ) : (
            <div className="rounded-2xl border border-ws-line bg-ws-panel/60 p-10 text-center">
              <p className="text-sm text-ws-mist">
                Aucun projet n'est rattaché à ce compte. Sélectionnez un projet ci-dessus pour
                démarrer le suivi.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
