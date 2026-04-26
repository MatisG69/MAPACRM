import { useMemo, useState } from 'react';
import {
  KeyRound,
  Plus,
  Trash2,
  Building2,
  AlertCircle,
  Check,
  Mail,
  Copy,
  Loader2,
  Maximize2,
} from 'lucide-react';
import { PortalUserExpandedOverlay } from '../components/portal/PortalUserExpandedOverlay';
import { Header } from '../components/layout/Header';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { EmptyState } from '../components/ui/EmptyState';
import { usePortalUsers } from '../hooks/usePortalUsers';
import { useClients } from '../hooks/useClients';
import { useProjects } from '../hooks/useProjects';
import { formatDate } from '../lib/utils';
import type { PortalUser } from '../lib/types';

const PORTAL_URL =
  ((import.meta.env.VITE_PORTAL_URL as string | undefined)?.trim() ||
    'https://space-client-mapa.vercel.app');

export function IdentifiantsPage() {
  const { users, loading, error, inviteUser, deleteUser, updateClient } = usePortalUsers();
  const clientsHook = useClients();
  const projectsHook = useProjects();

  const [isCreating, setIsCreating] = useState(false);
  const [form, setForm] = useState({
    email: '',
    name: '',
    clientId: '',
  });
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [lastInvited, setLastInvited] = useState<{
    email: string;
    name: string | null;
  } | null>(null);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<PortalUser | null>(null);
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const expandedUser = expandedUserId ? users.find((u) => u.id === expandedUserId) ?? null : null;

  const copyAccessInstructions = async (email: string) => {
    const body = `Bonjour,\n\nVotre espace de suivi projet MAPA Développement est prêt.\n\n→ Espace client : ${PORTAL_URL}\n→ Email : ${email}\n\nCliquez sur « Première connexion » et choisissez votre mot de passe.\n\n— MAPA Développement`;
    try {
      await navigator.clipboard.writeText(body);
      setCopyFeedback('Message copié dans le presse-papiers');
      setTimeout(() => setCopyFeedback(null), 3000);
    } catch {
      setCopyFeedback('Impossible de copier');
      setTimeout(() => setCopyFeedback(null), 3000);
    }
  };

  const sortedClients = useMemo(
    () =>
      clientsHook.clients
        .slice()
        .sort((a, b) =>
          (a.company || a.name).localeCompare(b.company || b.name, 'fr', { sensitivity: 'base' })
        ),
    [clientsHook.clients]
  );

  /** Compte le nombre de projets associés à un client (affichage informatif). */
  const projectCountByClient = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of projectsHook.projects) {
      if (!p.client_id) continue;
      map.set(p.client_id, (map.get(p.client_id) ?? 0) + 1);
    }
    return map;
  }, [projectsHook.projects]);

  const openCreate = () => {
    setForm({ email: '', name: '', clientId: '' });
    setFormError(null);
    setLastInvited(null);
    setIsCreating(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!form.email.trim()) return setFormError('Email obligatoire');
    if (!form.clientId) return setFormError('Sélectionnez un client');
    setBusy(true);
    try {
      await inviteUser({
        email: form.email,
        name: form.name,
        clientId: form.clientId,
      });
      setLastInvited({
        email: form.email.trim().toLowerCase(),
        name: form.name || null,
      });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Erreur lors de la pré-autorisation');
    } finally {
      setBusy(false);
    }
  };


  return (
    <div>
      <Header
        title="Identifiants clients"
        subtitle="Pré-autorisez un email — le client définit son mot de passe à la première connexion"
        actions={
          <Button icon={<Plus size={16} />} onClick={openCreate} className="normal-case tracking-normal">
            Pré-autoriser un client
          </Button>
        }
      />

      <div className="px-4 md:px-8 py-5 md:py-6 space-y-4">
        {error && (
          <div className="flex items-start gap-3 p-4 rounded-2xl bg-ws-bear-dim border border-red-500/30 text-red-200 text-sm">
            <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
            <span className="font-mono">{error}</span>
          </div>
        )}

        {loading && users.length === 0 ? (
          <div className="flex items-center gap-3 text-ws-mist text-sm font-mono py-12 justify-center">
            <Loader2 size={16} className="animate-spin" />
            Chargement…
          </div>
        ) : users.length === 0 ? (
          <EmptyState
            icon={<KeyRound size={28} />}
            title="Aucun identifiant pour l'instant"
            description="Pré-autorisez l'email d'un client. Il se rendra ensuite sur l'espace client et choisira lui-même son mot de passe pour activer son accès."
            action={{ label: 'Pré-autoriser le premier client', onClick: openCreate }}
          />
        ) : (
          <div className="rounded-2xl border border-ws-line bg-ws-panel/60 overflow-hidden">
            <div className="hidden md:grid grid-cols-[1.4fr_1fr_1.4fr_0.8fr_auto_auto_auto] gap-4 px-5 py-3 text-[10px] font-mono uppercase tracking-[0.2em] text-ws-mist border-b border-ws-line bg-ws-deep/30">
              <span>Email</span>
              <span>Nom</span>
              <span>Client</span>
              <span>Créé</span>
              <span></span>
              <span></span>
              <span className="text-right">Actions</span>
            </div>
            <ul className="divide-y divide-ws-line">
              {users.map((u) => {
                const pending = !u.auth_user_id;
                return (
                  <li
                    key={u.id}
                    className="grid grid-cols-1 md:grid-cols-[1.4fr_1fr_1.4fr_0.8fr_auto_auto_auto] gap-2 md:gap-4 px-4 md:px-5 py-4 md:py-3 items-start md:items-center hover:bg-ws-raised/40 transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Mail size={14} className="text-ws-accent flex-shrink-0" />
                      <div className="min-w-0">
                        <span className="text-sm text-ws-paper font-mono truncate block">{u.email}</span>
                        {pending ? (
                          <span className="inline-flex items-center gap-1 text-[9px] font-mono uppercase tracking-[0.18em] text-amber-300/90 mt-0.5">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-400/80" />
                            En attente de première connexion
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[9px] font-mono uppercase tracking-[0.18em] text-emerald-300/90 mt-0.5">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400/80" />
                            Compte actif
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-sm text-ws-ink truncate">
                      {u.name || <span className="text-ws-mist italic">—</span>}
                    </div>
                    <div className="min-w-0">
                      <select
                        value={u.client_id ?? ''}
                        onChange={(e) => {
                          void updateClient(u.id, e.target.value || null);
                        }}
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-ws-deep/40 border border-ws-line hover:border-ws-accent/40 text-ws-paper focus:outline-none focus:ring-2 focus:ring-ws-accent/30"
                      >
                        <option value="">— Sans client —</option>
                        {sortedClients.map((c) => {
                          const count = projectCountByClient.get(c.id) ?? 0;
                          return (
                            <option key={c.id} value={c.id}>
                              {c.company || c.name}
                              {count > 0 ? ` (${count} projet${count > 1 ? 's' : ''})` : ''}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                    <div className="text-xs text-ws-mist font-mono">{formatDate(u.created_at)}</div>
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => void copyAccessInstructions(u.email)}
                        className="flex h-9 items-center gap-1.5 px-3 rounded-xl border border-ws-line bg-ws-panel/70 text-xs font-mono text-ws-mist transition-all hover:border-ws-accent/40 hover:text-ws-paper touch-manipulation"
                        aria-label={`Copier les instructions d'accès pour ${u.email}`}
                        title="Copier le message à transmettre au client (URL portail + email)"
                      >
                        <Copy size={14} />
                        <span className="hidden lg:inline">Copier l'accès</span>
                      </button>
                    </div>
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => setExpandedUserId(u.id)}
                        className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.1] bg-ws-panel/70 text-ws-gold transition-all hover:border-ws-accent/40 hover:bg-ws-accent/15 hover:text-ws-paper touch-manipulation"
                        aria-label={`Vue plein écran - ${u.email}`}
                        title="Vue plein écran"
                      >
                        <Maximize2 size={16} strokeWidth={2} />
                      </button>
                    </div>
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => setToDelete(u)}
                        className="p-2 rounded-lg text-ws-mist hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        aria-label={`Supprimer ${u.email}`}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>

      <Modal
        isOpen={isCreating}
        onClose={() => setIsCreating(false)}
        title={lastInvited ? 'Identifiant pré-autorisé' : 'Pré-autoriser un client'}
        size="md"
      >
        {lastInvited ? (
          <div className="space-y-5">
            <div className="flex items-start gap-3 p-4 rounded-2xl bg-ws-accent/10 border border-ws-accent/30">
              <Check size={18} className="text-ws-accent mt-0.5 flex-shrink-0" />
              <div className="text-sm text-ws-paper">
                L'email <strong className="text-ws-accent">{lastInvited.email}</strong> est désormais
                pré-autorisé sur l'espace client. Aucun email n'a été envoyé : transmettez vous-même
                l'URL et l'email au client (par message, appel, en personne…).
              </div>
            </div>
            <div className="rounded-2xl border border-ws-line bg-ws-deep/40 p-4 space-y-3">
              <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-ws-mist">
                À transmettre au client
              </div>
              <div>
                <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-ws-mist mb-1">
                  Espace client
                </div>
                <div className="px-3 py-2 rounded-lg bg-ws-deep/60 border border-ws-line text-ws-paper font-mono text-sm break-all">
                  {PORTAL_URL}
                </div>
              </div>
              <div>
                <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-ws-mist mb-1">
                  Email pré-autorisé
                </div>
                <div className="px-3 py-2 rounded-lg bg-ws-deep/60 border border-ws-line text-ws-paper font-mono text-sm break-all">
                  {lastInvited.email}
                </div>
              </div>
              <p className="text-[11px] text-ws-mist font-mono leading-relaxed">
                Le client choisit l'onglet « Première connexion », saisit cet email et définit
                lui-même son mot de passe.
              </p>
            </div>
            <div className="flex gap-2 pt-1">
              <Button
                variant="secondary"
                icon={<Copy size={14} />}
                onClick={() => void copyAccessInstructions(lastInvited.email)}
                className="normal-case tracking-normal flex-1"
              >
                Copier le message complet
              </Button>
              <Button onClick={() => setIsCreating(false)} className="normal-case tracking-normal">
                Fermer
              </Button>
            </div>
            {copyFeedback && (
              <p className="text-[11px] text-emerald-300 font-mono text-center">{copyFeedback}</p>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-start gap-3 p-4 rounded-2xl bg-ws-deep/40 border border-ws-line">
              <Mail size={16} className="text-ws-accent mt-0.5 flex-shrink-0" />
              <p className="text-xs text-ws-ink leading-relaxed">
                Vous pré-autorisez l'email du client. <strong className="text-ws-paper">Aucun email
                ne sera envoyé.</strong> Le client se rend lui-même sur l'espace client, choisit
                « Première connexion » et définit son propre mot de passe.
              </p>
            </div>

            <div>
              <label className="block text-[10px] font-mono uppercase tracking-[0.2em] text-ws-mist mb-1.5">
                Email du client *
              </label>
              <input
                type="email"
                autoComplete="off"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-ws-deep/50 border border-ws-line text-ws-paper focus:outline-none focus:border-ws-accent placeholder:text-ws-mist/60"
                placeholder="client@exemple.fr"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono uppercase tracking-[0.2em] text-ws-mist mb-1.5">
                Nom (facultatif)
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-ws-deep/50 border border-ws-line text-ws-paper focus:outline-none focus:border-ws-accent placeholder:text-ws-mist/60"
                placeholder="Jean Dupont"
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono uppercase tracking-[0.2em] text-ws-mist mb-1.5">
                Client *
              </label>
              <div className="relative">
                <Building2
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-ws-mist pointer-events-none"
                />
                <select
                  value={form.clientId}
                  onChange={(e) => setForm({ ...form, clientId: e.target.value })}
                  className="w-full pl-9 pr-4 py-3 rounded-xl bg-ws-deep/50 border border-ws-line text-ws-paper focus:outline-none focus:border-ws-accent appearance-none"
                  required
                >
                  <option value="">— Sélectionner un client —</option>
                  {sortedClients.map((c) => {
                    const count = projectCountByClient.get(c.id) ?? 0;
                    return (
                      <option key={c.id} value={c.id}>
                        {c.company || c.name}
                        {count > 0 ? ` · ${count} projet${count > 1 ? 's' : ''}` : ' · aucun projet'}
                      </option>
                    );
                  })}
                </select>
              </div>
              <p className="text-[11px] text-ws-mist/80 mt-1.5 leading-relaxed">
                L'identifiant donne accès à <strong className="text-ws-paper">tous les projets</strong>{' '}
                de ce client présents et à venir.
              </p>
            </div>

            {formError && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-ws-bear-dim border border-red-500/30 text-red-200 text-sm">
                <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setIsCreating(false)}
                className="normal-case tracking-normal"
              >
                Annuler
              </Button>
              <Button type="submit" loading={busy} className="normal-case tracking-normal flex-1">
                Pré-autoriser l'accès
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {toDelete && (
        <ConfirmDialog
          isOpen={true}
          onClose={() => setToDelete(null)}
          onConfirm={async () => {
            await deleteUser(toDelete.id);
            setToDelete(null);
          }}
          title="Supprimer cet identifiant ?"
          description={`Le compte ${toDelete.email} ne pourra plus se connecter. L'utilisateur Supabase Auth associé reste présent (à supprimer manuellement depuis le dashboard Supabase si besoin).`}
        />
      )}

      {expandedUser && (
        <PortalUserExpandedOverlay
          user={expandedUser}
          clients={sortedClients}
          projects={projectsHook.projects}
          onClose={() => setExpandedUserId(null)}
          onChangeClient={updateClient}
        />
      )}
    </div>
  );
}
