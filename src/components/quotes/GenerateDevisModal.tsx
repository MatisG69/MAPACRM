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
  const [includeCGV, setIncludeCGV] = useState(true)
  /** Projets additionnels du même client à combiner dans le devis */
  const [additionalProjectIds, setAdditionalProjectIds] = useState<string[]>([])
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

  // Projets additionnels candidats : tous les projets du même client (hors projet principal),
  // pour permettre au commercial de combiner plusieurs prestations dans un seul devis.
  const candidateProjects = selectedClient
    ? projects.filter(
        (p) => p.client_id === selectedClient.id && p.id !== projectId
      )
    : []
  const selectedAdditionalProjects = candidateProjects.filter((p) =>
    additionalProjectIds.includes(p.id)
  )
  const additionalTotal = selectedAdditionalProjects.reduce((s, p) => {
    const auto = getPriceForProject(p)
    return s + (auto ?? 0)
  }, 0)

  const autoPrice = selectedProject ? getPriceForProject(selectedProject) : null
  const needsManualPrice = selectedProject && autoPrice == null
  const parsedAmount = Number(amount)
  // Montant total = principal + somme des additionnels (chacun à son tarif auto)
  const grandTotal = parsedAmount + additionalTotal
  const canGenerate = !!selectedClient && grandTotal > 0 && !!title.trim() && !!quoteNumber.trim()

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
      setIncludeCGV(true)
      setAdditionalProjectIds([])
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
    if (!clientId) setClientId(selectedProject.client_id ?? '')
  }, [selectedProject])

  // Auto-compute deposit amount (30%) sur le GRAND TOTAL (principal + projets additionnels)
  useEffect(() => {
    if (depositRequested && grandTotal > 0) {
      setDepositAmount(String(Math.round(grandTotal * 0.3)))
    } else {
      setDepositAmount('')
    }
  }, [grandTotal, depositRequested])

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

      // Total facturé = principal + projets additionnels combinés
      const finalAmount = grandTotal

      // Note enrichie si plusieurs projets combinés (traçabilité dans la fiche devis)
      const combinedNote =
        selectedAdditionalProjects.length > 0
          ? `Devis combiné — projets inclus : ${[selectedProject, ...selectedAdditionalProjects]
              .filter((p): p is Project => !!p)
              .map((p) => p.name)
              .join(' / ')}`
          : null

      await onCreateQuote({
        client_id: selectedClient.id,
        project_id: selectedProject?.id ?? null,
        opportunity_id: null,
        title: title.trim(),
        quote_number: quoteNumber.trim(),
        amount: finalAmount,
        status,
        valid_until: validUntilFinal,
        deposit_requested: depositRequested,
        deposit_amount: parsedDeposit && parsedDeposit > 0 ? parsedDeposit : null,
        version,
        parent_quote_id: null,
        notes: [notes.trim() || null, combinedNote].filter(Boolean).join('\n') || null,
        signed_at: null,
      })

      const depositPercent =
        depositRequested && parsedDeposit && finalAmount
          ? Math.round((parsedDeposit / finalAmount) * 100)
          : 30

      const html = generateDevisHTML({
        client: selectedClient,
        project: selectedProject,
        amount: parsedAmount,
        additionalLines: selectedAdditionalProjects.map((p) => ({
          project: p,
          amount: getPriceForProject(p) ?? 0,
        })),
        quoteNumber: quoteNumber.trim(),
        validityDays: 30,
        depositPercent,
        customNotes: notes.trim() || undefined,
        includeCGV,
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
            <label className="form-label">Projet principal (optionnel)</label>
            <select
              className="input"
              value={projectId}
              onChange={(e) => {
                setProjectId(e.target.value)
                // Si on change le projet principal, on retire les éventuels duplicates
                setAdditionalProjectIds((ids) => ids.filter((id) => id !== e.target.value))
              }}
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

        {/* Combinaison de plusieurs projets dans un seul devis (même client) */}
        {candidateProjects.length > 0 && (
          <div className="space-y-2 rounded-2xl border border-ws-line bg-ws-deep/30 px-4 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold text-ws-paper">
                  Combiner d'autres projets du même client
                </h4>
                <p className="text-[10px] font-mono text-ws-mist mt-0.5">
                  Cochez les projets à inclure : chaque ligne s'ajoute au devis avec son tarif
                  standard.
                </p>
              </div>
              {selectedAdditionalProjects.length > 0 && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-ws-accent/15 text-ws-accent border border-ws-accent/35">
                  {selectedAdditionalProjects.length} sélectionné
                  {selectedAdditionalProjects.length > 1 ? 's' : ''}
                </span>
              )}
            </div>
            <ul className="space-y-1 max-h-48 overflow-y-auto pr-1">
              {candidateProjects.map((p) => {
                const checked = additionalProjectIds.includes(p.id)
                const auto = getPriceForProject(p)
                return (
                  <li key={p.id}>
                    <label
                      className={`flex items-center justify-between gap-3 rounded-lg px-3 py-2 cursor-pointer transition-colors ${
                        checked
                          ? 'bg-ws-accent/10 border border-ws-accent/35'
                          : 'border border-transparent hover:bg-ws-raised/40'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded accent-ws-accent flex-shrink-0"
                          checked={checked}
                          onChange={(e) => {
                            setAdditionalProjectIds((ids) =>
                              e.target.checked
                                ? [...ids, p.id]
                                : ids.filter((id) => id !== p.id)
                            )
                          }}
                        />
                        <div className="min-w-0">
                          <div className="text-sm text-ws-paper truncate">{p.name}</div>
                          {p.type && (
                            <div className="text-[10px] font-mono text-ws-mist uppercase tracking-[0.15em]">
                              {p.type}
                            </div>
                          )}
                        </div>
                      </div>
                      <span
                        className={`text-xs font-mono tabular-nums flex-shrink-0 ${
                          auto != null ? 'text-ws-accent' : 'text-ws-mist'
                        }`}
                      >
                        {auto != null ? `+ ${auto} €` : 'sur devis'}
                      </span>
                    </label>
                  </li>
                )
              })}
            </ul>
          </div>
        )}

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
            {selectedAdditionalProjects.length > 0 && (
              <p className="mt-1.5 text-[11px] font-mono text-ws-mist">
                <span className="text-ws-ink">+ {additionalTotal} €</span> pour{' '}
                {selectedAdditionalProjects.length} projet
                {selectedAdditionalProjects.length > 1 ? 's' : ''} supplémentaire
                {selectedAdditionalProjects.length > 1 ? 's' : ''} ={' '}
                <strong className="text-ws-accent tabular-nums">{grandTotal} € HT</strong> total
              </p>
            )}
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

        {/* Acompte demandé + Conditions générales de vente */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

          <div className="space-y-2">
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={includeCGV}
                onChange={(e) => setIncludeCGV(e.target.checked)}
                className="w-4 h-4 rounded accent-ws-accent"
              />
              <span className="text-sm text-ws-paper font-medium">Conditions générales de vente</span>
            </label>
            <p className="text-[11px] font-mono text-ws-mist leading-relaxed pl-[26px]">
              Joint les CGV en page 2 du PDF (même fichier). Recommandé pour tout envoi formel.
            </p>
          </div>
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
