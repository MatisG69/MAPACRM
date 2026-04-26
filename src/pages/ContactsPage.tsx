import { useMemo, useState } from 'react';
import {
  Phone,
  Mail,
  Building2,
  Globe,
  MessageSquare,
  FolderKanban,
  Star,
  ExternalLink,
  Sparkles,
  UserPlus,
  X,
  Search,
} from 'lucide-react';
import { Header } from '../components/layout/Header';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { EmptyState } from '../components/ui/EmptyState';
import { CLIENT_CARD_STRIP, clientMatchesStatusFilter } from '../lib/clientStatus';
import type { Client, ClientStatus, Interaction, Page, Project } from '../lib/types';
import { getInitials, formatDate } from '../lib/utils';

type FilterStatus = ClientStatus | 'all';
type FilterFeedback = 'all' | 'with' | 'without';

const STORAGE_KEY = 'mapacrm_contact_list';

function loadContactIds(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

function saveContactIds(ids: Set<string>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
}

interface ContactsPageProps {
  clients: Client[];
  interactions: Interaction[];
  projects: Project[];
  onUpdateClient: (id: string, data: Partial<Client>) => Promise<Client>;
  onNavigate: (page: Page, id?: string) => void;
}

function Stars({ value }: { value: number | null }) {
  if (value == null) {
    return <span className="text-[10px] font-mono text-ws-mist/70 uppercase tracking-wider">Non noté</span>;
  }
  return (
    <div className="flex items-center gap-0.5" aria-label={`Satisfaction ${value} sur 5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          size={14}
          strokeWidth={2}
          className={i < value ? 'text-ws-gold fill-ws-gold/35' : 'text-ws-mist/25'}
        />
      ))}
      <span className="ml-1.5 text-xs font-mono tabular-nums text-ws-gold">{value}/5</span>
    </div>
  );
}

export function ContactsPage({
  clients,
  interactions,
  projects,
  onUpdateClient,
  onNavigate,
}: ContactsPageProps) {
  const [contactIds, setContactIds] = useState<Set<string>>(loadContactIds);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const [feedbackFilter, setFeedbackFilter] = useState<FilterFeedback>('all');
  const [editClient, setEditClient] = useState<Client | null>(null);
  const [saving, setSaving] = useState(false);
  const [draftRating, setDraftRating] = useState<number | null>(null);
  const [draftFeedback, setDraftFeedback] = useState('');
  const [showPicker, setShowPicker] = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');

  const addContact = (id: string) => {
    setContactIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      saveContactIds(next);
      return next;
    });
  };

  const removeContact = (id: string) => {
    setContactIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      saveContactIds(next);
      return next;
    });
  };

  const contactClients = useMemo(
    () => clients.filter((c) => contactIds.has(c.id)),
    [clients, contactIds]
  );

  const availableClients = useMemo(() => {
    const q = pickerSearch.trim().toLowerCase();
    return clients.filter((c) => {
      if (contactIds.has(c.id)) return false;
      if (!q) return true;
      return [c.name, c.company, c.email, c.city].some((f) => f?.toLowerCase().includes(q));
    });
  }, [clients, contactIds, pickerSearch]);

  const byClient = useMemo(() => {
    const map = new Map<string, { count: number; last: Interaction | null; projects: number }>();
    for (const c of contactClients) {
      map.set(c.id, { count: 0, last: null, projects: 0 });
    }
    for (const i of interactions) {
      const cur = map.get(i.client_id);
      if (!cur) continue;
      cur.count += 1;
      const t = new Date(i.date).getTime();
      if (!cur.last || t > new Date(cur.last.date).getTime()) cur.last = i;
    }
    for (const p of projects) {
      if (!p.client_id) continue;
      const cur = map.get(p.client_id);
      if (cur) cur.projects += 1;
    }
    return map;
  }, [contactClients, interactions, projects]);

  const stats = useMemo(() => {
    const withPhone = contactClients.filter((c) => c.phone?.trim()).length;
    const rated = contactClients.filter((c) => c.satisfaction_rating != null).length;
    const withFb = contactClients.filter((c) => c.feedback?.trim()).length;
    const sum = contactClients.reduce((s, c) => s + (c.satisfaction_rating ?? 0), 0);
    const avg = rated ? (sum / rated).toFixed(1) : '—';
    return { withPhone, rated, withFb, avg, total: contactClients.length };
  }, [contactClients]);

  const filtered = useMemo(() => {
    return contactClients.filter((c) => {
      if (!clientMatchesStatusFilter(c.status, statusFilter)) return false;
      if (feedbackFilter === 'with' && !c.feedback?.trim()) return false;
      if (feedbackFilter === 'without' && c.feedback?.trim()) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return [c.name, c.company, c.email, c.phone, c.city, c.feedback].some((f) =>
        f?.toLowerCase().includes(q)
      );
    });
  }, [contactClients, search, statusFilter, feedbackFilter]);

  const openEdit = (c: Client) => {
    setEditClient(c);
    setDraftRating(c.satisfaction_rating);
    setDraftFeedback(c.feedback || '');
  };

  const saveEdit = async () => {
    if (!editClient) return;
    setSaving(true);
    try {
      await onUpdateClient(editClient.id, {
        satisfaction_rating: draftRating,
        feedback: draftFeedback.trim() || null,
      });
      setEditClient(null);
    } finally {
      setSaving(false);
    }
  };

  const telHref = (phone: string) => {
    const digits = phone.replace(/[^\d+]/g, '');
    return `tel:${digits}`;
  };

  return (
    <div>
      <Header
        title="Contacts & retours"
        subtitle="Clients fidélisés · bouche à oreille · témoignages · recontact"
        searchValue={search}
        onSearchChange={setSearch}
        actions={
          <Button
            icon={<UserPlus size={16} />}
            className="normal-case tracking-normal"
            onClick={() => {
              setPickerSearch('');
              setShowPicker(true);
            }}
          >
            Ajouter un contact
          </Button>
        }
      />

      <div className="px-4 py-4 md:p-8 bg-ws-deep/20 min-h-[calc(100vh-120px)]">
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3 mb-8">
          <div className="ws-card rounded-xl p-4 border-ws-line/80">
            <p className="text-[10px] font-mono uppercase tracking-widest text-ws-mist mb-1">Contacts</p>
            <p className="text-2xl font-display font-bold text-ws-cream tabular-nums">{stats.total}</p>
          </div>
          <div className="ws-card rounded-xl p-4 border-ws-line/80">
            <p className="text-[10px] font-mono uppercase tracking-widest text-ws-mist mb-1">Avec téléphone</p>
            <p className="text-2xl font-display font-bold text-ws-paper tabular-nums">{stats.withPhone}</p>
          </div>
          <div className="ws-card rounded-xl p-4 border-ws-line/80">
            <p className="text-[10px] font-mono uppercase tracking-widest text-ws-mist mb-1">Notés</p>
            <p className="text-2xl font-display font-bold text-ws-bull tabular-nums">{stats.rated}</p>
          </div>
          <div className="ws-card rounded-xl p-4 border-ws-line/80">
            <p className="text-[10px] font-mono uppercase tracking-widest text-ws-mist mb-1">Témoignages</p>
            <p className="text-2xl font-display font-bold text-ws-accent-soft tabular-nums">{stats.withFb}</p>
          </div>
          <div className="ws-card rounded-xl p-4 border-ws-line/80">
            <p className="text-[10px] font-mono uppercase tracking-widest text-ws-mist mb-1">Moy. satisfaction</p>
            <p className="text-2xl font-display font-bold text-ws-gold tabular-nums">{stats.avg}</p>
          </div>
        </div>

        {contactClients.length > 0 && (
          <div className="flex flex-col lg:flex-row gap-3 mb-6">
            <input
              type="search"
              placeholder="Rechercher nom, société, email, téléphone, ville, retour…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input flex-1 font-mono text-xs"
              enterKeyHint="search"
            />
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ['all', 'Tous'],
                  ['prospect', 'Pistes'],
                  ['telephoned', 'Téléphoné'],
                  ['in_discussion', 'Contacté'],
                  ['interested', 'Intéressé'],
                  ['quote_sent', 'Devis envoyé'],
                  ['not_interested', 'Pas intéressé'],
                ] as const
              ).map(([v, label]) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setStatusFilter(v)}
                  className={`pill-filter ${statusFilter === v ? 'pill-filter-active' : 'pill-filter-idle'}`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ['all', 'Tous retours'],
                  ['with', 'Avec témoignage'],
                  ['without', 'Sans témoignage'],
                ] as const
              ).map(([v, label]) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setFeedbackFilter(v)}
                  className={`pill-filter ${feedbackFilter === v ? 'pill-filter-active' : 'pill-filter-idle'}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        {contactClients.length === 0 ? (
          <EmptyState
            icon={<Sparkles size={28} />}
            title="Aucun contact ajouté"
            description="Ajoutez vos clients fidélisés pour constituer votre réseau de bouche à oreille et suivre leur satisfaction."
            action={{ label: 'Ajouter un contact', onClick: () => { setPickerSearch(''); setShowPicker(true); } }}
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Sparkles size={28} />}
            title="Aucun résultat"
            description="Affinez les filtres ou la recherche."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {filtered.map((c) => {
              const meta = byClient.get(c.id) ?? { count: 0, last: null, projects: 0 };
              return (
                <article
                  key={c.id}
                  className={`ws-card rounded-2xl p-5 border border-ws-line/50 border-l-[3px] flex flex-col min-w-0 shadow-[0_20px_50px_-28px_rgba(0,0,0,0.85)] ${CLIENT_CARD_STRIP[c.status]}`}
                >
                  <div className="flex items-start gap-3 mb-4">
                    <div
                      className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl text-sm font-bold text-ws-void shadow-card-inner"
                      style={{ backgroundColor: c.avatar_color }}
                    >
                      {getInitials(c.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="font-display text-base font-bold text-ws-paper leading-tight truncate">
                        {c.name}
                      </h2>
                      {c.company && (
                        <p className="flex items-center gap-1.5 mt-1 text-xs text-ws-ink truncate">
                          <Building2 size={12} className="flex-shrink-0 text-ws-mist" />
                          {c.company}
                        </p>
                      )}
                      <div className="mt-2">
                        <Badge value={c.status} />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeContact(c.id)}
                      className="flex-shrink-0 p-1.5 rounded-lg text-ws-mist/50 hover:text-ws-bear hover:bg-ws-bear-dim transition-colors"
                      title="Retirer de la liste"
                    >
                      <X size={13} />
                    </button>
                  </div>

                  <div className="space-y-2.5 text-sm mb-4">
                    {c.phone?.trim() && (
                      <a
                        href={telHref(c.phone)}
                        className="flex items-center gap-2 text-ws-accent-soft hover:text-ws-cream transition-colors min-w-0"
                      >
                        <Phone size={15} className="flex-shrink-0 text-ws-mist" />
                        <span className="font-mono tabular-nums truncate">{c.phone}</span>
                      </a>
                    )}
                    {c.email?.trim() && (
                      <a
                        href={`mailto:${c.email}`}
                        className="flex items-center gap-2 text-ws-accent-soft hover:text-ws-cream transition-colors min-w-0"
                      >
                        <Mail size={15} className="flex-shrink-0 text-ws-mist" />
                        <span className="truncate">{c.email}</span>
                      </a>
                    )}
                    {c.website?.trim() && (
                      <a
                        href={c.website.startsWith('http') ? c.website : `https://${c.website}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2 text-ws-ink hover:text-ws-gold transition-colors min-w-0"
                      >
                        <Globe size={15} className="flex-shrink-0 text-ws-mist" />
                        <span className="truncate">{c.website.replace(/^https?:\/\//i, '')}</span>
                        <ExternalLink size={12} className="flex-shrink-0 opacity-60" />
                      </a>
                    )}
                    {(c.city || c.address) && (
                      <p className="text-xs text-ws-mist pl-[1.4rem] leading-snug">
                        {[c.address, c.city].filter(Boolean).join(' · ')}
                      </p>
                    )}
                  </div>

                  <div className="rounded-xl border border-white/[0.06] bg-ws-deep/40 px-3 py-3 mb-4">
                    <p className="ws-section-title mb-2">Satisfaction</p>
                    <Stars value={c.satisfaction_rating} />
                    {c.feedback?.trim() ? (
                      <blockquote className="mt-3 text-xs text-ws-paper/90 leading-relaxed border-l-2 border-ws-accent/40 pl-3 italic">
                        « {c.feedback.trim()} »
                      </blockquote>
                    ) : (
                      <p className="mt-2 text-[11px] font-mono text-ws-mist/80">Pas de témoignage saisi</p>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-[10px] font-mono uppercase tracking-wider text-ws-mist mb-4">
                    <span className="flex items-center gap-1">
                      <MessageSquare size={12} />
                      {meta.count} échange{meta.count > 1 ? 's' : ''}
                    </span>
                    <span className="flex items-center gap-1">
                      <FolderKanban size={12} />
                      {meta.projects} projet{meta.projects > 1 ? 's' : ''}
                    </span>
                  </div>
                  {meta.last && (
                    <p className="text-[10px] text-ws-mist mb-4 leading-snug">
                      <span className="font-mono uppercase tracking-wider text-ws-ink">Dernier contact</span>{' '}
                      · {formatDate(meta.last.date)} — {meta.last.description.slice(0, 120)}
                      {meta.last.description.length > 120 ? '…' : ''}
                    </p>
                  )}

                  <div className="mt-auto flex flex-wrap gap-2 pt-2 border-t border-ws-line/40">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="normal-case tracking-normal flex-1 min-w-[8rem]"
                      onClick={() => onNavigate('client-detail', c.id)}
                    >
                      Fiche client
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      className="normal-case tracking-normal flex-1 min-w-[8rem]"
                      onClick={() => openEdit(c)}
                    >
                      Noter & retour
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {/* Picker — ajouter un client à la liste */}
      <Modal
        isOpen={showPicker}
        onClose={() => setShowPicker(false)}
        title="Ajouter un contact"
        size="md"
      >
        <div className="space-y-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ws-mist pointer-events-none" />
            <input
              type="search"
              placeholder="Rechercher un client…"
              value={pickerSearch}
              onChange={(e) => setPickerSearch(e.target.value)}
              className="input pl-9 text-sm font-mono"
              autoFocus
            />
          </div>
          {availableClients.length === 0 ? (
            <p className="text-xs text-ws-mist font-mono text-center py-8">
              {clients.length === contactIds.size
                ? 'Tous vos clients sont déjà dans la liste.'
                : 'Aucun client correspond à la recherche.'}
            </p>
          ) : (
            <div className="max-h-80 overflow-y-auto space-y-1.5 pr-1">
              {availableClients.map((c) => {
                const clientProjects = projects.filter((p) => p.client_id === c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => addContact(c.id)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-ws-raised/60 border border-transparent hover:border-ws-line/60 transition-all text-left group"
                  >
                    <div
                      className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-xs font-bold text-ws-void"
                      style={{ backgroundColor: c.avatar_color }}
                    >
                      {getInitials(c.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-ws-paper truncate">{c.name}</p>
                      <p className="text-[11px] font-mono text-ws-mist truncate">
                        {c.company ? `${c.company} · ` : ''}{clientProjects.length} projet{clientProjects.length > 1 ? 's' : ''}
                      </p>
                    </div>
                    <span className="text-xs text-ws-accent-soft font-mono opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                      + Ajouter
                    </span>
                  </button>
                );
              })}
            </div>
          )}
          <div className="pt-1">
            <Button
              type="button"
              variant="secondary"
              className="w-full normal-case tracking-normal"
              onClick={() => setShowPicker(false)}
            >
              Fermer
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal notation */}
      <Modal
        isOpen={Boolean(editClient)}
        onClose={() => setEditClient(null)}
        title={editClient ? `Retour — ${editClient.name}` : ''}
        size="md"
      >
        {editClient && (
          <div className="space-y-4">
            <div>
              <label className="form-label">Satisfaction (1–5)</label>
              <select
                className="input"
                value={draftRating ?? ''}
                onChange={(e) =>
                  setDraftRating(e.target.value === '' ? null : Number(e.target.value))
                }
              >
                <option value="">Non renseigné</option>
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {n}/5
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">Témoignage / retour</label>
              <textarea
                className="input resize-none"
                rows={4}
                value={draftFeedback}
                onChange={(e) => setDraftFeedback(e.target.value)}
                placeholder="Avis, citation, retour d'expérience…"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="secondary"
                className="flex-1 normal-case tracking-normal"
                onClick={() => setEditClient(null)}
              >
                Annuler
              </Button>
              <Button
                type="button"
                className="flex-1 normal-case tracking-normal"
                loading={saving}
                onClick={() => void saveEdit()}
              >
                Enregistrer
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
