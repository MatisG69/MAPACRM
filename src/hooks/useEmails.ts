import { useCallback, useEffect, useState } from 'react'
import { supabase, isSupabaseEnabled } from '../lib/supabase'
import type { Email } from '../lib/types'

interface SendEmailPayload {
  to: string | string[]
  subject: string
  text?: string
  html?: string
  in_reply_to?: string | null
  client_id?: string | null
}

interface SendEmailResult {
  ok: boolean
  messageId?: string
  error?: string
}

interface UseEmailsResult {
  emails: Email[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  unreadCount: number
  markRead: (id: string, read?: boolean) => Promise<void>
  toggleArchive: (id: string, archived?: boolean) => Promise<void>
  remove: (id: string) => Promise<void>
  sendEmail: (payload: SendEmailPayload) => Promise<SendEmailResult>
}

/**
 * Boîte de réception MAPA — alimentée par /api/cron/sync-emails (Vercel cron, 5min).
 * Le hook expose la liste en lecture/archivage, et garde un compteur non-lus.
 */
export function useEmails(): UseEmailsResult {
  const [emails, setEmails] = useState<Email[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchEmails = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      if (!isSupabaseEnabled() || !supabase) {
        setEmails([])
        return
      }
      const { data, error: err } = await supabase
        .from('emails')
        .select('*, client:clients(id, name, avatar_color)')
        .order('received_at', { ascending: false })
        .limit(500)
      if (err) throw err
      setEmails((data ?? []) as Email[])
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchEmails()
  }, [fetchEmails])

  const markRead = useCallback(
    async (id: string, read: boolean = true) => {
      if (!isSupabaseEnabled() || !supabase) return
      // Optimistic update
      setEmails((prev) => prev.map((e) => (e.id === id ? { ...e, read } : e)))
      const { error: err } = await supabase.from('emails').update({ read }).eq('id', id)
      if (err) {
        setError(err.message)
        // Rollback
        setEmails((prev) => prev.map((e) => (e.id === id ? { ...e, read: !read } : e)))
      }
    },
    []
  )

  const toggleArchive = useCallback(async (id: string, archived?: boolean) => {
    if (!isSupabaseEnabled() || !supabase) return
    setEmails((prev) =>
      prev.map((e) => (e.id === id ? { ...e, archived: archived ?? !e.archived } : e))
    )
    const target = emails.find((e) => e.id === id)
    const next = archived ?? !(target?.archived ?? false)
    const { error: err } = await supabase.from('emails').update({ archived: next }).eq('id', id)
    if (err) setError(err.message)
  }, [emails])

  const remove = useCallback(async (id: string) => {
    if (!isSupabaseEnabled() || !supabase) return
    setEmails((prev) => prev.filter((e) => e.id !== id))
    const { error: err } = await supabase.from('emails').delete().eq('id', id)
    if (err) {
      setError(err.message)
      fetchEmails()
    }
  }, [fetchEmails])

  const sendEmail = useCallback(
    async (payload: SendEmailPayload): Promise<SendEmailResult> => {
      try {
        const response = await fetch('/api/emails/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const json = (await response.json()) as Record<string, unknown>
        if (!response.ok || !json.ok) {
          const message =
            (typeof json.error === 'string' ? json.error : null) ??
            (typeof json.message === 'string' ? json.message : null) ??
            `HTTP ${response.status}`
          return { ok: false, error: message }
        }
        // Refetch pour récupérer la ligne 'outbound' insérée côté serveur
        await fetchEmails()
        return { ok: true, messageId: typeof json.messageId === 'string' ? json.messageId : undefined }
      } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : 'network_error' }
      }
    },
    [fetchEmails]
  )

  const unreadCount = emails.filter((e) => !e.read && !e.archived && e.direction === 'inbound').length

  return {
    emails,
    loading,
    error,
    refetch: fetchEmails,
    unreadCount,
    markRead,
    toggleArchive,
    remove,
    sendEmail,
  }
}
