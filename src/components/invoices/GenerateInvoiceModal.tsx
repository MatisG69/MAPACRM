import { useState, useEffect, useMemo } from 'react'
import { FileText, Loader2, Eye } from 'lucide-react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { InvoicePreviewOverlay } from './InvoicePreviewOverlay'
import { generateInvoiceHTML, getPriceForProject } from '../../lib/invoiceGenerator'
import { generateInvoiceNumber } from '../../lib/utils'
import type { Client, Invoice, InvoiceStatus, Project, Quote } from '../../lib/types'

interface GenerateInvoiceModalProps {
  isOpen: boolean
  onClose: () => void
  clients: Client[]
  projects: Project[]
  /** Devis disponibles (pour pré-remplir depuis un devis signé) */
  quotes: Quote[]
  onCreateInvoice: (
    data: Omit<Invoice, 'id' | 'created_at' | 'updated_at' | 'client' | 'project'>
  ) => Promise<Invoice>
}

const STATUS_OPTIONS: { value: InvoiceStatus; label: string }[] = [
  { value: 'draft', label: 'Brouillon' },
  { value: 'sent', label: 'Envoyée' },
  { value: 'paid', label: 'Réglée' },
  { value: 'overdue', label: 'En retard' },
  { value: 'cancelled', label: 'Annulée' },
]

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}
function plusDaysISO(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

export function GenerateInvoiceModal({
  isOpen,
  onClose,
  clients,
  projects,
  quotes,
  onCreateInvoice,
}: GenerateInvoiceModalProps) {
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [clientId, setClientId] = useState('')
  const [projectId, setProjectId] = useState('')
  const [sourceQuoteId, setSourceQuoteId] = useState('')
  const [amount, setAmount] = useState<string>('')
  const [issueDate, setIssueDate] = useState(todayISO())
  const [dueDate, setDueDate] = useState(plusDaysISO(30))
  const [alreadyPaid, setAlreadyPaid] = useState<string>('')
  const [additionalProjectIds, setAdditionalProjectIds] = useState<string[]>([])
  const [status, setStatus] = useState<InvoiceStatus>('sent')
  const [notes, setNotes] = useState('')
  const [previewHtml, setPreviewHtml] = useState<string | null>(null)
  const [previewFilename, setPreviewFilename] = useState('')
  const [generating, setGenerating] = useState(false)
  const [saveAfterPreview, setSaveAfterPreview] = useState(true)

  const selectedProject = projects.find((p) => p.id === projectId) ?? null
  const selectedClient = clientId
    ? clients.find((c) => c.id === clientId) ?? null
    : selectedProject
    ? clients.find((c) => c.id === selectedProject.client_id) ?? null
    : null

  // Devis du client sélectionné, statut signé en priorité
  const clientQuotes = useMemo(
    () =>
      selectedClient
        ? quotes
            .filter((q) => q.client_id === selectedClient.id)
            .sort((a, b) => {
              const order = (s: string) => (s === 'signed' ? 0 : s === 'sent' ? 1 : 2)
              return order(a.status) - order(b.status)
            })
        : [],
    [quotes, selectedClient]
  )

  const candidateProjects = selectedClient
    ? projects.filter((p) => p.client_id === selectedClient.id && p.id !== projectId)
    : []
  const selectedAdditionalProjects = candidateProjects.filter((p) =>
    additionalProjectIds.includes(p.id)
  )
  const additionalTotal = selectedAdditionalProjects.reduce((s, p) => {
    const auto = getPriceForProject(p)
    return s + (auto ?? 0)
  }, 0)

  const autoPrice = selectedProject ? getPriceForProject(selectedProject) : null
  const parsedAmount = Number(amount)
  const grandTotal = parsedAmount + additionalTotal
  const parsedPaid = Number(alreadyPaid) || 0
  const balance = Math.max(0, grandTotal - parsedPaid)
  const canGenerate = !!selectedClient && grandTotal > 0 && !!invoiceNumber.trim()

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setInvoiceNumber('')
      setClientId('')
      setProjectId('')
      setSourceQuoteId('')
      setAmount('')
      setIssueDate(todayISO())
      setDueDate(plusDaysISO(30))
      setAlreadyPaid('')
      setAdditionalProjectIds([])
      setStatus('sent')
      setNotes('')
      setPreviewHtml(null)
    } else {
      // Auto-générer un numéro de facture à l'ouverture si vide
      setInvoiceNumber((prev) => prev || generateInvoiceNumber())
    }
  }, [isOpen])

  // Auto-remplir le montant quand projet sélectionné
  useEffect(() => {
    if (selectedProject && autoPrice != null && !amount) {
      setAmount(String(autoPrice))
    }
  }, [selectedProject, autoPrice, amount])

  // Pré-remplir depuis devis source
  const handlePickQuote = (quoteId: string) => {
    setSourceQuoteId(quoteId)
    if (!quoteId) return
    const q = quotes.find((x) => x.id === quoteId)
    if (!q) return
    setClientId(q.client_id)
    if (q.project_id) setProjectId(q.project_id)
    setAmount(String(q.amount))
    if (q.deposit_requested && q.deposit_amount) {
      setAlreadyPaid(String(q.deposit_amount))
    }
    if (!notes.trim()) {
      setNotes(`Facture suite au devis ${q.quote_number ?? q.title}.`)
    }
  }

  const buildHTML = () => {
    if (!selectedClient) return null
    return generateInvoiceHTML({
      client: selectedClient,
      project: selectedProject,
      amount: parsedAmount,
      invoiceNumber: invoiceNumber.trim(),
      issueDateISO: issueDate || undefined,
      dueDateISO: dueDate || undefined,
      alreadyPaid: parsedPaid,
      customNotes: notes.trim() || undefined,
      sourceQuoteRef:
        sourceQuoteId && quotes.find((q) => q.id === sourceQuoteId)?.quote_number
          ? quotes.find((q) => q.id === sourceQuoteId)!.quote_number!
          : undefined,
      additionalLines: selectedAdditionalProjects.map((p) => ({
        project: p,
        amount: getPriceForProject(p) ?? 0,
      })),
    })
  }

  const handlePreview = async () => {
    if (!canGenerate) return
    setGenerating(true)
    try {
      const html = buildHTML()
      if (!html) return
      setPreviewFilename(`facture-${invoiceNumber.trim()}.pdf`)
      setPreviewHtml(html)

      // Création automatique de l'enregistrement Invoice (si activé)
      if (saveAfterPreview && selectedClient) {
        try {
          await onCreateInvoice({
            client_id: selectedClient.id,
            project_id: selectedProject?.id ?? null,
            invoice_number: invoiceNumber.trim(),
            amount: grandTotal,
            status,
            due_date: dueDate || null,
            paid_date: status === 'paid' ? todayISO() : null,
            notes: notes.trim() || null,
            source_quote_id: sourceQuoteId || null,
          })
        } catch {
          /* save échoué — on laisse l'aperçu PDF dispo quand même */
        }
      }
    } finally {
      setGenerating(false)
    }
  }

  if (previewHtml) {
    return (
      <InvoicePreviewOverlay
        html={previewHtml}
        filename={previewFilename}
        onBack={() => setPreviewHtml(null)}
        onClose={onClose}
      />
    )
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Générer une facture PDF" size="lg">
      <div className="space-y-4">
        {/* N° + Statut */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="form-label">N° de facture *</label>
            <input
              type="text"
              className="input font-mono"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              placeholder="ex : FAC-202604-0001"
            />
          </div>
          <div>
            <label className="form-label">Statut</label>
            <select
              className="input"
              value={status}
              onChange={(e) => setStatus(e.target.value as InvoiceStatus)}
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Pré-remplir depuis devis */}
        {clientQuotes.length > 0 && (
          <div>
            <label className="form-label">Pré-remplir depuis un devis (facultatif)</label>
            <select
              className="input"
              value={sourceQuoteId}
              onChange={(e) => handlePickQuote(e.target.value)}
            >
              <option value="">— Aucun (saisie manuelle) —</option>
              {clientQuotes.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.quote_number ?? '—'} · {q.title} · {Math.round(q.amount).toLocaleString('fr-FR')} €
                  {q.status === 'signed' ? ' · ✓ signé' : ''}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Client + Projet */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="form-label">Client *</label>
            <select
              className="input"
              value={clientId}
              onChange={(e) => {
                setClientId(e.target.value)
                setProjectId('')
                setAdditionalProjectIds([])
              }}
            >
              <option value="">— Sélectionner un client —</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.company && c.company !== c.name ? ` · ${c.company}` : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label">Projet principal</label>
            <select
              className="input"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              disabled={!selectedClient}
            >
              <option value="">— Aucun projet rattaché —</option>
              {projects
                .filter((p) => !selectedClient || p.client_id === selectedClient.id)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
            </select>
          </div>
        </div>

        {/* Projets additionnels */}
        {candidateProjects.length > 0 && (
          <div>
            <label className="form-label">Projets additionnels du même client (multi-prestations)</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {candidateProjects.map((p) => {
                const checked = additionalProjectIds.includes(p.id)
                const price = getPriceForProject(p)
                return (
                  <label
                    key={p.id}
                    className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl border text-xs cursor-pointer transition-colors ${
                      checked
                        ? 'bg-ws-accent/15 border-ws-accent/40 text-ws-paper'
                        : 'bg-ws-deep/40 border-ws-line text-ws-mist hover:text-ws-paper hover:border-ws-accent/30'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        if (e.target.checked)
                          setAdditionalProjectIds((arr) => [...arr, p.id])
                        else
                          setAdditionalProjectIds((arr) => arr.filter((id) => id !== p.id))
                      }}
                      className="accent-ws-accent"
                    />
                    <span>{p.name}</span>
                    {price != null && (
                      <span className="font-mono text-ws-accent">+ {price.toLocaleString('fr-FR')} €</span>
                    )}
                  </label>
                )
              })}
            </div>
          </div>
        )}

        {/* Montant + Acompte */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="form-label">
              Montant HT (projet principal) *
              {autoPrice != null && (
                <span className="text-xs font-normal text-ws-mist ml-2">
                  · auto : {autoPrice.toLocaleString('fr-FR')} €
                </span>
              )}
            </label>
            <input
              type="number"
              className="input font-mono"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              min={0}
              step="any"
            />
          </div>
          <div>
            <label className="form-label">Acompte déjà perçu (€)</label>
            <input
              type="number"
              className="input font-mono"
              value={alreadyPaid}
              onChange={(e) => setAlreadyPaid(e.target.value)}
              placeholder="0"
              min={0}
              step="any"
            />
          </div>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="form-label">Date d'émission</label>
            <input
              type="date"
              className="input font-mono"
              value={issueDate}
              onChange={(e) => setIssueDate(e.target.value)}
            />
          </div>
          <div>
            <label className="form-label">Date d'échéance</label>
            <input
              type="date"
              className="input font-mono"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
        </div>

        {/* Récap calculé */}
        <div className="rounded-xl border border-ws-line bg-ws-deep/40 p-3.5 space-y-1 text-xs font-mono">
          <div className="flex justify-between">
            <span className="text-ws-mist">Total HT</span>
            <span className="text-ws-paper">{grandTotal.toLocaleString('fr-FR')} €</span>
          </div>
          {parsedPaid > 0 && (
            <div className="flex justify-between">
              <span className="text-ws-mist">- Acompte déjà perçu</span>
              <span className="text-ws-paper">{parsedPaid.toLocaleString('fr-FR')} €</span>
            </div>
          )}
          <div className="flex justify-between border-t border-ws-line/40 pt-1.5 mt-1.5">
            <span className="text-ws-accent uppercase tracking-[0.18em] text-[10px]">
              {parsedPaid > 0 ? 'Reste à régler' : 'Net à payer'}
            </span>
            <span className="text-ws-accent text-sm">{balance.toLocaleString('fr-FR')} €</span>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="form-label">Notes (facultatif)</label>
          <textarea
            className="input min-h-[60px]"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="ex : Solde sur projet site vitrine. Acompte de 30% perçu le 15/03/2026."
          />
        </div>

        {/* Save toggle */}
        <label className="flex items-center gap-2 text-xs text-ws-ink cursor-pointer select-none">
          <input
            type="checkbox"
            checked={saveAfterPreview}
            onChange={(e) => setSaveAfterPreview(e.target.checked)}
            className="accent-ws-accent w-4 h-4"
          />
          Enregistrer la facture dans le CRM en parallèle de l'aperçu PDF
        </label>

        <div className="flex gap-2 justify-end pt-2">
          <Button variant="secondary" onClick={onClose} className="normal-case tracking-normal">
            Annuler
          </Button>
          <Button
            icon={generating ? <Loader2 size={14} className="animate-spin" /> : <Eye size={14} />}
            onClick={handlePreview}
            disabled={!canGenerate || generating}
            className="normal-case tracking-normal"
          >
            {generating ? 'Génération…' : 'Aperçu'}
          </Button>
        </div>

        {!canGenerate && (
          <div className="flex items-start gap-2 text-[11px] text-ws-mist">
            <FileText size={12} className="mt-0.5 flex-shrink-0" />
            <span>
              Renseigne au minimum un client, un n° de facture et un montant supérieur à 0.
            </span>
          </div>
        )}
      </div>
    </Modal>
  )
}
