import { useState, useEffect, useMemo } from 'react'
import { FileText, Loader2, Eye } from 'lucide-react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { InvoicePreviewOverlay } from './InvoicePreviewOverlay'
import {
  generateInvoiceHTML,
  generatePairedInvoiceHTML,
  getPriceForProject,
  MAPA_VENDOR,
} from '../../lib/invoiceGenerator'
import { generateInvoiceNumber, nextInvoiceNumber } from '../../lib/utils'
import type { Client, Invoice, InvoiceStatus, Project, Quote } from '../../lib/types'

interface GenerateInvoiceModalProps {
  isOpen: boolean
  onClose: () => void
  clients: Client[]
  projects: Project[]
  quotes: Quote[]
  /** Factures existantes — utilisées pour calculer le prochain numéro chronologique */
  existingInvoices: Invoice[]
  /** RIB pour règlement (paramétré ailleurs, jamais en dur dans le générateur) */
  defaultIban: string
  defaultBic: string
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
  existingInvoices,
  defaultIban,
  defaultBic,
  onCreateInvoice,
}: GenerateInvoiceModalProps) {
  const [clientId, setClientId] = useState('')
  const [projectId, setProjectId] = useState('')
  const [sourceQuoteId, setSourceQuoteId] = useState('')
  const [amount, setAmount] = useState<string>('')
  const [issueDate, setIssueDate] = useState(todayISO())
  const [dueDate, setDueDate] = useState(plusDaysISO(30))
  /** Date de prestation (mode facture unique sans acompte) — art. 242 nonies A CGI */
  const [serviceDate, setServiceDate] = useState(todayISO())
  /** Date d'encaissement de l'acompte — affichée sur la page 1 du PDF */
  const [acompteServiceDate, setAcompteServiceDate] = useState(todayISO())
  /** Date de livraison de la prestation — affichée sur la page 2 du PDF */
  const [deliveryDate, setDeliveryDate] = useState(plusDaysISO(45))
  const [hasDeposit, setHasDeposit] = useState(false)
  const [depositPercent, setDepositPercent] = useState<number>(40)
  const [acompteNumber, setAcompteNumber] = useState('')
  const [soldeNumber, setSoldeNumber] = useState('')
  const [singleNumber, setSingleNumber] = useState('')
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
  const acompteAmount = Math.round((grandTotal * depositPercent) / 100)
  const soldeAmount = grandTotal - acompteAmount

  const canGenerate =
    !!selectedClient &&
    grandTotal > 0 &&
    (hasDeposit ? acompteNumber.trim() && soldeNumber.trim() : singleNumber.trim().length > 0)

  // Reset on close + auto-numbering on open
  useEffect(() => {
    if (!isOpen) {
      setClientId('')
      setProjectId('')
      setSourceQuoteId('')
      setAmount('')
      setIssueDate(todayISO())
      setDueDate(plusDaysISO(30))
      setServiceDate(todayISO())
      setAcompteServiceDate(todayISO())
      setDeliveryDate(plusDaysISO(45))
      setHasDeposit(false)
      setDepositPercent(40)
      setAcompteNumber('')
      setSoldeNumber('')
      setSingleNumber('')
      setAdditionalProjectIds([])
      setStatus('sent')
      setNotes('')
      setPreviewHtml(null)
      setPersistError(null)
    } else {
      // Auto-numérotation chronologique sans rupture (art. 242 nonies A CGI)
      const existingNums = existingInvoices.map((i) => i.invoice_number)
      const nextNum = generateInvoiceNumber(existingNums)
      setSingleNumber(nextNum)
      setAcompteNumber(nextNum)
      setSoldeNumber(nextInvoiceNumber(nextNum))
    }
  }, [isOpen, existingInvoices])

  // Si on bascule sur le mode acompte, regénère les 2 numéros consécutifs
  useEffect(() => {
    if (hasDeposit) {
      const existingNums = existingInvoices.map((i) => i.invoice_number)
      // On n'écrase pas si l'utilisateur a déjà tapé manuellement
      if (!acompteNumber || !soldeNumber) {
        const ac = generateInvoiceNumber(existingNums)
        setAcompteNumber(ac)
        setSoldeNumber(nextInvoiceNumber(ac))
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasDeposit])

  // Auto-fill montant
  useEffect(() => {
    if (selectedProject && autoPrice != null && !amount) {
      setAmount(String(autoPrice))
    }
  }, [selectedProject, autoPrice, amount])

  // Pré-remplir depuis devis source : montant, acompte, calendrier prévisionnel
  const handlePickQuote = (quoteId: string) => {
    setSourceQuoteId(quoteId)
    if (!quoteId) return
    const q = quotes.find((x) => x.id === quoteId)
    if (!q) return
    setClientId(q.client_id)
    if (q.project_id) setProjectId(q.project_id)
    setAmount(String(q.amount))
    if (q.deposit_requested && q.deposit_amount && q.amount > 0) {
      setHasDeposit(true)
      setDepositPercent(Math.round((q.deposit_amount / q.amount) * 100))
    } else {
      setHasDeposit(false)
    }
    // Reporte le calendrier prévisionnel saisi sur le devis vers la facture
    if (q.expected_acompte_date) {
      setAcompteServiceDate(q.expected_acompte_date)
      // Date d'émission de la facture d'acompte = date d'encaissement prévue
      setIssueDate(q.expected_acompte_date)
    }
    if (q.expected_delivery_date) {
      setDeliveryDate(q.expected_delivery_date)
      setServiceDate(q.expected_delivery_date)
    }
    if (!notes.trim()) {
      setNotes(`Facture émise en exécution du devis ${q.quote_number ?? q.title}${q.signed_at ? ` signé le ${new Date(q.signed_at).toLocaleDateString('fr-FR')}` : ''}.`)
    }
  }

  const sourceQuote = sourceQuoteId ? quotes.find((q) => q.id === sourceQuoteId) ?? null : null

  const buildHTML = () => {
    if (!selectedClient) return null
    const shared = {
      client: selectedClient,
      project: selectedProject,
      totalAmount: grandTotal,
      depositPercent: hasDeposit ? depositPercent : 0,
      issueDateISO: issueDate,
      dueDateISO: dueDate,
      serviceDateISO: serviceDate,
      customNotes: notes.trim() || undefined,
      sourceQuoteRef: sourceQuote?.quote_number ?? undefined,
      sourceQuoteSignedISO: sourceQuote?.signed_at?.slice(0, 10) ?? undefined,
      additionalLines: selectedAdditionalProjects.map((p) => ({
        project: p,
        amount: getPriceForProject(p) ?? 0,
      })),
      iban: defaultIban,
      bic: defaultBic,
      vendor: MAPA_VENDOR,
    }

    if (hasDeposit) {
      return generatePairedInvoiceHTML({
        shared,
        acompteNumber: acompteNumber.trim(),
        soldeNumber: soldeNumber.trim(),
        acompteIssueDateISO: issueDate,
        soldeIssueDateISO: deliveryDate, // la facture de solde sera émise à la livraison
        acompteServiceDateISO: acompteServiceDate,
        soldeServiceDateISO: deliveryDate,
      })
    }

    return generateInvoiceHTML({
      ...shared,
      invoiceNumber: singleNumber.trim(),
      kind: 'full',
      serviceDateISO: serviceDate,
    })
  }

  const [persistError, setPersistError] = useState<string | null>(null)

  const persistInvoices = async (): Promise<{ created: number; failed: string[] }> => {
    if (!selectedClient || !saveAfterPreview) return { created: 0, failed: [] }
    const failed: string[] = []
    let created = 0

    if (hasDeposit) {
      // Crée 2 enregistrements indépendants : acompte ET solde
      // Si l'un plante, on continue avec l'autre et on remonte l'erreur précisément.
      try {
        await onCreateInvoice({
          client_id: selectedClient.id,
          project_id: selectedProject?.id ?? null,
          invoice_number: acompteNumber.trim(),
          amount: acompteAmount,
          status,
          due_date: dueDate || null,
          paid_date: status === 'paid' ? todayISO() : null,
          notes: `Facture d'acompte ${depositPercent}% sur prestation de ${grandTotal.toLocaleString('fr-FR')} €.${notes.trim() ? ' — ' + notes.trim() : ''}`,
          source_quote_id: sourceQuoteId || null,
        })
        created++
      } catch (e) {
        failed.push(`Acompte ${acompteNumber.trim()} : ${e instanceof Error ? e.message : 'échec'}`)
      }
      try {
        await onCreateInvoice({
          client_id: selectedClient.id,
          project_id: selectedProject?.id ?? null,
          invoice_number: soldeNumber.trim(),
          amount: soldeAmount,
          status: status === 'paid' ? 'sent' : 'draft',
          due_date: null,
          paid_date: null,
          notes: `Facture de solde après acompte ${acompteNumber.trim()} de ${acompteAmount.toLocaleString('fr-FR')} €.${notes.trim() ? ' — ' + notes.trim() : ''}`,
          source_quote_id: sourceQuoteId || null,
        })
        created++
      } catch (e) {
        failed.push(`Solde ${soldeNumber.trim()} : ${e instanceof Error ? e.message : 'échec'}`)
      }
    } else {
      try {
        await onCreateInvoice({
          client_id: selectedClient.id,
          project_id: selectedProject?.id ?? null,
          invoice_number: singleNumber.trim(),
          amount: grandTotal,
          status,
          due_date: dueDate || null,
          paid_date: status === 'paid' ? todayISO() : null,
          notes: notes.trim() || null,
          source_quote_id: sourceQuoteId || null,
        })
        created++
      } catch (e) {
        failed.push(`Facture ${singleNumber.trim()} : ${e instanceof Error ? e.message : 'échec'}`)
      }
    }

    return { created, failed }
  }

  const handlePreview = async () => {
    if (!canGenerate) return
    setGenerating(true)
    setPersistError(null)
    try {
      const html = buildHTML()
      if (!html) return
      const fileName = hasDeposit
        ? `factures-${acompteNumber.trim()}-${soldeNumber.trim()}.pdf`
        : `facture-${singleNumber.trim()}.pdf`
      setPreviewFilename(fileName)
      setPreviewHtml(html)

      const expected = hasDeposit ? 2 : 1
      const result = await persistInvoices()
      if (saveAfterPreview && (result.failed.length > 0 || result.created < expected)) {
        const msg =
          result.failed.length > 0
            ? `Échec d'enregistrement : ${result.failed.join(' · ')}`
            : `Seules ${result.created}/${expected} factures ont été enregistrées en base.`
        setPersistError(msg)
        // On retourne sur le formulaire pour que l'utilisateur voie l'erreur
        setPreviewHtml(null)
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
    <Modal isOpen={isOpen} onClose={onClose} title="Générer une facture" size="lg">
      <div className="space-y-4">
        {/* Mode acompte/solde */}
        <div className="rounded-2xl border border-ws-line bg-ws-deep/40 p-4 space-y-3">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={hasDeposit}
              onChange={(e) => setHasDeposit(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-ws-accent"
            />
            <div className="flex-1">
              <div className="text-sm font-medium text-ws-paper">
                Émission en deux factures (acompte + solde)
              </div>
              <p className="text-[11px] text-ws-mist mt-0.5 leading-relaxed">
                À cocher si le devis prévoit un acompte. Génère <strong>1 PDF avec 2 pages</strong> :
                page 1 = facture d'acompte (à émettre maintenant), page 2 = facture de solde (à
                émettre à la livraison). Conforme à l'art. 242 nonies A CGI et au principe
                d'encaissement micro-entreprise.
              </p>
            </div>
          </label>
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

        {/* Numéros de facture */}
        {hasDeposit ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="form-label">N° facture d'acompte *</label>
              <input
                type="text"
                className="input font-mono"
                value={acompteNumber}
                onChange={(e) => setAcompteNumber(e.target.value)}
                placeholder="FAC-2026-001"
              />
              <p className="text-[10px] text-ws-mist/70 mt-1">Page 1 du PDF — émise à la commande</p>
            </div>
            <div>
              <label className="form-label">N° facture de solde *</label>
              <input
                type="text"
                className="input font-mono"
                value={soldeNumber}
                onChange={(e) => setSoldeNumber(e.target.value)}
                placeholder="FAC-2026-002"
              />
              <p className="text-[10px] text-ws-mist/70 mt-1">Page 2 du PDF — à émettre à la livraison</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="form-label">N° de facture *</label>
              <input
                type="text"
                className="input font-mono"
                value={singleNumber}
                onChange={(e) => setSingleNumber(e.target.value)}
                placeholder="FAC-2026-001"
              />
              <p className="text-[10px] text-ws-mist/70 mt-1">
                Numérotation chronologique sans rupture (art. 242 nonies A CGI)
              </p>
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
            <label className="form-label">Projets additionnels du même client</label>
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
                        if (e.target.checked) setAdditionalProjectIds((arr) => [...arr, p.id])
                        else setAdditionalProjectIds((arr) => arr.filter((id) => id !== p.id))
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
              Montant HT total (projet principal)
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
          {hasDeposit && (
            <div>
              <label className="form-label">Pourcentage d'acompte (%)</label>
              <div className="flex gap-2 flex-wrap">
                {[20, 30, 40, 50].map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setDepositPercent(p)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono ${
                      depositPercent === p
                        ? 'bg-ws-accent/20 border border-ws-accent text-ws-paper'
                        : 'bg-ws-deep/40 border border-ws-line text-ws-mist hover:text-ws-paper'
                    }`}
                  >
                    {p}%
                  </button>
                ))}
                <input
                  type="number"
                  className="input font-mono w-20 text-xs py-1.5"
                  value={depositPercent}
                  onChange={(e) =>
                    setDepositPercent(Math.max(0, Math.min(100, Number(e.target.value))))
                  }
                  min={0}
                  max={100}
                />
              </div>
            </div>
          )}
        </div>

        {/* Dates */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="form-label">Date d'émission (page 1)</label>
            <input
              type="date"
              className="input font-mono"
              value={issueDate}
              onChange={(e) => setIssueDate(e.target.value)}
            />
            <p className="text-[10px] text-ws-mist/70 mt-1">
              Date sur la facture {hasDeposit ? "d'acompte" : ''}
            </p>
          </div>
          <div>
            <label className="form-label">Échéance de paiement</label>
            <input
              type="date"
              className="input font-mono"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
            <p className="text-[10px] text-ws-mist/70 mt-1">
              Date limite de règlement de l'acompte
            </p>
          </div>
        </div>

        {hasDeposit ? (
          <div className="rounded-2xl border border-ws-line bg-ws-deep/40 p-4 space-y-3">
            <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-ws-mist">
              Calendrier de prestation (art. 242 nonies A CGI)
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="form-label">Date d'encaissement de l'acompte (page 1) *</label>
                <input
                  type="date"
                  className="input font-mono"
                  value={acompteServiceDate}
                  onChange={(e) => setAcompteServiceDate(e.target.value)}
                />
                <p className="text-[10px] text-ws-mist/70 mt-1 leading-snug">
                  Avant le démarrage du projet — généralement la date de signature / virement de l'acompte
                </p>
              </div>
              <div>
                <label className="form-label">Date de livraison du projet (page 2) *</label>
                <input
                  type="date"
                  className="input font-mono"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                />
                <p className="text-[10px] text-ws-mist/70 mt-1 leading-snug">
                  Fin de prestation — sert aussi de date d'émission de la facture de solde
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div>
            <label className="form-label">
              Date de prestation *
              <span className="ml-1 text-[10px] font-normal text-ws-mist">
                (art. 242 nonies A CGI)
              </span>
            </label>
            <input
              type="date"
              className="input font-mono"
              value={serviceDate}
              onChange={(e) => setServiceDate(e.target.value)}
            />
            <p className="text-[10px] text-ws-mist/70 mt-1">
              Date à laquelle la prestation est rendue ou la marchandise livrée
            </p>
          </div>
        )}

        {/* Récap calculé */}
        <div className="rounded-xl border border-ws-line bg-ws-deep/40 p-3.5 space-y-1 text-xs font-mono">
          <div className="flex justify-between">
            <span className="text-ws-mist">Total prestation HT</span>
            <span className="text-ws-paper">{grandTotal.toLocaleString('fr-FR')} €</span>
          </div>
          {hasDeposit && (
            <>
              <div className="flex justify-between">
                <span className="text-ws-mist">Facture d'acompte ({depositPercent}%)</span>
                <span className="text-ws-paper">{acompteAmount.toLocaleString('fr-FR')} €</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ws-mist">Facture de solde (à la livraison)</span>
                <span className="text-ws-paper">{soldeAmount.toLocaleString('fr-FR')} €</span>
              </div>
              <div className="flex justify-between border-t border-ws-line/40 pt-1.5 mt-1.5">
                <span className="text-ws-accent uppercase tracking-[0.18em] text-[10px]">Total</span>
                <span className="text-ws-accent text-sm">
                  {grandTotal.toLocaleString('fr-FR')} €
                </span>
              </div>
            </>
          )}
          {!hasDeposit && (
            <div className="flex justify-between border-t border-ws-line/40 pt-1.5 mt-1.5">
              <span className="text-ws-accent uppercase tracking-[0.18em] text-[10px]">Net à payer</span>
              <span className="text-ws-accent text-sm">{grandTotal.toLocaleString('fr-FR')} €</span>
            </div>
          )}
        </div>

        {/* Notes */}
        <div>
          <label className="form-label">Notes (facultatif)</label>
          <textarea
            className="input min-h-[60px]"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="ex : Facture émise en exécution du devis DEV-2026-001 signé le 15/03/2026."
          />
        </div>

        {/* Warning : conformité légale du client (art. 242 nonies A CGI) */}
        {selectedClient && (() => {
          const missing: string[] = []
          if (!selectedClient.address?.trim()) missing.push('adresse')
          if (!selectedClient.city?.trim()) missing.push('ville')
          if (!selectedClient.siret?.trim()) missing.push('SIRET')
          if (missing.length === 0) return null
          return (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-[11px] leading-relaxed">
              <FileText size={14} className="mt-0.5 flex-shrink-0" />
              <div>
                <strong>Données client incomplètes</strong> — il manque sur la fiche de{' '}
                <span className="font-mono">
                  {selectedClient.company || selectedClient.name}
                </span>{' '}
                :{' '}
                <span className="font-medium">{missing.join(', ')}</span>.
                <br />
                L'art. 242 nonies A du CGI impose l'adresse complète du client (et son SIRET en
                B2B) sur toute facture. La facture sera générée mais peut être contestée. Complète
                la fiche client avant d'envoyer la version officielle.
              </div>
            </div>
          )
        })()}

        <label className="flex items-center gap-2 text-xs text-ws-ink cursor-pointer select-none">
          <input
            type="checkbox"
            checked={saveAfterPreview}
            onChange={(e) => setSaveAfterPreview(e.target.checked)}
            className="accent-ws-accent w-4 h-4"
          />
          Enregistrer la (les) facture(s) dans le CRM en parallèle de l'aperçu PDF
        </label>

        {persistError && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-200 text-xs leading-relaxed">
            <FileText size={14} className="mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <strong className="text-red-100">Sauvegarde incomplète</strong>
              <div className="font-mono mt-1 break-all">{persistError}</div>
              <div className="mt-1 text-red-300/80">
                Cause possible : numéro déjà utilisé, contrainte unique en base, ou erreur réseau.
                Modifie le numéro et reclique « Aperçu ».
              </div>
            </div>
          </div>
        )}

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
            {generating ? 'Génération…' : hasDeposit ? 'Aperçu (2 factures)' : 'Aperçu'}
          </Button>
        </div>

        {!canGenerate && (
          <div className="flex items-start gap-2 text-[11px] text-ws-mist">
            <FileText size={12} className="mt-0.5 flex-shrink-0" />
            <span>
              Renseigne au minimum un client, un montant supérieur à 0, et le(s) numéro(s) de facture.
            </span>
          </div>
        )}
      </div>
    </Modal>
  )
}
