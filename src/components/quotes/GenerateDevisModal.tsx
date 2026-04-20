import { useState, useEffect } from 'react'
import { FileText, Loader2 } from 'lucide-react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { DevisPreviewOverlay } from './DevisPreviewOverlay'
import { generateDevisHTML, getPriceForProject } from '../../lib/devisGenerator'
import { generateQuoteNumber } from '../../lib/utils'
import type { Client, Invoice, Project, Quote, QuoteStatus } from '../../lib/types'

interface GenerateDevisModalProps {
  isOpen: boolean
  onClose: () => void
  clients: Client[]
  projects: Project[]
  onCreateQuote: (data: Omit<Quote, 'id' | 'created_at' | 'updated_at' | 'client' | 'project' | 'opportunity'>) => Promise<Quote>
  onCreateInvoice?: (data: Omit<Invoice, 'id' | 'created_at' | 'updated_at' | 'client' | 'project'>) => Promise<Invoice>
}

const STATUS_OPTIONS: { value: QuoteStatus; label: string }[] = [
  { value: 'draft', label: 'Brouillon' },
  { value: 'sent', label: 'Envoyé' },
  { value: 'signed', label: 'Signé' },
  { value: 'refused', label: 'Refusé' },
  { value: 'expired', label: 'Expiré' },
]

export function GenerateDevisModal({
  isOpen,
  onClose,
  clients,
  projects,
  onCreateQuote,
}: GenerateDevisModalProps) {
  const [title, setTitle] = useState('')
  const [quoteNumber, setQuoteNumber] = useState('')
  const [version, setVersion] = useState(1)
  const [clientId, setClientId] = useState('')
  const [projectId, setProjectId] = useState('')
  const [amount, setAmount] = useState<string>('')
  const [validUntil, setValidUntil] = useState('')
  const [depositRequested, setDepositRequested] = useState(true)
  const [depositAmount, setDepositAmount] = useState<string>('')
  const [status, setStatus] = useState<QuoteStatus>('draft')
  const [notes, setNotes] = useState('')
  const [previewHtml, setPreviewHtml] = useState<string | null>(null)
  const [previewFilename, setPreviewFilename] = useState('')
  const [generating, setGenerating] = useState(false)

  const selectedProject = projects.find((p) => p.id === projectId) ?? null
  const selectedClient = clientId
    ? clients.find((c) => c.id === clientId) ?? null
    : selectedProject
    ? clients.find((c) => c.id === selectedProject.client_id) ?? null
    : null

  const autoPrice = selectedProject ? getPriceForProject(selectedProject) : null
  const needsManualPrice = selectedProject && autoPrice == null
  const parsedAmount = Number(amount)
  const canGenerate = !!selectedClient && parsedAmount > 0 && !!title.trim() && !!quoteNumber.trim()

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setTitle('')
      setQuoteNumber('')
      setVersion(1)
      setClientId('')
      setProjectId('')
      setAmount('')
      setValidUntil('')
      setDepositRequested(true)
      setDepositAmount('')
      setStatus('draft')
      setNotes('')
      setPreviewHtml(null)
    } else {
      // Auto-generate quote number on open
      setQuoteNumber(generateQuoteNumber())
      // Default validity: 30 days from today
      const d = new Date()
      d.setDate(d.getDate() + 30)
      setValidUntil(d.toISOString().split('T')[0])
    }
  }, [isOpen])

  // Auto-fill amount from project pricing
  useEffect(() => {
    if (!selectedProject) return
    const auto = getPriceForProject(selectedProject)
    if (auto != null) setAmount(String(auto))
  }, [selectedProject])

  // Auto-fill title from project/client selection
  useEffect(() => {
    if (title) return
    if (selectedProject) {
      setTitle(`Devis — ${selectedProject.name}`)
    } else if (selectedClient) {
      setTitle(`Devis — ${selectedClient.name}`)
    }
  }, [selectedProject, selectedClient])

  // Auto-fill clientId from project
  useEffect(() => {
    if (!selectedProject) return
    if (!clientId) setClientId(selectedProject.client_id)
  }, [selectedProject])

  // Auto-compute deposit amount (30%) when amount or depositRequested changes
  useEffect(() => {
    if (depositRequested && parsedAmount > 0) {
      setDepositAmount(String(Math.round(parsedAmount * 0.3)))
    } else {
      setDepositAmount('')
    }
  }, [parsedAmount, depositRequested])

  const handleGenerate = async () => {
    if (!selectedClient) return
    setGenerating(true)
    try {
      const parsedDeposit = depositRequested ? Number(depositAmount) : null
      const validUntilFinal = validUntil || (() => {
        const d = new Date()
        d.setDate(d.getDate() + 30)
        return d.toISOString().split('T')[0]
      })()

      await onCreateQuote({
        client_id: selectedClient.id,
        project_id: selectedProject?.id ?? null,
        opportunity_id: null,
        title: title.trim(),
        quote_number: quoteNumber.trim(),
        amount: parsedAmount,
        status,
        valid_until: validUntilFinal,
        deposit_requested: depositRequested,
        deposit_amount: parsedDeposit && parsedDeposit > 0 ? parsedDeposit : null,
        version,
        parent_quote_id: null,
        notes: notes.trim() || null,
        signed_at: null,
      })

      const depositPercent =
        depositRequested && parsedDeposit && parsedAmount
          ? Math.round((parsedDeposit / parsedAmount) * 100)
          : 30

      const html = generateDevisHTML({
        client: selectedClient,
        project: selectedProject,
        amount: parsedAmount,
        quoteNumber: quoteNumber.trim(),
        validityDays: 30,
        depositPercent,
        customNotes: notes.trim() || undefined,
      })

      setPreviewFilename(`devis-${quoteNumber.trim()}.pdf`)
      setPreviewHtml(html)
    } finally {
      setGenerating(false)
    }
  }

  if (previewHtml) {
    return (
      <DevisPreviewOverlay
        html={previewHtml}
        filename={previewFilename}
        onBack={() => setPreviewHtml(null)}
        onClose={onClose}
      />
    )
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Générer un devis PDF" size="lg">
      <div className="space-y-4">

        {/* Row: Titre + N° de devis */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="form-label">Titre du devis *</label>
            <input
              type="text"
              className="input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="ex : Devis — Site vitrine"
            />
          </div>
          <div>
            <label className="form-label">N° de devis *</label>
            <input
              type="text"
              className="input font-mono"
              value={quoteNumber}
              onChange={(e) => setQuoteNumber(e.target.value)}
              placeholder="ex : DEV-2024-001"
            />
          </div>
        </div>

        {/* Row: Version + Status */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="form-label">Version</label>
            <input
              type="number"
              className="input font-mono"
              value={version}
              onChange={(e) => setVersion(Math.max(1, Number(e.target.value)))}
              min={1}
              placeholder="1"
            />
          </div>
          <div>
            <label className="form-label">Statut</label>
            <select className="input" value={status} onChange={(e) => setStatus(e.target.value as QuoteStatus)}>
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Row: Client + Projet */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="form-label">Client *</label>
            <select
              className="input"
              value={clientId}
              onChange={(e) => {
                setClientId(e.target.value)
                setProjectId('')
              }}
            >
              <option value="">— Sélectionner un client —</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}{c.company && c.company !== c.name ? ` · ${c.company}` : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label">Projet (optionnel)</label>
            <select
              className="input"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
            >
              <option value="">— Aucun projet —</option>
              {projects
                .filter((p) => !clientId || p.client_id === clientId)
                .map((p) => {
                  const client = clients.find((c) => c.id === p.client_id)
                  return (
                    <option key={p.id} value={p.id}>
                      {p.name}{!clientId && client ? ` · ${client.name}` : ''}
                    </option>
                  )
                })}
            </select>
          </div>
        </div>

        {/* Row: Montant + Valide jusqu'au */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="form-label">
              Montant TTC (€) *
              {autoPrice != null && (
                <span className="ml-2 text-ws-bull normal-case font-normal">— tarif standard</span>
              )}
              {needsManualPrice && (
                <span className="ml-2 text-ws-gold normal-case font-normal">— à renseigner</span>
              )}
            </label>
            <input
              type="number"
              className="input font-mono"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="ex : 800"
              min={1}
            />
          </div>
          <div>
            <label className="form-label">Valide jusqu'au</label>
            <input
              type="date"
              className="input font-mono"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
            />
          </div>
        </div>

        {/* Acompte demandé */}
        <div className="space-y-2">
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={depositRequested}
              onChange={(e) => setDepositRequested(e.target.checked)}
              className="w-4 h-4 rounded accent-ws-accent"
            />
            <span className="text-sm text-ws-paper font-medium">Acompte demandé</span>
          </label>
          {depositRequested && (
            <div>
              <label className="form-label">Montant de l'acompte (€)</label>
              <input
                type="number"
                className="input font-mono"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                placeholder="ex : 240"
                min={1}
              />
            </div>
          )}
        </div>

        {/* Notes */}
        <div>
          <label className="form-label">Notes (optionnel)</label>
          <textarea
            className="input resize-none"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Mention spécifique à ajouter au devis…"
          />
        </div>

        <div className="flex gap-3 pt-1">
          <Button variant="secondary" className="flex-1 normal-case tracking-normal" onClick={onClose}>
            Annuler
          </Button>
          <Button
            className="flex-1 normal-case tracking-normal"
            icon={generating ? <Loader2 size={15} className="animate-spin" /> : <FileText size={15} />}
            disabled={!canGenerate || generating}
            onClick={handleGenerate}
          >
            {generating ? 'Création…' : 'Aperçu & PDF'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
