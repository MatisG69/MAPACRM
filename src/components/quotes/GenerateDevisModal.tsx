import { useState, useEffect } from 'react'
import { FileText, Loader2 } from 'lucide-react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { DevisPreviewOverlay } from './DevisPreviewOverlay'
import { generateDevisHTML, getPriceForProject } from '../../lib/devisGenerator'
import { generateQuoteNumber } from '../../lib/utils'
import type { Client, Invoice, Project, Quote } from '../../lib/types'

interface GenerateDevisModalProps {
  isOpen: boolean
  onClose: () => void
  clients: Client[]
  projects: Project[]
  onCreateQuote: (data: Omit<Quote, 'id' | 'created_at' | 'updated_at' | 'client' | 'project' | 'opportunity'>) => Promise<Quote>
  onCreateInvoice?: (data: Omit<Invoice, 'id' | 'created_at' | 'updated_at' | 'client' | 'project'>) => Promise<Invoice>
}

export function GenerateDevisModal({
  isOpen,
  onClose,
  clients,
  projects,
  onCreateQuote,
}: GenerateDevisModalProps) {
  const [projectId, setProjectId] = useState('')
  const [amount, setAmount] = useState<string>('')
  const [notes, setNotes] = useState('')
  const [previewHtml, setPreviewHtml] = useState<string | null>(null)
  const [previewFilename, setPreviewFilename] = useState('')
  const [generating, setGenerating] = useState(false)

  const selectedProject = projects.find((p) => p.id === projectId) ?? null
  const selectedClient = selectedProject
    ? clients.find((c) => c.id === selectedProject.client_id) ?? null
    : null

  useEffect(() => {
    if (!isOpen) {
      setProjectId('')
      setAmount('')
      setNotes('')
      setPreviewHtml(null)
    }
  }, [isOpen])

  useEffect(() => {
    if (!selectedProject) {
      setAmount('')
      return
    }
    const auto = getPriceForProject(selectedProject)
    setAmount(auto != null ? String(auto) : '')
  }, [selectedProject])

  const parsedAmount = Number(amount)
  const canGenerate = !!selectedClient && parsedAmount > 0
  const autoPrice = selectedProject ? getPriceForProject(selectedProject) : null
  const needsManualPrice = selectedProject && autoPrice == null

  const handleGenerate = async () => {
    if (!selectedClient) return
    setGenerating(true)
    try {
      const quoteNumber = generateQuoteNumber()
      const depositAmount = Math.round(parsedAmount * 0.3)

      const validUntilDate = new Date()
      validUntilDate.setDate(validUntilDate.getDate() + 30)
      const validUntil = validUntilDate.toISOString().split('T')[0]

      await onCreateQuote({
        client_id: selectedClient.id,
        project_id: selectedProject?.id ?? null,
        opportunity_id: null,
        title: selectedProject
          ? `Devis — ${selectedProject.name}`
          : `Devis — ${selectedClient.name}`,
        quote_number: quoteNumber,
        amount: parsedAmount,
        status: 'draft',
        valid_until: validUntil,
        deposit_requested: true,
        deposit_amount: depositAmount,
        version: 1,
        parent_quote_id: null,
        notes: notes.trim() || null,
        signed_at: null,
      })

      const html = generateDevisHTML({
        client: selectedClient,
        project: selectedProject,
        amount: parsedAmount,
        quoteNumber,
        validityDays: 30,
        depositPercent: 30,
        customNotes: notes.trim() || undefined,
      })

      setPreviewFilename(`devis-${quoteNumber}.pdf`)
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
    <Modal isOpen={isOpen} onClose={onClose} title="Générer un devis PDF" size="md">
      <div className="space-y-4">
        <div>
          <label className="form-label">Projet *</label>
          <select className="input" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
            <option value="">— Sélectionner un projet —</option>
            {projects.map((p) => {
              const client = clients.find((c) => c.id === p.client_id)
              return (
                <option key={p.id} value={p.id}>
                  {p.name}{client ? ` · ${client.name}` : ''}
                </option>
              )
            })}
          </select>
        </div>

        {selectedClient && (
          <div className="ws-card rounded-lg px-3 py-2 text-xs font-mono text-ws-mist">
            Client : <span className="text-ws-paper">{selectedClient.name}</span>
            {selectedClient.company && selectedClient.company !== selectedClient.name && (
              <span className="text-ws-ink"> · {selectedClient.company}</span>
            )}
          </div>
        )}

        <div>
          <label className="form-label">
            Montant TTC (€) *
            {autoPrice != null && (
              <span className="ml-2 text-ws-bull normal-case font-normal">— tarif standard appliqué</span>
            )}
            {needsManualPrice && (
              <span className="ml-2 text-ws-gold normal-case font-normal">— à renseigner manuellement</span>
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
          <label className="form-label">Note personnalisée (optionnel)</label>
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
