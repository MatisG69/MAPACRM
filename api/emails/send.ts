/**
 * Vercel API Function — envoie un email via SMTP Hostinger et l'insère
 * dans la table `emails` (direction = 'outbound') pour qu'il apparaisse
 * dans la page CRM.
 *
 * Sécurité :
 * · Origin check : seules les requêtes provenant des origines autorisées
 *   (mapacrm.vercel.app + localhost dev) sont acceptées.
 * · Mot de passe SMTP en ENV Vercel uniquement.
 *
 * Auth applicative :
 * · Tant que la 2FA CRM n'est pas en place, l'origin check est la seule
 *   défense contre les abus externes (curl spoofé reste possible mais
 *   raise the bar). À durcir avec une vraie auth dès que le 2FA est posé.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'
import nodemailer from 'nodemailer'
import { createClient } from '@supabase/supabase-js'

export const maxDuration = 30

const ALLOWED_ORIGINS = new Set([
  'https://mapacrm.vercel.app',
  'http://localhost:5173',
  'http://localhost:5174',
])

interface SendBody {
  to: string | string[]
  subject: string
  text?: string
  html?: string
  /** Pour les réponses : Message-ID du mail d'origine. */
  in_reply_to?: string | null
  /** Si on répond à un email lié à un client, on copie le client_id. */
  client_id?: string | null
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function normaliseRecipients(value: string | string[]): string[] {
  const arr = Array.isArray(value) ? value : [value]
  return arr
    .flatMap((v) => v.split(/[,;]/))
    .map((v) => v.trim())
    .filter(Boolean)
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // ── 1. CORS / méthode ────────────────────────────────────────────────
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method_not_allowed' })
  }

  // ── 2. Origin allowlist ──────────────────────────────────────────────
  const origin = req.headers.origin
  if (origin && !ALLOWED_ORIGINS.has(origin)) {
    return res.status(403).json({ error: 'forbidden_origin', origin })
  }

  // ── 3. ENV check ─────────────────────────────────────────────────────
  const smtpHost = process.env.HOSTINGER_SMTP_HOST ?? 'smtp.hostinger.com'
  const smtpPort = Number(process.env.HOSTINGER_SMTP_PORT ?? 465)
  const smtpUser = process.env.HOSTINGER_SMTP_USER ?? process.env.HOSTINGER_IMAP_USER
  const smtpPass = process.env.HOSTINGER_SMTP_PASSWORD ?? process.env.HOSTINGER_IMAP_PASSWORD
  const fromName = process.env.HOSTINGER_SMTP_FROM_NAME ?? 'MAPA Développement'
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  const missing = [
    !smtpUser && 'HOSTINGER_SMTP_USER (ou HOSTINGER_IMAP_USER)',
    !smtpPass && 'HOSTINGER_SMTP_PASSWORD (ou HOSTINGER_IMAP_PASSWORD)',
    !supabaseUrl && 'SUPABASE_URL',
    !supabaseKey && 'SUPABASE_SERVICE_ROLE_KEY',
  ].filter(Boolean)
  if (missing.length > 0) {
    return res.status(500).json({ error: 'missing_env', missing })
  }

  // ── 4. Validation body ───────────────────────────────────────────────
  const body = (typeof req.body === 'string' ? JSON.parse(req.body) : req.body) as Partial<SendBody>
  if (!body || typeof body !== 'object') {
    return res.status(400).json({ error: 'invalid_body' })
  }

  const recipients = body.to ? normaliseRecipients(body.to) : []
  if (recipients.length === 0) {
    return res.status(400).json({ error: 'missing_to' })
  }
  for (const r of recipients) {
    if (!isValidEmail(r)) {
      return res.status(400).json({ error: 'invalid_recipient', value: r })
    }
  }

  const subject = body.subject?.trim() || '(sans objet)'
  const text = body.text?.trim() ?? ''
  const html = body.html?.trim() || undefined
  if (!text && !html) {
    return res.status(400).json({ error: 'missing_body' })
  }

  // ── 5. Envoi SMTP ────────────────────────────────────────────────────
  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    // Port 465 = TLS implicite ; port 587 = STARTTLS.
    secure: smtpPort === 465,
    auth: { user: smtpUser!, pass: smtpPass! },
  })

  const sentAt = new Date()
  const messageId = `<${sentAt.getTime()}.${Math.random().toString(36).slice(2)}@mapa-developpement.fr>`

  let info
  try {
    info = await transporter.sendMail({
      from: `"${fromName}" <${smtpUser}>`,
      to: recipients.join(', '),
      subject,
      text: text || undefined,
      html,
      messageId,
      inReplyTo: body.in_reply_to ?? undefined,
      references: body.in_reply_to ?? undefined,
    })
  } catch (e) {
    return res
      .status(502)
      .json({ error: 'smtp_failure', message: (e as Error).message })
  }

  // ── 6. Insert en base (direction = outbound) ─────────────────────────
  const supabase = createClient(supabaseUrl!, supabaseKey!, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  // Si pas de client_id fourni, on tente de matcher le destinataire principal.
  let clientId = body.client_id ?? null
  if (!clientId) {
    const { data: matched } = await supabase
      .from('clients')
      .select('id')
      .ilike('email', recipients[0])
      .limit(1)
      .maybeSingle()
    clientId = matched?.id ?? null
  }

  const { error: insertErr } = await supabase.from('emails').insert({
    message_id: info.messageId ?? messageId,
    from_email: smtpUser!.toLowerCase(),
    from_name: fromName,
    to_email: recipients.join(', '),
    subject,
    body_text: text || null,
    body_html: html ?? null,
    received_at: sentAt.toISOString(),
    client_id: clientId,
    direction: 'outbound',
    read: true,
    archived: false,
    attachments: [],
  })

  if (insertErr) {
    // L'email a été envoyé : on retourne succès, mais on flag l'insert raté.
    return res.status(200).json({
      ok: true,
      sent: true,
      messageId: info.messageId,
      db_insert_failed: insertErr.message,
    })
  }

  return res.status(200).json({
    ok: true,
    sent: true,
    messageId: info.messageId,
    accepted: info.accepted,
    rejected: info.rejected,
  })
}
