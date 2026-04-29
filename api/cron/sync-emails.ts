/**
 * Vercel Cron Function — synchronise les emails entrants Hostinger (IMAP)
 * vers la table Supabase `emails`. Déclenchée toutes les minutes par
 * pg_cron Supabase via pg_net.
 *
 * Sécurité :
 * · Mot de passe IMAP en ENV Vercel uniquement.
 * · Endpoint protégé par CRON_SECRET (header Authorization).
 * · Service-role Supabase utilisée côté serveur — bypass RLS.
 *
 * Idempotence :
 * · Upsert sur `message_id` (RFC 5322) avec ignoreDuplicates.
 * · Marquage IMAP `\Seen` seulement après insert OK.
 *
 * Signature Express-style (req, res) — Vercel sert le runtime legacy Node
 * pour les projets Vite/SPA, et Web API + req.headers.get() ne fonctionne
 * pas dans ce mode.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { ImapFlow } from 'imapflow'
import mailparserPkg from 'mailparser'
import type { AddressObject } from 'mailparser'
import { createClient } from '@supabase/supabase-js'

const { simpleParser } = mailparserPkg

// Vercel moderne : maxDuration en export top-level. Hobby max = 60 s.
export const maxDuration = 60

/** Nombre max d'emails traités par invocation. Garantit qu'on rentre dans
 *  les 60 s de Vercel Hobby même sur une boîte avec des centaines/milliers
 *  de mails non-lus (premier run). Avec le cron 1 min côté Supabase, une
 *  boîte de 10 000 mails est rattrapée en ~3.5 h en arrière-plan. */
const MAX_PER_RUN = 50

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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // ── 1. Auth ─────────────────────────────────────────────────────────────
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const authHeader = req.headers.authorization
    if (authHeader !== `Bearer ${cronSecret}`) {
      return res.status(401).json({ error: 'unauthorized' })
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
    return res.status(500).json({ error: 'missing_env', missing })
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
    // Timeouts courts pour éviter qu'imapflow attende indéfiniment
    // si Hostinger ne répond plus.
    socketTimeout: 30_000,
    greetingTimeout: 10_000,
  })

  const stats: SyncStats = { fetched: 0, inserted: 0, skipped: 0, errors: [] }
  let totalUnseen = 0
  let truncated = false

  try {
    await imap.connect()
    const lock = await imap.getMailboxLock('INBOX')

    try {
      // ── 4. Récupération limitée des messages non-lus ─────────────────
      // Search d'abord pour récupérer la liste des UIDs sans télécharger
      // les sources, puis on borne à MAX_PER_RUN les plus anciens (FIFO).
      const allUnseenUids = await imap.search({ seen: false }, { uid: true })
      totalUnseen = allUnseenUids.length
      truncated = totalUnseen > MAX_PER_RUN
      const uidsToFetch = allUnseenUids.slice(0, MAX_PER_RUN)

      if (uidsToFetch.length > 0) {
        // ── 4a. Étape 1 : drainer le fetch dans un buffer mémoire ─────
        // imapflow ne tolère aucune autre commande IMAP pendant qu'un
        // generator fetch est ouvert : appeler messageFlagsAdd inside
        // le for-await casse la session ("Connection not available")
        // et bloque la boîte sur 1 mail par run. On consomme donc tout
        // d'abord, puis on traite hors lock-fetch.
        interface BufferedMessage {
          uid: number
          source: Buffer
        }
        const buffered: BufferedMessage[] = []
        for await (const msg of imap.fetch(
          uidsToFetch,
          { source: true, uid: true },
          { uid: true }
        )) {
          if (!msg.source || msg.uid == null) continue
          buffered.push({ uid: msg.uid, source: msg.source })
        }
        stats.fetched = buffered.length

        // ── 4b. Étape 2 : parser + upsert + flag, sans fetch en cours ──
        const seenUidsToFlag: number[] = []
        for (const msg of buffered) {
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

          // Idempotence : on calque message_id sur le RFC, sinon on retombe
          // sur un identifiant UID-stable pour éviter les doublons en cas
          // de ré-injection.
          const messageId = parsed.messageId ?? `imap-uid-${msg.uid}`

          // ── 5. Match client par email ──────────────────────────────────
          let clientId: string | null = null
          const { data: matched } = await supabase
            .from('clients')
            .select('id')
            .ilike('email', fromEmail)
            .limit(1)
            .maybeSingle()
          clientId = matched?.id ?? null

          // ── 6. Upsert ──────────────────────────────────────────────────
          const attachments = (parsed.attachments ?? []).map((a) => ({
            filename: a.filename ?? null,
            contentType: a.contentType ?? null,
            size: a.size ?? null,
            contentId: a.contentId ?? null,
          }))

          // .select() permet de distinguer un vrai insert d'un duplicate
          // (ignoreDuplicates renvoie [] sur conflit sans erreur).
          const { data: upserted, error } = await supabase
            .from('emails')
            .upsert(
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
            .select('id')

          if (error) {
            stats.errors.push(`insert_uid_${msg.uid}: ${error.message}`)
            stats.skipped++
            // Pas de \Seen sur erreur DB — on ré-essaiera au prochain run.
            continue
          }

          if ((upserted?.length ?? 0) > 0) {
            stats.inserted++
          } else {
            // Duplicate silencieux — l'email était déjà en base. On marque
            // quand même \Seen pour ne pas re-traiter à chaque cron.
            stats.skipped++
          }

          seenUidsToFlag.push(msg.uid)
        }

        // ── 7. Étape 3 : flag \Seen en batch, fetch terminé ──────────────
        // Un seul appel IMAP au lieu de N : plus rapide et n'expose pas
        // la connexion à des allers-retours pendant lesquels Hostinger
        // peut couper.
        if (seenUidsToFlag.length > 0) {
          try {
            await imap.messageFlagsAdd(seenUidsToFlag, ['\\Seen'], { uid: true })
          } catch (e) {
            stats.errors.push(`flag_batch: ${(e as Error).message}`)
          }
        }
      }
    } finally {
      lock.release()
    }
  } catch (e) {
    return res
      .status(502)
      .json({ error: 'imap_failure', message: (e as Error).message, stats })
  } finally {
    try {
      await imap.logout()
    } catch {
      // Logout error ignoré — la connexion sera fermée par GC.
    }
  }

  return res.status(200).json({
    ok: true,
    ...stats,
    total_unseen: totalUnseen,
    truncated,
    remaining: Math.max(0, totalUnseen - stats.inserted),
  })
}
