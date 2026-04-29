import { useMemo, useState } from 'react'
import {
  Archive,
  ArchiveRestore,
  Inbox,
  Loader2,
  Mail,
  MailOpen,
  Paperclip,
  Pencil,
  Reply,
  Search,
  Send,
  Trash2,
  User as UserIcon,
} from 'lucide-react'
import { Header } from '../components/layout/Header'
import { useEmails } from '../hooks/useEmails'
import { ComposeEmailModal } from '../components/emails/ComposeEmailModal'
import type { Email, Page } from '../lib/types'

interface EmailsPageProps {
  onNavigate: (page: Page, id?: string) => void
}

type Filter = 'inbox' | 'unread' | 'sent' | 'archived' | 'all'

function formatRelative(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMin = Math.floor(diffMs / 60_000)
  if (diffMin < 1) return "à l'instant"
  if (diffMin < 60) return `il y a ${diffMin} min`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `il y a ${diffH} h`
  const sameYear = d.getFullYear() === now.getFullYear()
  return d.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    ...(sameYear ? {} : { year: 'numeric' }),
  })
}

function getInitials(name: string | null, email: string): string {
  const src = name?.trim() || email.split('@')[0]
  const parts = src.split(/[\s.\-_]+/).filter(Boolean)
  return (parts[0]?.[0] ?? '').toUpperCase() + (parts[1]?.[0] ?? '').toUpperCase() || '?'
}

export function EmailsPage({ onNavigate }: EmailsPageProps) {
  const { emails, loading, error, refetch, unreadCount, markRead, toggleArchive, remove, sendEmail } =
    useEmails()

  const [filter, setFilter] = useState<Filter>('inbox')
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const [composerOpen, setComposerOpen] = useState(false)
  const [composerMode, setComposerMode] = useState<'compose' | 'reply'>('compose')
  const [composerPrefill, setComposerPrefill] = useState<{
    to?: string
    subject?: string
    quotedBody?: string
    inReplyTo?: string | null
    clientId?: string | null
  } | undefined>(undefined)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return emails.filter((e) => {
      // Filtres par direction + état
      if (filter === 'inbox' && (e.archived || e.direction === 'outbound')) return false
      if (filter === 'unread' && (e.read || e.archived || e.direction === 'outbound')) return false
      if (filter === 'sent' && e.direction !== 'outbound') return false
      if (filter === 'archived' && !e.archived) return false
      if (q) {
        const blob = `${e.subject ?? ''} ${e.from_email} ${e.from_name ?? ''} ${e.to_email ?? ''} ${e.body_text ?? ''}`.toLowerCase()
        if (!blob.includes(q)) return false
      }
      return true
    })
  }, [emails, filter, search])

  const selected = useMemo(
    () => filtered.find((e) => e.id === selectedId) ?? filtered[0] ?? null,
    [filtered, selectedId]
  )

  const openEmail = (e: Email) => {
    setSelectedId(e.id)
    if (!e.read) void markRead(e.id, true)
  }

  const openCompose = () => {
    setComposerMode('compose')
    setComposerPrefill(undefined)
    setComposerOpen(true)
  }

  const openReply = (e: Email) => {
    const subject = e.subject?.trim() ?? ''
    const replySubject = subject.toLowerCase().startsWith('re:') ? subject : `Re: ${subject}`
    const quoted = e.body_text
      ? e.body_text
          .split('\n')
          .map((line) => `> ${line}`)
          .join('\n')
      : ''
    const header = `Le ${new Date(e.received_at).toLocaleString('fr-FR')}, ${
      e.from_name || e.from_email
    } a écrit :`
    setComposerMode('reply')
    setComposerPrefill({
      to: e.from_email,
      subject: replySubject,
      quotedBody: quoted ? `${header}\n${quoted}` : header,
      inReplyTo: e.message_id,
      clientId: e.client_id,
    })
    setComposerOpen(true)
  }

  return (
    <div>
      <Header
        title="E-mails"
        subtitle={`Boîte de réception MAPA · sync IMAP toutes les minutes · ${unreadCount} non-lu${unreadCount !== 1 ? 's' : ''}`}
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => refetch()}
              className="px-3 py-1.5 rounded-xl text-xs font-mono uppercase tracking-wider border border-ws-line text-ws-paper hover:bg-white/[0.04] transition-colors flex items-center gap-2"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Inbox size={14} />}
              Rafraîchir
            </button>
            <button
              type="button"
              onClick={openCompose}
              className="px-3 py-1.5 rounded-xl text-xs font-mono uppercase tracking-wider bg-ws-accent text-ws-void hover:bg-ws-accent/90 transition-colors flex items-center gap-2"
            >
              <Pencil size={14} />
              Nouveau
            </button>
          </div>
        }
      />

      <div className="px-3 md:px-6 py-4 md:py-6">
        {error && (
          <div className="mb-4 px-4 py-3 rounded-xl border border-red-500/30 bg-red-500/10 text-xs text-red-300">
            {error}
          </div>
        )}

        <div className="grid lg:grid-cols-[340px_1fr] gap-4 min-h-[calc(100vh-220px)]">
          {/* Colonne gauche : liste */}
          <div className="rounded-2xl border border-ws-line/60 bg-ws-panel/50 overflow-hidden flex flex-col">
            {/* Filtres + recherche */}
            <div className="p-3 border-b border-ws-line/50 space-y-2.5 flex-shrink-0">
              <div className="relative">
                <Search
                  size={14}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ws-mist pointer-events-none"
                />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rechercher…"
                  className="w-full pl-8 pr-3 py-2 rounded-lg bg-ws-deep border border-ws-line text-sm text-ws-paper placeholder:text-ws-mist focus:outline-none focus:border-ws-accent/40"
                />
              </div>
              <div className="flex items-center gap-1 text-[10px] font-mono uppercase tracking-[0.18em] flex-wrap">
                {(['inbox', 'unread', 'sent', 'archived', 'all'] as Filter[]).map((f) => {
                  const label = {
                    inbox: 'Inbox',
                    unread: 'Non-lus',
                    sent: 'Envoyés',
                    archived: 'Archives',
                    all: 'Tous',
                  }[f]
                  return (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setFilter(f)}
                      className={`flex-1 py-1.5 rounded-md transition-colors ${
                        filter === f
                          ? 'bg-ws-accent/15 text-ws-accent border border-ws-accent/35'
                          : 'text-ws-mist hover:text-ws-paper border border-transparent'
                      }`}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Liste */}
            <div className="flex-1 overflow-y-auto">
              {loading && filtered.length === 0 ? (
                <div className="flex items-center justify-center py-16 text-ws-mist">
                  <Loader2 size={18} className="animate-spin" />
                </div>
              ) : filtered.length === 0 ? (
                <div className="text-center px-6 py-16">
                  <Mail size={28} className="mx-auto text-ws-mist/40 mb-3" />
                  <p className="text-sm text-ws-paper font-semibold">Boîte vide</p>
                  <p className="text-xs text-ws-mist mt-1">
                    {filter === 'inbox'
                      ? 'Aucun email reçu pour le moment.'
                      : filter === 'unread'
                        ? 'Tout est lu.'
                        : 'Aucun résultat.'}
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-ws-line/40">
                  {filtered.map((e) => {
                    const isActive = selected?.id === e.id
                    return (
                      <li key={e.id}>
                        <button
                          type="button"
                          onClick={() => openEmail(e)}
                          className={`w-full text-left px-3 py-3 transition-colors flex items-start gap-3 ${
                            isActive
                              ? 'bg-ws-accent/10 border-l-2 border-ws-accent'
                              : 'hover:bg-white/[0.03] border-l-2 border-transparent'
                          }`}
                        >
                          <div
                            className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-mono font-semibold ${
                              e.read ? 'bg-ws-deep border border-ws-line text-ws-mist' : 'bg-ws-accent/20 text-ws-accent border border-ws-accent/40'
                            }`}
                          >
                            {getInitials(e.from_name, e.from_email)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2 mb-0.5">
                              <span
                                className={`text-sm truncate ${
                                  e.read ? 'text-ws-paper/85 font-normal' : 'text-ws-paper font-semibold'
                                }`}
                              >
                                {e.from_name || e.from_email.split('@')[0]}
                              </span>
                              <span className="text-[10px] font-mono text-ws-mist flex-shrink-0">
                                {formatRelative(e.received_at)}
                              </span>
                            </div>
                            <p
                              className={`text-xs truncate ${
                                e.read ? 'text-ws-mist' : 'text-ws-paper font-medium'
                              }`}
                            >
                              {e.subject || '(sans objet)'}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              {e.direction === 'outbound' && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono uppercase tracking-[0.18em] bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                                  <Send size={9} /> Envoyé
                                </span>
                              )}
                              {e.client_id && e.client && (
                                <span
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono uppercase tracking-[0.18em] border"
                                  style={{
                                    backgroundColor: `${e.client.avatar_color ?? '#7d6f62'}1A`,
                                    borderColor: `${e.client.avatar_color ?? '#7d6f62'}55`,
                                    color: e.client.avatar_color ?? '#C8BFB0',
                                  }}
                                >
                                  <UserIcon size={9} /> {e.client.name}
                                </span>
                              )}
                              {e.attachments.length > 0 && (
                                <span className="text-[10px] font-mono text-ws-mist flex items-center gap-0.5">
                                  <Paperclip size={9} /> {e.attachments.length}
                                </span>
                              )}
                            </div>
                          </div>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </div>

          {/* Colonne droite : détail */}
          <div className="rounded-2xl border border-ws-line/60 bg-ws-panel/40 overflow-hidden flex flex-col min-h-[60vh]">
            {!selected ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <MailOpen size={28} className="mx-auto text-ws-mist/40 mb-3" />
                  <p className="text-sm text-ws-mist">Sélectionnez un email pour le lire.</p>
                </div>
              </div>
            ) : (
              <>
                <div className="px-5 py-4 border-b border-ws-line/50 flex items-start justify-between gap-3 flex-shrink-0">
                  <div className="min-w-0">
                    <h2 className="font-display text-lg md:text-xl font-bold text-ws-cream truncate">
                      {selected.subject || '(sans objet)'}
                    </h2>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-sm text-ws-paper font-medium">
                        {selected.from_name || selected.from_email}
                      </span>
                      <span className="text-xs text-ws-mist">&lt;{selected.from_email}&gt;</span>
                    </div>
                    <div className="text-[11px] font-mono text-ws-mist mt-1">
                      {new Date(selected.received_at).toLocaleString('fr-FR', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                      {selected.to_email && <span className="mx-2">·</span>}
                      {selected.to_email && <span>à {selected.to_email}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {selected.direction === 'inbound' && (
                      <button
                        type="button"
                        onClick={() => openReply(selected)}
                        title="Répondre"
                        className="px-2.5 py-2 rounded-lg text-xs font-mono uppercase tracking-wider bg-ws-accent/15 text-ws-accent border border-ws-accent/35 hover:bg-ws-accent/25 transition-colors flex items-center gap-1.5"
                      >
                        <Reply size={13} /> Répondre
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => markRead(selected.id, !selected.read)}
                      title={selected.read ? 'Marquer non-lu' : 'Marquer lu'}
                      className="p-2 rounded-lg text-ws-mist hover:text-ws-paper hover:bg-white/[0.05] transition-colors"
                    >
                      {selected.read ? <Mail size={15} /> : <MailOpen size={15} />}
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleArchive(selected.id)}
                      title={selected.archived ? 'Désarchiver' : 'Archiver'}
                      className="p-2 rounded-lg text-ws-mist hover:text-ws-paper hover:bg-white/[0.05] transition-colors"
                    >
                      {selected.archived ? <ArchiveRestore size={15} /> : <Archive size={15} />}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm('Supprimer cet email du CRM ?')) void remove(selected.id)
                      }}
                      title="Supprimer"
                      className="p-2 rounded-lg text-red-400/80 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                {/* Bandeau client lié */}
                {selected.client_id && selected.client && (
                  <button
                    type="button"
                    onClick={() => onNavigate('client-detail', selected.client_id ?? undefined)}
                    className="px-5 py-2.5 border-b border-ws-line/40 flex items-center gap-2 text-xs hover:bg-white/[0.03] transition-colors text-left"
                  >
                    <UserIcon size={13} className="text-ws-accent" />
                    <span className="text-ws-mist">Lié au client</span>
                    <span className="text-ws-paper font-medium">{selected.client.name}</span>
                    <span className="text-ws-mist ml-auto font-mono text-[10px] uppercase tracking-wider">
                      Ouvrir →
                    </span>
                  </button>
                )}

                {/* Pièces jointes */}
                {selected.attachments.length > 0 && (
                  <div className="px-5 py-3 border-b border-ws-line/40 flex flex-wrap gap-2">
                    {selected.attachments.map((a, i) => (
                      <span
                        key={`${a.filename}-${i}`}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-ws-line/60 bg-ws-deep/40 text-xs text-ws-paper"
                      >
                        <Paperclip size={11} className="text-ws-mist" />
                        <span className="truncate max-w-[200px]">{a.filename ?? 'Pièce jointe'}</span>
                        {a.size != null && (
                          <span className="text-[10px] font-mono text-ws-mist">
                            {Math.round(a.size / 1024)} ko
                          </span>
                        )}
                      </span>
                    ))}
                  </div>
                )}

                {/* Corps du message */}
                <div className="flex-1 overflow-y-auto px-5 py-5">
                  {selected.body_html ? (
                    <iframe
                      // sandbox interdit JS, navigation, popup. Le HTML email rendu reste sûr.
                      sandbox=""
                      title={selected.subject ?? 'Email'}
                      srcDoc={selected.body_html}
                      className="w-full min-h-[400px] bg-white rounded-lg"
                    />
                  ) : (
                    <pre className="text-sm text-ws-ink whitespace-pre-wrap font-sans leading-relaxed">
                      {selected.body_text || '(corps vide)'}
                    </pre>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <ComposeEmailModal
        isOpen={composerOpen}
        onClose={() => setComposerOpen(false)}
        onSend={async (payload) => {
          const result = await sendEmail(payload)
          return { ok: result.ok, error: result.error }
        }}
        prefill={composerPrefill}
        mode={composerMode}
      />
    </div>
  )
}
