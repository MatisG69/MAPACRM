import { useEffect, useRef, useState } from 'react'
import { Loader2, Send, X } from 'lucide-react'

interface ComposeEmailModalProps {
  isOpen: boolean
  onClose: () => void
  onSend: (payload: {
    to: string
    subject: string
    text: string
    in_reply_to?: string | null
    client_id?: string | null
  }) => Promise<{ ok: boolean; error?: string }>
  /** Pré-remplissage pour réponse / forward. */
  prefill?: {
    to?: string
    subject?: string
    quotedBody?: string
    inReplyTo?: string | null
    clientId?: string | null
  }
  mode?: 'compose' | 'reply'
}

export function ComposeEmailModal({
  isOpen,
  onClose,
  onSend,
  prefill,
  mode = 'compose',
}: ComposeEmailModalProps) {
  const [to, setTo] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bodyRef = useRef<HTMLTextAreaElement | null>(null)

  // Reset / pré-remplit à chaque ouverture
  useEffect(() => {
    if (!isOpen) return
    setTo(prefill?.to ?? '')
    setSubject(prefill?.subject ?? '')
    setBody(prefill?.quotedBody ? `\n\n${prefill.quotedBody}` : '')
    setError(null)
    // Focus en haut du body pour rédiger au-dessus de la citation
    setTimeout(() => {
      bodyRef.current?.focus()
      bodyRef.current?.setSelectionRange(0, 0)
    }, 50)
  }, [isOpen, prefill])

  const handleClose = () => {
    if (submitting) return
    onClose()
  }

  const handleSend = async () => {
    setError(null)
    if (!to.trim()) {
      setError('Destinataire requis')
      return
    }
    if (!body.trim()) {
      setError('Corps du message vide')
      return
    }
    setSubmitting(true)
    const result = await onSend({
      to: to.trim(),
      subject: subject.trim() || '(sans objet)',
      text: body,
      in_reply_to: prefill?.inReplyTo ?? null,
      client_id: prefill?.clientId ?? null,
    })
    setSubmitting(false)
    if (!result.ok) {
      setError(result.error ?? "Échec de l'envoi")
      return
    }
    onClose()
  }

  if (!isOpen) return null

  const title = mode === 'reply' ? 'Répondre' : 'Nouveau message'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-ws-void/80 backdrop-blur-sm"
      onClick={handleClose}
    >
      <div
        className="w-full max-w-2xl rounded-2xl border border-ws-line bg-ws-panel shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-ws-line flex items-center justify-between flex-shrink-0">
          <h4 className="font-display text-base font-semibold text-ws-paper">{title}</h4>
          <button
            type="button"
            onClick={handleClose}
            disabled={submitting}
            className="text-ws-mist hover:text-ws-paper transition-colors disabled:opacity-50"
            aria-label="Fermer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          <div>
            <label className="text-[10px] font-mono uppercase tracking-[0.2em] text-ws-mist block mb-1">
              À
            </label>
            <input
              type="email"
              multiple
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="exemple@client.fr (séparer par , pour plusieurs)"
              className="w-full px-3 py-2 rounded-lg bg-ws-deep border border-ws-line text-ws-paper text-sm focus:outline-none focus:border-ws-accent/50"
              autoComplete="email"
              disabled={submitting}
            />
          </div>

          <div>
            <label className="text-[10px] font-mono uppercase tracking-[0.2em] text-ws-mist block mb-1">
              Sujet
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Objet du message"
              className="w-full px-3 py-2 rounded-lg bg-ws-deep border border-ws-line text-ws-paper text-sm focus:outline-none focus:border-ws-accent/50"
              disabled={submitting}
            />
          </div>

          <div className="flex-1 flex flex-col">
            <label className="text-[10px] font-mono uppercase tracking-[0.2em] text-ws-mist block mb-1">
              Message
            </label>
            <textarea
              ref={bodyRef}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={14}
              placeholder="Rédigez votre message ici…"
              className="w-full px-3 py-2 rounded-lg bg-ws-deep border border-ws-line text-ws-paper text-sm resize-none focus:outline-none focus:border-ws-accent/50 font-sans leading-relaxed"
              disabled={submitting}
            />
          </div>

          {error && (
            <div className="text-xs text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-ws-line flex items-center justify-between gap-3 flex-shrink-0">
          <span className="text-[10px] font-mono text-ws-mist">
            Envoi via SMTP Hostinger
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={submitting}
              className="px-4 py-2 rounded-lg text-sm text-ws-mist hover:text-ws-paper transition-colors disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleSend}
              disabled={submitting || !to.trim() || !body.trim()}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-ws-accent text-ws-void hover:bg-ws-accent/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
            >
              {submitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Envoi…
                </>
              ) : (
                <>
                  <Send size={14} />
                  Envoyer
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
