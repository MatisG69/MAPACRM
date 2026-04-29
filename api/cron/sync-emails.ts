/**
 * Vercel Cron Function — synchronise les emails entrants Hostinger (IMAP)
 * vers la table Supabase `emails`. Exécutée toutes les 5 min via vercel.json.
 *
 * Sécurité :
 * · Mot de passe IMAP en ENV Vercel uniquement (jamais en base, jamais
 *   exposé au client).
 * · Endpoint protégé par CRON_SECRET (header Authorization). Vercel Cron
 *   l'envoie automatiquement quand `CRON_SECRET` est défini.
 * · Service-role Supabase utilisée côté serveur — bypass RLS pour pouvoir
 *   matcher les clients sans contrainte.
 *
 * Idempotence :
 * · Upsert sur `message_id` (RFC 5322) avec ignoreDuplicates → repolls
 *   sans risque, marquage IMAP \Seen seulement après insert OK.
 */

import { ImapFlow } from 'imapflow'
// mailparser est CommonJS — passage par le default import pour éviter les
// soucis d'interop ESM/CJS sur le bundler Vercel ("Named export ... not found").
import mailparserPkg from 'mailparser'
import type { AddressObject } from 'mailparser'
import { createClient } from '@supabase/supabase-js'

const { simpleParser } = mailparserPkg

// Syntaxe Vercel moderne : exports top-level (l'ancien `export const config = {...}`
// force le runtime legacy Node-Express style avec req/res, incompatible avec
// le handler Web API ci-dessous). Node.js est le runtime par défaut, on
// n'a qu'à étendre maxDuration pour permettre l'IMAP fetch (par défaut 10 s
// sur Hobby — souvent insuffisant).
export const maxDuration = 60

interface SyncStats {
  fetched: number
  inserted: number
  skipped: number
  errors: string[]
}

function firstAddress(addr: AddressObject | AddressObject[] | undefined) {
  if (!addr) return null
  const single = Array.isArray(addr) ? addr[0] : addr
  return single?.value?.[0] ?? null
}

function flattenTo(addr: AddressObject | AddressObject[] | undefined): string | null {
  if (!addr) return null
  const arr = Array.isArray(addr) ? addr : [addr]
  return arr.map((a) => a.text).filter(Boolean).join(', ') || null
}

export default async function handler(request: Request): Promise<Response> {
  // ── 1. Auth ─────────────────────────────────────────────────────────────
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${cronSecret}`) {
      return Response.json({ error: 'unauthorized' }, { status: 401 })
    }
  }

  // ── 2. ENV check ────────────────────────────────────────────────────────
  const host = process.env.HOSTINGER_IMAP_HOST ?? 'imap.hostinger.com'
  const port = Number(process.env.HOSTINGER_IMAP_PORT ?? 993)
  const user = process.env.HOSTINGER_IMAP_USER
  const pass = process.env.HOSTINGER_IMAP_PASSWORD
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  const missing = [
    !user && 'HOSTINGER_IMAP_USER',
    !pass && 'HOSTINGER_IMAP_PASSWORD',
    !supabaseUrl && 'SUPABASE_URL',
    !supabaseKey && 'SUPABASE_SERVICE_ROLE_KEY',
  ].filter(Boolean)
  if (missing.length > 0) {
    return Response.json({ error: 'missing_env', missing }, { status: 500 })
  }

  // ── 3. IMAP connect + Supabase admin ────────────────────────────────────
  const supabase = createClient(supabaseUrl!, supabaseKey!, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const imap = new ImapFlow({
    host,
    port,
    secure: true,
    auth: { user: user!, pass: pass! },
    logger: false,
  })

  const stats: SyncStats = { fetched: 0, inserted: 0, skipped: 0, errors: [] }

  try {
    await imap.connect()
    const lock = await imap.getMailboxLock('INBOX')

    try {
      // ── 4. Récupération des messages non-lus ──────────────────────────
      for await (const msg of imap.fetch(
        { seen: false },
        { source: true, envelope: true, uid: true }
      )) {
        stats.fetched++
        if (!msg.source) continue

        let parsed
        try {
          parsed = await simpleParser(msg.source)
        } catch (e) {
          stats.errors.push(`parse_uid_${msg.uid}: ${(e as Error).message}`)
          continue
        }

        const from = firstAddress(parsed.from)
        const fromEmail = from?.address?.toLowerCase().trim()
        const fromName = from?.name ?? null
        if (!fromEmail) {
          stats.skipped++
          continue
        }

        // Idempotence : on calque message_id sur le RFC, sinon on retombe sur
        // un identifiant UID-stable pour éviter les doublons en cas de
        // ré-injection.
        const messageId = parsed.messageId ?? `imap-uid-${msg.uid}`

        // ── 5. Match client par email ────────────────────────────────────
        let clientId: string | null = null
        const { data: matched } = await supabase
          .from('clients')
          .select('id')
          .ilike('email', fromEmail)
          .limit(1)
          .maybeSingle()
        clientId = matched?.id ?? null

        // ── 6. Upsert ────────────────────────────────────────────────────
        const attachments = (parsed.attachments ?? []).map((a) => ({
          filename: a.filename ?? null,
          contentType: a.contentType ?? null,
          size: a.size ?? null,
          contentId: a.contentId ?? null,
        }))

        const { error } = await supabase.from('emails').upsert(
          {
            message_id: messageId,
            from_email: fromEmail,
            from_name: fromName,
            to_email: flattenTo(parsed.to),
            subject: parsed.subject ?? '(sans objet)',
            body_text: parsed.text ?? null,
            body_html: typeof parsed.html === 'string' ? parsed.html : null,
            received_at: parsed.date?.toISOString() ?? new Date().toISOString(),
            client_id: clientId,
            attachments,
          },
          { onConflict: 'message_id', ignoreDuplicates: true }
        )

        if (error) {
          stats.errors.push(`insert_uid_${msg.uid}: ${error.message}`)
          stats.skipped++
          continue
        }

        stats.inserted++

        // ── 7. Marquer \Seen côté IMAP seulement après insert OK ──────────
        try {
          await imap.messageFlagsAdd(msg.uid, ['\\Seen'], { uid: true })
        } catch (e) {
          // Non-bloquant : si on n'arrive pas à flagger, le prochain poll
          // re-traitera mais ignoreDuplicates protège l'idempotence.
          stats.errors.push(`flag_uid_${msg.uid}: ${(e as Error).message}`)
        }
      }
    } finally {
      lock.release()
    }
  } catch (e) {
    return Response.json(
      { error: 'imap_failure', message: (e as Error).message, stats },
      { status: 502 }
    )
  } finally {
    try {
      await imap.logout()
    } catch {
      // Logout error ignoré — la connexion sera fermée par GC.
    }
  }

  return Response.json({ ok: true, ...stats })
}
