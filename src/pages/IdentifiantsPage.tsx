import { useMemo, useState } from 'react';
import {
  KeyRound,
  Plus,
  Trash2,
  FolderKanban,
  AlertCircle,
  Check,
  Copy,
  Mail,
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
import { useProjects } from '../hooks/useProjects';
import { formatDate } from '../lib/utils';
import type { PortalUser } from '../lib/types';

function generatePassword(length = 14): string {
  const alphabet = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!?@#$%';
  let out = '';
  const array = new Uint32Array(length);
  crypto.getRandomValues(array);
  for (let i = 0; i < length; i += 1) {
    out += alphabet[array[i] % alphabet.length];
  }
  return out;
}

export function IdentifiantsPage() {
  const { users, loading, error, createUser, deleteUser, updateProject } = usePortalUsers();
  const projectsHook = useProjects();

  const [isCreating, setIsCreating] = useState(false);
  const [form, setForm] = useState({
    email: '',
    name: '',
    password: generatePassword(),
    projectId: '',
  });
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [lastCreated, setLastCreated] = useState<{
    email: string;
    password: string;
    name: string | null;
  } | null>(null);
  const [toDelete, setToDelete] = useState<PortalUser | null>(null);
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const expandedUser = expandedUserId ? users.find((u) => u.id === expandedUserId) ?? null : null;

  const activeProjects = useMemo(
    () =>
      projectsHook.projects
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' })),
    [projectsHook.projects]
  );

  const openCreate = () => {
    setForm({ email: '', name: '', password: generatePassword(), projectId: '' });
    setFormError(null);
    setLastCreated(null);
    setIsCreating(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!form.email.trim()) return setFormError('Email obligatoire');
    if (form.password.length < 8) return setFormError('Mot de passe : 8 caractères minimum');
    if (!form.projectId) return setFormError('Sélectionnez un projet');
    setBusy(true);
    try {
      await createUser({
        email: form.email,
        password: form.password,
        name: form.name,
        projectId: form.projectId,
      });
      setLastCreated({
        email: form.email.trim().toLowerCase(),
        password: form.password,
        name: form.name || null,
      });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Erreur lors de la création');
    } finally {
      setBusy(false);
    }
  };

  const copyCredentials = async () => {
    if (!lastCreated) return;
    const body = `Accès à votre espace projet MAPA\n\nEmail : ${lastCreated.email}\nMot de passe : ${lastCreated.password}\n\nLien : (URL de votre espace client)`;
    try {
      await navigator.clipboard.writeText(body);
    } catch {
      /* noop */
    }
  };

  return (
    <div>
      <Header
        title="Identifiants clients"
        subtitle="Comptes d'accès au portail de suivi projet"
        actions={
          <Button icon={<Plus size={16} />} onClick={openCreate} className="normal-case tracking-normal">
            Nouvel identifiant
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
            description="Créez un compte d'accès pour qu'un client puisse suivre l'avancement de son projet."
            action={{ label: 'Créer le premier identifiant', onClick: openCreate }}
          />
        ) : (
          <div className="rounded-2xl border border-ws-line bg-ws-panel/60 overflow-hidden">
            <div className="hidden md:grid grid-cols-[1.4fr_1fr_1.4fr_0.8fr_auto_auto] gap-4 px-5 py-3 text-[10px] font-mono uppercase tracking-[0.2em] text-ws-mist border-b border-ws-line bg-ws-deep/30">
              <span>Email</span>
              <span>Nom</span>
              <span>Projet</span>
              <span>Créé</span>
              <span></span>
              <span className="text-right">Actions</span>
            </div>
            <ul className="divide-y divide-ws-line">
              {users.map((u) => (
                <li
                  key={u.id}
                  className="grid grid-cols-1 md:grid-cols-[1.4fr_1fr_1.4fr_0.8fr_auto_auto] gap-2 md:gap-4 px-4 md:px-5 py-4 md:py-3 items-start md:items-center hover:bg-ws-raised/40 transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Mail size={14} className="text-ws-accent flex-shrink-0" />
                    <span className="text-sm text-ws-paper font-mono truncate">{u.email}</span>
                  </div>
                  <div className="text-sm text-ws-ink truncate">
                    {u.name || <span className="text-ws-mist italic">—</span>}
                  </div>
                  <div className="min-w-0">
                    <select
                      value={u.project_id ?? ''}
                      onChange={(e) => {
                        void updateProject(u.id, e.target.value || null);
                      }}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-ws-deep/40 border border-ws-line hover:border-ws-accent/40 text-ws-paper focus:outline-none focus:ring-2 focus:ring-ws-accent/30"
                    >
                      <option value="">— Sans projet —</option>
                      {activeProjects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="text-xs text-ws-mist font-mono">{formatDate(u.created_at)}</div>
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
              ))}
            </ul>
          </div>
        )}
      </div>

      <Modal
        isOpen={isCreating}
        onClose={() => setIsCreating(false)}
        title={lastCreated ? 'Compte créé' : 'Nouvel identifiant client'}
        size="md"
      >
        {lastCreated ? (
          <div className="space-y-5">
            <div className="flex items-start gap-3 p-4 rounded-2xl bg-ws-accent/10 border border-ws-accent/30">
              <Check size={18} className="text-ws-accent mt-0.5 flex-shrink-0" />
              <div className="text-sm text-ws-paper">
                Compte créé avec succès. Transmettez les identifiants ci-dessous au client (par email, SMS, etc.).
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-[0.2em] text-ws-mist mb-1">
                  Email
                </label>
                <div className="px-4 py-3 rounded-xl bg-ws-deep/50 border border-ws-line text-ws-paper font-mono text-sm">
                  {lastCreated.email}
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-[0.2em] text-ws-mist mb-1">
                  Mot de passe
                </label>
                <div className="px-4 py-3 rounded-xl bg-ws-deep/50 border border-ws-line text-ws-paper font-mono text-sm select-all">
                  {lastCreated.password}
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="secondary" icon={<Copy size={14} />} onClick={copyCredentials} className="normal-case tracking-normal flex-1">
                  Copier les identifiants
                </Button>
                <Button onClick={() => setIsCreating(false)} className="normal-case tracking-normal">
                  Fermer
                </Button>
              </div>
              <p className="text-[11px] text-ws-mist font-mono leading-relaxed pt-2">
                ⚠ Le mot de passe ne sera plus affiché après fermeture. Conservez-le en lieu sûr ou renvoyez-le au client immédiatement.
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
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
                Mot de passe *
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="flex-1 px-4 py-3 rounded-xl bg-ws-deep/50 border border-ws-line text-ws-paper font-mono focus:outline-none focus:border-ws-accent"
                  minLength={8}
                  required
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setForm({ ...form, password: generatePassword() })}
                  className="normal-case tracking-normal"
                >
                  Régénérer
                </Button>
              </div>
              <p className="text-[11px] text-ws-mist font-mono mt-1.5">
                8 caractères minimum. Auto-généré par défaut.
              </p>
            </div>
            <div>
              <label className="block text-[10px] font-mono uppercase tracking-[0.2em] text-ws-mist mb-1.5">
                Projet assigné *
              </label>
              <div className="relative">
                <FolderKanban
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-ws-mist pointer-events-none"
                />
                <select
                  value={form.projectId}
                  onChange={(e) => setForm({ ...form, projectId: e.target.value })}
                  className="w-full pl-9 pr-4 py-3 rounded-xl bg-ws-deep/50 border border-ws-line text-ws-paper focus:outline-none focus:border-ws-accent appearance-none"
                  required
                >
                  <option value="">— Sélectionner un projet —</option>
                  {activeProjects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
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
                Créer le compte
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
          projects={projectsHook.projects}
          onClose={() => setExpandedUserId(null)}
          onChangeProject={updateProject}
        />
      )}
    </div>
  );
}
