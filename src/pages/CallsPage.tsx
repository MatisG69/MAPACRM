import { useMemo, useState } from 'react';
import {
  PhoneCall,
  Plus,
  Search,
  Trash2,
  Mail,
  Phone,
  Globe,
  Loader2,
  Check,
  X as XIcon,
  ChevronDown,
} from 'lucide-react';
import { Header } from '../components/layout/Header';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { useCalls } from '../hooks/useCalls';
import type { Call, Client } from '../lib/types';

interface CallsPageProps {
  clients: Client[];
}

type Filter = 'all' | 'todo' | 'called' | 'interested';

export function CallsPage({ clients }: CallsPageProps) {
  const { calls, loading, error, createCall, updateCall, deleteCall } = useCalls();

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Call | null>(null);

  // Tri client par nom pour le picker
  const sortedClients = useMemo(
    () => [...clients].sort((a, b) => a.name.localeCompare(b.name)),
    [clients],
  );

  const filtered = useMemo(() => {
    let list = calls;
    if (filter === 'todo') list = list.filter((c) => !c.called);
    else if (filter === 'called') list = list.filter((c) => c.called);
    else if (filter === 'interested') list = list.filter((c) => c.interested === true);

    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((c) => {
        const cl = c.client;
        if (!cl) return false;
        return (
          cl.name.toLowerCase().includes(q) ||
          (cl.company ?? '').toLowerCase().includes(q) ||
          (cl.email ?? '').toLowerCase().includes(q) ||
          (cl.phone ?? '').toLowerCase().includes(q) ||
          (c.notes ?? '').toLowerCase().includes(q)
        );
      });
    }
    return list;
  }, [calls, filter, search]);

  const counts = useMemo(
    () => ({
      all: calls.length,
      todo: calls.filter((c) => !c.called).length,
      called: calls.filter((c) => c.called).length,
      interested: calls.filter((c) => c.interested === true).length,
    }),
    [calls],
  );

  const handleAddCall = async (clientId: string) => {
    setCreating(true);
    try {
      await createCall(clientId);
    } finally {
      setCreating(false);
      setPickerOpen(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!confirmDelete) return;
    try {
      await deleteCall(confirmDelete.id);
    } finally {
      setConfirmDelete(null);
    }
  };

  return (
    <div className="space-y-6">
      <Header
        title="Appels"
        subtitle="Journal d'appels commerciaux — coordonnées auto-remplies depuis la fiche client"
        searchValue={search}
        onSearchChange={setSearch}
        actions={
          <div className="relative">
            <Button
              size="sm"
              icon={<Plus size={14} />}
              onClick={() => setPickerOpen((v) => !v)}
              loading={creating}
              className="normal-case tracking-normal"
            >
              Nouvel appel
            </Button>
            {pickerOpen && (
              <ClientPicker
                clients={sortedClients}
                onSelect={handleAddCall}
                onClose={() => setPickerOpen(false)}
              />
            )}
          </div>
        }
      />

      {/* Filtres */}
      <div className="flex items-center gap-2 flex-wrap">
        {(
          [
            ['all', 'Tous', counts.all],
            ['todo', 'À appeler', counts.todo],
            ['called', 'Appelés', counts.called],
            ['interested', 'Intéressés', counts.interested],
          ] as const
        ).map(([k, label, n]) => (
          <button
            key={k}
            type="button"
            onClick={() => setFilter(k)}
            className={`px-3 py-1.5 rounded-lg border text-xs font-mono uppercase tracking-[0.15em] transition-colors ${
              filter === k
                ? 'bg-ws-accent/15 border-ws-accent/40 text-ws-paper'
                : 'bg-ws-deep/40 border-ws-line text-ws-mist hover:text-ws-paper hover:border-ws-accent/25'
            }`}
          >
            {label} <span className="ml-1.5 opacity-60">{n}</span>
          </button>
        ))}
      </div>

      {/* Tableau */}
      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300 font-mono">
          {error}
        </div>
      )}

      {loading && calls.length === 0 ? (
        <div className="flex items-center justify-center py-20 text-ws-mist gap-3">
          <Loader2 size={18} className="animate-spin" />
          <span className="font-mono text-sm">Chargement…</span>
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<PhoneCall size={28} />}
          title={search || filter !== 'all' ? 'Aucun appel correspondant' : 'Aucun appel pour le moment'}
          description={
            search || filter !== 'all'
              ? 'Essayez d\'élargir le filtre ou la recherche.'
              : 'Cliquez sur « Nouvel appel » pour ajouter une ligne. Les coordonnées seront auto-remplies depuis la fiche client.'
          }
          action={
            !search && filter === 'all'
              ? { label: 'Nouvel appel', onClick: () => setPickerOpen(true) }
              : undefined
          }
        />
      ) : (
        <div className="ws-card rounded-2xl border border-ws-line overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ws-line bg-ws-deep/40">
                  <Th>Client</Th>
                  <Th>Téléphone</Th>
                  <Th>Email</Th>
                  <Th>Site web</Th>
                  <Th className="text-center">Appelé</Th>
                  <Th>Notes</Th>
                  <Th className="text-center">Intéressé</Th>
                  <Th className="text-right pr-4">Date</Th>
                  <Th className="w-10" aria-label="Actions" />
                </tr>
              </thead>
              <tbody className="divide-y divide-ws-line/60">
                {filtered.map((call) => (
                  <CallRow
                    key={call.id}
                    call={call}
                    clients={sortedClients}
                    onUpdate={updateCall}
                    onDelete={() => setConfirmDelete(call)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={!!confirmDelete}
        title="Supprimer cet appel ?"
        description={
          confirmDelete?.client
            ? `La ligne pour ${confirmDelete.client.name} sera supprimée définitivement.`
            : 'Cette ligne sera supprimée définitivement.'
        }
        onConfirm={handleConfirmDelete}
        onClose={() => setConfirmDelete(null)}
      />
    </div>
  );
}

/* ─────────────────── Sub-components ─────────────────── */

function Th({ children, className = '', ...rest }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={`px-3 py-2.5 text-left font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-ws-mist ${className}`}
      {...rest}
    >
      {children}
    </th>
  );
}

function ClientPicker({
  clients,
  onSelect,
  onClose,
}: {
  clients: Client[];
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState('');
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return clients;
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(s) ||
        (c.company ?? '').toLowerCase().includes(s),
    );
  }, [clients, q]);

  return (
    <>
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="absolute top-full right-0 mt-2 z-50 w-80 rounded-xl border border-ws-line bg-ws-panel shadow-2xl overflow-hidden">
        <div className="p-2 border-b border-ws-line">
          <div className="relative">
            <Search
              size={14}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ws-mist"
            />
            <input
              type="text"
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Rechercher un client…"
              className="w-full pl-8 pr-3 py-2 rounded-lg bg-ws-deep border border-ws-line text-sm text-ws-paper placeholder:text-ws-mist/60 focus:outline-none focus:border-ws-accent"
            />
          </div>
        </div>
        <div className="max-h-72 overflow-y-auto scrollbar-ws">
          {filtered.length === 0 ? (
            <p className="text-center py-8 text-xs text-ws-mist font-mono">
              Aucun client trouvé
            </p>
          ) : (
            filtered.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => onSelect(c.id)}
                className="w-full text-left px-3 py-2.5 hover:bg-white/[0.04] transition-colors flex items-center gap-3 border-b border-ws-line/40 last:border-b-0"
              >
                <div
                  className="w-8 h-8 rounded-md flex items-center justify-center text-[11px] font-bold font-mono flex-shrink-0"
                  style={{
                    background: c.avatar_color ?? 'rgba(184,151,58,0.15)',
                    color: '#09090b',
                  }}
                >
                  {c.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-ws-paper truncate">{c.name}</p>
                  {c.company && (
                    <p className="text-[10px] text-ws-mist font-mono truncate">{c.company}</p>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </>
  );
}

function CallRow({
  call,
  clients,
  onUpdate,
  onDelete,
}: {
  call: Call;
  clients: Client[];
  onUpdate: (id: string, patch: Partial<Pick<Call, 'called' | 'interested' | 'notes' | 'client_id'>>) => Promise<Call>;
  onDelete: () => void;
}) {
  const [notesDraft, setNotesDraft] = useState(call.notes ?? '');
  const [notesEditing, setNotesEditing] = useState(false);
  const [pending, setPending] = useState<'called' | 'yes' | 'no' | null>(null);
  const [clientPickerOpen, setClientPickerOpen] = useState(false);

  // Sync local draft when external update happens (e.g. realtime)
  if (!notesEditing && (call.notes ?? '') !== notesDraft) {
    setNotesDraft(call.notes ?? '');
  }

  const cl = call.client;
  const phone = cl?.phone ?? '';
  const email = cl?.email ?? '';
  const website = cl?.website ?? '';

  const toggleCalled = async () => {
    setPending('called');
    try {
      await onUpdate(call.id, { called: !call.called });
    } finally {
      setPending(null);
    }
  };

  const setInterested = async (value: boolean | null) => {
    setPending(value === true ? 'yes' : value === false ? 'no' : null);
    try {
      await onUpdate(call.id, { interested: value });
    } finally {
      setPending(null);
    }
  };

  const saveNotes = async () => {
    if (notesDraft === (call.notes ?? '')) {
      setNotesEditing(false);
      return;
    }
    try {
      await onUpdate(call.id, { notes: notesDraft.trim() || null });
    } finally {
      setNotesEditing(false);
    }
  };

  const changeClient = async (clientId: string) => {
    setClientPickerOpen(false);
    if (clientId === call.client_id) return;
    await onUpdate(call.id, { client_id: clientId });
  };

  return (
    <tr className="hover:bg-white/[0.02] transition-colors group align-middle">
      {/* Client (avec changement possible) */}
      <td className="px-3 py-3 relative">
        <button
          type="button"
          onClick={() => setClientPickerOpen((v) => !v)}
          className="flex items-center gap-2.5 min-w-0 hover:bg-white/[0.04] -mx-2 px-2 py-1 rounded-md transition-colors"
        >
          {cl ? (
            <>
              <div
                className="w-7 h-7 rounded-md flex items-center justify-center text-[10px] font-bold font-mono flex-shrink-0"
                style={{
                  background: cl.avatar_color ?? 'rgba(184,151,58,0.15)',
                  color: '#09090b',
                }}
              >
                {cl.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0 text-left">
                <p className="text-sm text-ws-paper font-medium truncate max-w-[180px]">
                  {cl.name}
                </p>
                {cl.company && (
                  <p className="text-[10px] text-ws-mist font-mono truncate max-w-[180px]">
                    {cl.company}
                  </p>
                )}
              </div>
            </>
          ) : (
            <span className="text-xs text-ws-mist italic">Client introuvable</span>
          )}
          <ChevronDown size={12} className="text-ws-mist opacity-0 group-hover:opacity-100" />
        </button>
        {clientPickerOpen && (
          <ClientPicker
            clients={clients}
            onSelect={changeClient}
            onClose={() => setClientPickerOpen(false)}
          />
        )}
      </td>

      {/* Téléphone (auto-fill, lecture seule) */}
      <td className="px-3 py-3">
        {phone ? (
          <a
            href={`tel:${phone}`}
            className="flex items-center gap-1.5 text-sm text-ws-paper hover:text-ws-accent transition-colors font-mono"
          >
            <Phone size={11} className="text-ws-mist flex-shrink-0" />
            {phone}
          </a>
        ) : (
          <span className="text-xs text-ws-mist/60 font-mono italic">—</span>
        )}
      </td>

      {/* Email (auto-fill, lecture seule) */}
      <td className="px-3 py-3">
        {email ? (
          <a
            href={`mailto:${email}`}
            className="flex items-center gap-1.5 text-xs text-ws-ink hover:text-ws-accent transition-colors truncate max-w-[200px]"
          >
            <Mail size={11} className="text-ws-mist flex-shrink-0" />
            <span className="truncate">{email}</span>
          </a>
        ) : (
          <span className="text-xs text-ws-mist/60 font-mono italic">—</span>
        )}
      </td>

      {/* Site web (auto-fill, lecture seule) */}
      <td className="px-3 py-3">
        {website ? (
          <a
            href={website.startsWith('http') ? website : `https://${website}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-ws-ink hover:text-ws-accent transition-colors truncate max-w-[180px]"
          >
            <Globe size={11} className="text-ws-mist flex-shrink-0" />
            <span className="truncate">{website.replace(/^https?:\/\//, '')}</span>
          </a>
        ) : (
          <span className="text-xs text-ws-mist/60 font-mono italic">—</span>
        )}
      </td>

      {/* Appelé toggle */}
      <td className="px-3 py-3 text-center">
        <button
          type="button"
          onClick={toggleCalled}
          disabled={pending !== null}
          className={`inline-flex items-center justify-center w-7 h-7 rounded-md border transition-all ${
            call.called
              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/25'
              : 'bg-ws-deep/40 border-ws-line text-ws-mist hover:border-ws-accent/30 hover:text-ws-paper'
          } disabled:opacity-50`}
          aria-label={call.called ? 'Marquer comme non appelé' : 'Marquer comme appelé'}
          title={call.called ? 'Appelé' : 'Pas encore appelé'}
        >
          {pending === 'called' ? (
            <Loader2 size={13} className="animate-spin" />
          ) : call.called ? (
            <Check size={14} strokeWidth={2.5} />
          ) : null}
        </button>
      </td>

      {/* Notes (édition inline) */}
      <td className="px-3 py-3 min-w-[220px] max-w-[320px]">
        {notesEditing ? (
          <textarea
            value={notesDraft}
            onChange={(e) => setNotesDraft(e.target.value)}
            onBlur={saveNotes}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setNotesDraft(call.notes ?? '');
                setNotesEditing(false);
              }
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                void saveNotes();
              }
            }}
            placeholder="Notes…"
            autoFocus
            rows={2}
            className="w-full px-2.5 py-1.5 rounded-md bg-ws-deep border border-ws-accent/40 text-xs text-ws-paper placeholder:text-ws-mist/60 focus:outline-none resize-none"
          />
        ) : (
          <button
            type="button"
            onClick={() => setNotesEditing(true)}
            className="w-full text-left px-2 py-1.5 rounded-md hover:bg-white/[0.04] transition-colors min-h-[28px]"
          >
            {call.notes ? (
              <p className="text-xs text-ws-ink leading-relaxed line-clamp-3 whitespace-pre-wrap">
                {call.notes}
              </p>
            ) : (
              <span className="text-xs text-ws-mist/50 font-mono italic">+ Ajouter une note</span>
            )}
          </button>
        )}
      </td>

      {/* Intéressé tri-state : null / true / false */}
      <td className="px-3 py-3 text-center">
        <div className="inline-flex items-center gap-1 p-0.5 rounded-md bg-ws-deep/40 border border-ws-line">
          <button
            type="button"
            onClick={() =>
              setInterested(call.interested === true ? null : true)
            }
            disabled={pending !== null}
            className={`inline-flex items-center justify-center w-6 h-6 rounded transition-all ${
              call.interested === true
                ? 'bg-emerald-500/20 text-emerald-300'
                : 'text-ws-mist hover:text-ws-paper hover:bg-white/[0.04]'
            } disabled:opacity-50`}
            aria-label="Intéressé"
            title="Intéressé"
          >
            {pending === 'yes' ? (
              <Loader2 size={11} className="animate-spin" />
            ) : (
              <Check size={12} strokeWidth={2.5} />
            )}
          </button>
          <button
            type="button"
            onClick={() =>
              setInterested(call.interested === false ? null : false)
            }
            disabled={pending !== null}
            className={`inline-flex items-center justify-center w-6 h-6 rounded transition-all ${
              call.interested === false
                ? 'bg-red-500/20 text-red-300'
                : 'text-ws-mist hover:text-ws-paper hover:bg-white/[0.04]'
            } disabled:opacity-50`}
            aria-label="Pas intéressé"
            title="Pas intéressé"
          >
            {pending === 'no' ? (
              <Loader2 size={11} className="animate-spin" />
            ) : (
              <XIcon size={12} strokeWidth={2.5} />
            )}
          </button>
        </div>
      </td>

      {/* Date */}
      <td className="px-3 py-3 text-right pr-4">
        <span className="text-[10px] font-mono text-ws-mist whitespace-nowrap">
          {call.called_at
            ? new Date(call.called_at).toLocaleString('fr-FR', {
                day: '2-digit',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })
            : new Date(call.created_at).toLocaleDateString('fr-FR', {
                day: '2-digit',
                month: 'short',
              })}
        </span>
      </td>

      {/* Delete */}
      <td className="px-3 py-3 text-right">
        <button
          type="button"
          onClick={onDelete}
          className="p-1.5 rounded-md text-ws-mist hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
          aria-label="Supprimer"
        >
          <Trash2 size={14} />
        </button>
      </td>
    </tr>
  );
}
