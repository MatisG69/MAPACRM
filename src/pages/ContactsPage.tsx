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
} from 'lucide-react';
import { Header } from '../components/layout/Header';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { EmptyState } from '../components/ui/EmptyState';
import type { Client, ClientStatus, Interaction, Page, Project } from '../lib/types';
import { getInitials, formatDate } from '../lib/utils';

type FilterStatus = ClientStatus | 'all';
type FilterFeedback = 'all' | 'with' | 'without';

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
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const [feedbackFilter, setFeedbackFilter] = useState<FilterFeedback>('all');
  const [editClient, setEditClient] = useState<Client | null>(null);
  const [saving, setSaving] = useState(false);
  const [draftRating, setDraftRating] = useState<number | null>(null);
  const [draftFeedback, setDraftFeedback] = useState('');

  const byClient = useMemo(() => {
    const map = new Map<
      string,
      { count: number; last: Interaction | null; projects: number }
    >();
    for (const c of clients) {
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
  }, [clients, interactions, projects]);

  const stats = useMemo(() => {
    const withPhone = clients.filter((c) => c.phone?.trim()).length;
    const rated = clients.filter((c) => c.satisfaction_rating != null).length;
    const withFb = clients.filter((c) => c.feedback?.trim()).length;
    const sum = clients.reduce((s, c) => s + (c.satisfaction_rating ?? 0), 0);
    const avg = rated ? (sum / rated).toFixed(1) : '—';
    return { withPhone, rated, withFb, avg, total: clients.length };
  }, [clients]);

  const filtered = useMemo(() => {
    return clients.filter((c) => {
      if (statusFilter !== 'all' && c.status !== statusFilter) return false;
      if (feedbackFilter === 'with' && !c.feedback?.trim()) return false;
      if (feedbackFilter === 'without' && c.feedback?.trim()) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return [c.name, c.company, c.email, c.phone, c.city, c.feedback].some((f) =>
        f?.toLowerCase().includes(q)
      );
    });
  }, [clients, search, statusFilter, feedbackFilter]);

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
    return digits.startsWith('+') ? `tel:${digits}` : `tel:${digits}`;
  };

  return (
    <div>
      <Header
        title="Contacts & retours"
        subtitle="Annuaire vivant : coordonnées, satisfaction, témoignages et fil d’échanges par client"
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
                ['active', 'Actifs'],
                ['prospect', 'Prospects'],
                ['inactive', 'Inactifs'],
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

        {filtered.length === 0 ? (
          <EmptyState
            icon={<Sparkles size={28} />}
            title={clients.length === 0 ? 'Aucun contact' : 'Aucun résultat'}
            description={
              clients.length === 0
                ? 'Ajoutez des clients depuis le registre pour alimenter cet annuaire.'
                : 'Affinez les filtres ou la recherche.'
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {filtered.map((c) => {
              const meta = byClient.get(c.id) ?? { count: 0, last: null, projects: 0 };
              return (
                <article
                  key={c.id}
                  className="ws-card rounded-2xl p-5 border border-ws-line/50 flex flex-col min-w-0 shadow-[0_20px_50px_-28px_rgba(0,0,0,0.85)]"
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
                placeholder="Avis, citation, retour d’expérience…"
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
