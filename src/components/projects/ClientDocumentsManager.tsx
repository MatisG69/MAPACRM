import { useMemo, useRef, useState } from 'react';
import {
  Upload,
  Trash2,
  Eye,
  FolderOpen,
  FileSignature,
  Receipt,
  FileText,
  Loader2,
  X,
  Calendar,
  Lock,
  MailQuestion,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { Modal } from '../ui/Modal';
import { useClientDocuments } from '../../hooks/useClientDocuments';
import type {
  Client,
  ClientDocument,
  ClientDocumentCategory,
  Invoice,
  Project,
  Quote,
  RequestPriority,
} from '../../lib/types';
import { formatCurrency, formatDate } from '../../lib/utils';
import { generateDevisHTML, isRecurringQuoteHeuristic } from '../../lib/devisGenerator';
import { generateInvoiceHTML, MAPA_VENDOR } from '../../lib/invoiceGenerator';
import { DevisPreviewOverlay } from '../quotes/DevisPreviewOverlay';
import { InvoicePreviewOverlay } from '../invoices/InvoicePreviewOverlay';

/**
 * Coordonnées bancaires affichées sur les factures.
 * Surchargeables via .env (VITE_MAPA_IBAN / VITE_MAPA_BIC).
 */
const MAPA_IBAN =
  ((import.meta.env.VITE_MAPA_IBAN as string | undefined)?.trim() ||
    'FR76 1670 6050 8763 5180 1129 014');
const MAPA_BIC =
  ((import.meta.env.VITE_MAPA_BIC as string | undefined)?.trim() || 'AGRIFRPP867');

interface ClientDocumentsManagerProps {
  clientId: string;
  /** Si fourni, les uploads sont taggés avec ce projet et l'affichage est filtré dessus. */
  projectId?: string | null;
  /** Affiche un en-tête compact (utile en sous-section d'une page projet). */
  compact?: boolean;
  /** Client complet — requis pour générer les PDFs des devis/factures liés. */
  client?: Client | null;
  /** Projet complet — utile pour la génération PDF (optionnel). */
  project?: Project | null;
  /** Devis du client — affichés dans la liste unifiée si fournis (read-only ici). */
  quotes?: Quote[];
  /** Factures du client — affichées dans la liste unifiée si fournies (read-only ici). */
  invoices?: Invoice[];
}

const CATEGORY_OPTIONS: { value: ClientDocumentCategory; label: string }[] = [
  { value: 'contrat', label: 'Contrat' },
  { value: 'livrable', label: 'Livrable' },
  { value: 'compte-rendu', label: 'Compte-rendu' },
  { value: 'charte', label: 'Charte' },
  { value: 'autre', label: 'Autre' },
];

const CATEGORY_STYLE: Record<ClientDocumentCategory, string> = {
  contrat: 'bg-ws-accent/12 text-ws-accent border-ws-accent/35',
  livrable: 'bg-emerald-500/12 text-emerald-300 border-emerald-500/30',
  'compte-rendu': 'bg-sky-500/12 text-sky-300 border-sky-500/30',
  charte: 'bg-violet-500/12 text-violet-300 border-violet-500/30',
  autre: 'bg-ws-deep/40 text-ws-mist border-ws-line',
};

const CATEGORY_ICON: Record<ClientDocumentCategory, typeof FileText> = {
  contrat: FileSignature,
  livrable: FolderOpen,
  'compte-rendu': FileText,
  charte: FileText,
  autre: Receipt,
};

const QUOTE_STATUS: Record<Quote['status'], { label: string; tone: string }> = {
  draft: { label: 'Brouillon', tone: 'bg-ws-deep/40 text-ws-mist border-ws-line' },
  sent: { label: 'Envoyé', tone: 'bg-ws-accent/15 text-ws-accent border-ws-accent/35' },
  signed: { label: 'Signé', tone: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/35' },
  refused: { label: 'Refusé', tone: 'bg-red-500/12 text-red-300 border-red-500/35' },
  expired: { label: 'Expiré', tone: 'bg-ws-deep/40 text-ws-mist border-ws-line' },
};

const INVOICE_STATUS: Record<Invoice['status'], { label: string; tone: string }> = {
  draft: { label: 'Brouillon', tone: 'bg-ws-deep/40 text-ws-mist border-ws-line' },
  sent: { label: 'En attente', tone: 'bg-ws-accent/15 text-ws-accent border-ws-accent/35' },
  paid: { label: 'Réglée', tone: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/35' },
  overdue: { label: 'En retard', tone: 'bg-red-500/12 text-red-300 border-red-500/35' },
  cancelled: { label: 'Annulée', tone: 'bg-ws-deep/40 text-ws-mist border-ws-line' },
};

function formatBytes(bytes: number | null): string {
  if (bytes == null) return '';
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

/* ───────────────────────── Unified item types ───────────────────────── */

type UnifiedKind = 'upload' | 'devis' | 'facture-acompte' | 'facture-solde' | 'facture';
type Filter = 'all' | 'devis' | 'facture' | 'upload';

interface UnifiedItem {
  id: string;
  kind: UnifiedKind;
  /** Date de tri (ISO) */
  date: string;
  /** Titre principal */
  title: string;
  /** Sous-titre (numéro, projet…) */
  subtitle?: string;
  /** Statut affiché en pill */
  statusLabel?: string;
  statusTone?: string;
  /** Montant à droite */
  amount?: number | null;
  /** Source data (typé large pour éviter les casts partout) */
  source: ClientDocument | Quote | Invoice;
}

/* ──────────────────────────── Component ──────────────────────────── */

export function ClientDocumentsManager({
  clientId,
  projectId,
  compact = false,
  client,
  project,
  quotes = [],
  invoices = [],
}: ClientDocumentsManagerProps) {
  const {
    documents,
    loading,
    error,
    upload,
    remove,
    getSignedUrl,
    createRequest,
    validateRequest,
    rejectRequest,
  } = useClientDocuments(clientId, projectId ?? null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [form, setForm] = useState({
    name: '',
    description: '',
    category: 'autre' as ClientDocumentCategory,
  });
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  /* ── Création de demande de ressource ── */
  const [requestFormOpen, setRequestFormOpen] = useState(false);
  const [requestForm, setRequestForm] = useState<{
    name: string;
    description: string;
    category: ClientDocumentCategory;
    dueDate: string;
    priority: RequestPriority;
    adminNotes: string;
  }>({
    name: '',
    description: '',
    category: 'autre',
    dueDate: '',
    priority: 'normal',
    adminNotes: '',
  });
  const [requestSubmitting, setRequestSubmitting] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);

  /* ── Refus d'une demande reçue ── */
  const [rejectingDoc, setRejectingDoc] = useState<ClientDocument | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectingSubmitting, setRejectingSubmitting] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState<ClientDocument | null>(null);
  const [previewingDocId, setPreviewingDocId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');

  const [pdfPreview, setPdfPreview] = useState<{
    kind: 'devis' | 'facture';
    html: string;
    filename: string;
  } | null>(null);

  /* ── Filtre projet (si projectId fourni, ne montre que les éléments liés à ce projet ou orphelins) ── */
  const filteredQuotes = useMemo(() => {
    if (!projectId) return quotes;
    return quotes.filter((q) => !q.project_id || q.project_id === projectId);
  }, [quotes, projectId]);

  const filteredInvoices = useMemo(() => {
    if (!projectId) return invoices;
    return invoices.filter((i) => !i.project_id || i.project_id === projectId);
  }, [invoices, projectId]);

  /* ── Liste unifiée triée par date desc ── */
  const unified = useMemo<UnifiedItem[]>(() => {
    const items: UnifiedItem[] = [];

    // Uploads
    for (const d of documents) {
      items.push({
        id: `doc-${d.id}`,
        kind: 'upload',
        date: d.created_at,
        title: d.name,
        subtitle: d.description ?? undefined,
        source: d,
      });
    }

    // Devis
    for (const q of filteredQuotes) {
      const status = QUOTE_STATUS[q.status];
      items.push({
        id: `quote-${q.id}`,
        kind: 'devis',
        date: q.created_at,
        title: q.title || 'Devis',
        subtitle: q.quote_number ?? undefined,
        statusLabel: status.label,
        statusTone: status.tone,
        amount: q.amount,
        source: q,
      });
    }

    // Factures (kind dépend des notes pour distinguer acompte / solde)
    for (const inv of filteredInvoices) {
      const isAcompte = (inv.notes ?? '').toLowerCase().includes("facture d'acompte");
      const isSolde = (inv.notes ?? '').toLowerCase().includes('facture de solde');
      const kind: UnifiedKind = isAcompte ? 'facture-acompte' : isSolde ? 'facture-solde' : 'facture';
      const status = INVOICE_STATUS[inv.status];
      const titleSuffix = isAcompte ? "Facture d'acompte" : isSolde ? 'Facture de solde' : 'Facture';
      items.push({
        id: `invoice-${inv.id}`,
        kind,
        date: inv.created_at,
        title: titleSuffix,
        subtitle: inv.invoice_number ?? undefined,
        statusLabel: status.label,
        statusTone: status.tone,
        amount: inv.amount,
        source: inv,
      });
    }

    return items.sort((a, b) => b.date.localeCompare(a.date));
  }, [documents, filteredQuotes, filteredInvoices]);

  const filtered = useMemo(() => {
    if (filter === 'all') return unified;
    if (filter === 'devis') return unified.filter((u) => u.kind === 'devis');
    if (filter === 'facture')
      return unified.filter(
        (u) => u.kind === 'facture' || u.kind === 'facture-acompte' || u.kind === 'facture-solde',
      );
    return unified.filter((u) => u.kind === 'upload');
  }, [unified, filter]);

  const counts = useMemo(
    () => ({
      all: unified.length,
      devis: unified.filter((u) => u.kind === 'devis').length,
      facture: unified.filter(
        (u) => u.kind === 'facture' || u.kind === 'facture-acompte' || u.kind === 'facture-solde',
      ).length,
      upload: unified.filter((u) => u.kind === 'upload').length,
    }),
    [unified],
  );

  /* ── Upload handlers ── */
  const onPickFile = () => fileInputRef.current?.click();

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setPendingFile(f);
    setForm((s) => ({ ...s, name: s.name || f.name }));
    e.target.value = '';
  };

  const handleUpload = async () => {
    if (!pendingFile) return;
    setUploading(true);
    setUploadError(null);
    try {
      await upload({
        clientId,
        projectId: projectId ?? null,
        category: form.category,
        name: form.name.trim() || pendingFile.name,
        description: form.description.trim() || null,
        file: pendingFile,
      });
      setPendingFile(null);
      setForm({ name: '', description: '', category: 'autre' });
    } catch (e) {
      setUploadError((e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!confirmDelete) return;
    try {
      await remove(confirmDelete);
    } finally {
      setConfirmDelete(null);
    }
  };

  /* ── Resource request handlers ── */

  const handleCreateRequest = async () => {
    if (!requestForm.name.trim()) {
      setRequestError('Le nom du document est requis');
      return;
    }
    setRequestSubmitting(true);
    setRequestError(null);
    try {
      await createRequest({
        clientId,
        projectId: projectId ?? null,
        category: requestForm.category,
        name: requestForm.name.trim(),
        description: requestForm.description.trim() || null,
        dueDate: requestForm.dueDate || null,
        priority: requestForm.priority,
        adminNotes: requestForm.adminNotes.trim() || null,
      });
      setRequestFormOpen(false);
      setRequestForm({
        name: '',
        description: '',
        category: 'autre',
        dueDate: '',
        priority: 'normal',
        adminNotes: '',
      });
    } catch (e) {
      setRequestError((e as Error).message);
    } finally {
      setRequestSubmitting(false);
    }
  };

  const handleValidateRequest = async (doc: ClientDocument) => {
    await validateRequest(doc);
  };

  const handleRejectRequest = async () => {
    if (!rejectingDoc) return;
    setRejectingSubmitting(true);
    try {
      await rejectRequest(rejectingDoc, rejectionReason);
      setRejectingDoc(null);
      setRejectionReason('');
    } finally {
      setRejectingSubmitting(false);
    }
  };

  /* ── Preview handlers ── */
  const openUploadPreview = async (doc: ClientDocument) => {
    setPreviewingDocId(doc.id);
    try {
      const url = await getSignedUrl(doc, 300);
      if (url) window.open(url, '_blank', 'noopener,noreferrer');
    } finally {
      setPreviewingDocId(null);
    }
  };

  const openQuotePreview = (q: Quote) => {
    if (!client) {
      setUploadError('Impossible de générer le PDF : fiche client manquante.');
      return;
    }
    const isRecurring = isRecurringQuoteHeuristic({
      quote_number: q.quote_number,
      title: q.title,
      notes: q.notes,
    });

    let parentQuoteRef: string | null = null;
    if (isRecurring && q.notes) {
      const match = q.notes.match(/Suivi de la prestation livrée au titre du devis [^\n]+/);
      if (match) parentQuoteRef = match[0];
    }

    /* Pour un devis de suivi, on hérite du pourcentage d'acompte du devis
       parent : la clause (i) de l'art. 3 des CGV doit refléter le contrat
       forfaitaire principal (le suivi lui-même n'a pas d'acompte). */
    const parentQuoteForDeposit =
      isRecurring && q.parent_quote_id
        ? quotes.find((p) => p.id === q.parent_quote_id) ?? null
        : null;
    const sourceQuote = parentQuoteForDeposit ?? q;
    const depositPercent =
      sourceQuote.deposit_requested && sourceQuote.deposit_amount && sourceQuote.amount > 0
        ? Math.round((sourceQuote.deposit_amount / sourceQuote.amount) * 100)
        : 30;

    const html = generateDevisHTML({
      client,
      project: project ?? null,
      amount: q.amount,
      quoteNumber: q.quote_number ?? '',
      validUntilISO: q.valid_until,
      depositPercent,
      includeCGV: !isRecurring,
      isRecurring,
      recurringScope: project?.recurring_support_scope ?? null,
      recurringTitle: isRecurring ? q.title : null,
      recurringDescription: project?.recurring_support_description ?? null,
      parentQuoteRef,
      acompteDateISO: (q as Quote & { expected_acompte_date?: string | null }).expected_acompte_date ?? null,
      deliveryDateISO: (q as Quote & { expected_delivery_date?: string | null }).expected_delivery_date ?? null,
    });
    setPdfPreview({
      kind: 'devis',
      html,
      filename: `devis-${q.quote_number ?? q.id}.pdf`,
    });
  };

  const openInvoicePreview = (inv: Invoice) => {
    if (!client) {
      setUploadError('Impossible de générer le PDF : fiche client manquante.');
      return;
    }
    const sourceQuote = (inv as Invoice & { source_quote_id?: string | null }).source_quote_id
      ? quotes.find(
          (q) => q.id === (inv as Invoice & { source_quote_id?: string | null }).source_quote_id,
        )
      : null;
    const html = generateInvoiceHTML({
      client,
      project: project ?? null,
      totalAmount: inv.amount,
      invoiceNumber: inv.invoice_number ?? '',
      kind: 'full',
      issueDateISO: inv.created_at?.slice(0, 10),
      dueDateISO: inv.due_date ?? undefined,
      serviceDateISO: inv.due_date ?? inv.created_at?.slice(0, 10),
      sourceQuoteRef: sourceQuote?.quote_number ?? undefined,
      sourceQuoteSignedISO: sourceQuote?.signed_at?.slice(0, 10) ?? undefined,
      customNotes: inv.notes ?? undefined,
      iban: MAPA_IBAN,
      bic: MAPA_BIC,
      vendor: MAPA_VENDOR,
    });
    setPdfPreview({
      kind: 'facture',
      html,
      filename: `facture-${inv.invoice_number ?? inv.id}.pdf`,
    });
  };

  /* ──────────────────────────── Render ──────────────────────────── */

  return (
    <section className="space-y-4">
      {!compact && (
        <header className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h3 className="font-display text-base font-bold text-ws-paper">Documents partagés</h3>
            <p className="text-xs font-mono text-ws-mist mt-0.5">
              Vue centralisée — devis, factures, ressources demandées au client &amp; uploads
              {projectId ? ' · filtrés sur ce projet' : ''}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              icon={<MailQuestion size={14} />}
              onClick={() => setRequestFormOpen((v) => !v)}
              className="normal-case tracking-normal"
            >
              Demander au client
            </Button>
            <Button
              size="sm"
              variant="secondary"
              icon={<Upload size={14} />}
              onClick={onPickFile}
              className="normal-case tracking-normal"
            >
              Ajouter un document
            </Button>
            <input ref={fileInputRef} type="file" className="hidden" onChange={onFileChange} />
          </div>
        </header>
      )}

      {compact && (
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <FolderOpen size={14} className="text-ws-accent" />
            <span className="text-sm font-semibold text-ws-paper">Documents partagés</span>
            <span className="text-[10px] font-mono text-ws-mist">({unified.length})</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              icon={<MailQuestion size={14} />}
              onClick={() => setRequestFormOpen((v) => !v)}
              className="normal-case tracking-normal"
            >
              Demander
            </Button>
            <Button
              size="sm"
              variant="secondary"
              icon={<Upload size={14} />}
              onClick={onPickFile}
              className="normal-case tracking-normal"
            >
              Ajouter
            </Button>
            <input ref={fileInputRef} type="file" className="hidden" onChange={onFileChange} />
          </div>
        </div>
      )}

      {/* ─── Form de demande de ressource ─── */}
      {requestFormOpen && (
        <div className="ws-card rounded-2xl border border-sky-500/30 bg-sky-500/[0.04] p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <MailQuestion size={14} className="text-sky-300 flex-shrink-0" />
              <span className="text-sm text-ws-paper font-medium">
                Demander un document au client
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setRequestFormOpen(false);
                setRequestError(null);
              }}
              className="p-1.5 rounded-md text-ws-mist hover:text-ws-paper hover:bg-white/5"
              aria-label="Fermer"
            >
              <X size={14} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="md:col-span-2">
              <label className="block text-[10px] font-mono uppercase tracking-[0.18em] text-ws-mist mb-1">
                Nom du document à fournir *
              </label>
              <input
                type="text"
                value={requestForm.name}
                onChange={(e) => setRequestForm((s) => ({ ...s, name: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-ws-panel border border-ws-line text-ws-paper text-sm focus:outline-none focus:border-sky-500"
                placeholder="ex : Logo HD (formats SVG + PNG transparent)"
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono uppercase tracking-[0.18em] text-ws-mist mb-1">
                Catégorie
              </label>
              <select
                value={requestForm.category}
                onChange={(e) =>
                  setRequestForm((s) => ({
                    ...s,
                    category: e.target.value as ClientDocumentCategory,
                  }))
                }
                className="w-full px-3 py-2 rounded-lg bg-ws-panel border border-ws-line text-ws-paper text-sm focus:outline-none focus:border-sky-500"
              >
                {CATEGORY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-mono uppercase tracking-[0.18em] text-ws-mist mb-1">
                Priorité
              </label>
              <select
                value={requestForm.priority}
                onChange={(e) =>
                  setRequestForm((s) => ({ ...s, priority: e.target.value as RequestPriority }))
                }
                className="w-full px-3 py-2 rounded-lg bg-ws-panel border border-ws-line text-ws-paper text-sm focus:outline-none focus:border-sky-500"
              >
                <option value="low">Faible</option>
                <option value="normal">Normale</option>
                <option value="high">Élevée</option>
                <option value="urgent">Urgente</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-mono uppercase tracking-[0.18em] text-ws-mist mb-1">
                Date limite (optionnel)
              </label>
              <input
                type="date"
                value={requestForm.dueDate}
                onChange={(e) => setRequestForm((s) => ({ ...s, dueDate: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-ws-panel border border-ws-line text-ws-paper text-sm focus:outline-none focus:border-sky-500 font-mono"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-[10px] font-mono uppercase tracking-[0.18em] text-ws-mist mb-1">
                Description visible par le client
              </label>
              <input
                type="text"
                value={requestForm.description}
                onChange={(e) => setRequestForm((s) => ({ ...s, description: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-ws-panel border border-ws-line text-ws-paper text-sm focus:outline-none focus:border-sky-500"
                placeholder="Précisions pour le client (formats, dimensions…)"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-[10px] font-mono uppercase tracking-[0.18em] text-ws-mist mb-1">
                Note interne (optionnel, non visible client)
              </label>
              <input
                type="text"
                value={requestForm.adminNotes}
                onChange={(e) => setRequestForm((s) => ({ ...s, adminNotes: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-ws-panel border border-ws-line text-ws-paper text-sm focus:outline-none focus:border-sky-500"
                placeholder="Mémo personnel…"
              />
            </div>
          </div>

          {requestError && (
            <p
              className="text-xs text-red-300 bg-red-500/10 border border-red-500/20 rounded-md px-2 py-1.5 font-mono"
              role="alert"
            >
              {requestError}
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <Button
              size="sm"
              onClick={handleCreateRequest}
              loading={requestSubmitting}
              icon={<MailQuestion size={14} />}
              className="normal-case tracking-normal"
            >
              Envoyer la demande
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setRequestFormOpen(false);
                setRequestError(null);
              }}
              className="normal-case tracking-normal"
            >
              Annuler
            </Button>
          </div>
        </div>
      )}

      {/* Filtres rapides */}
      {unified.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {(
            [
              ['all', 'Tous', counts.all],
              ['devis', 'Devis', counts.devis],
              ['facture', 'Factures', counts.facture],
              ['upload', 'Uploads', counts.upload],
            ] as const
          ).map(([k, label, n]) => {
            const active = filter === k;
            return (
              <button
                key={k}
                type="button"
                onClick={() => setFilter(k)}
                className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-lg border text-[10px] font-mono uppercase tracking-[0.16em] transition-all duration-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ws-accent/50 ${
                  active
                    ? 'bg-ws-accent/15 border-ws-accent/45 text-ws-paper'
                    : 'bg-ws-deep/40 border-ws-line text-ws-mist hover:text-ws-paper hover:border-ws-accent/25'
                }`}
                aria-pressed={active}
              >
                {label}
                <span className={`text-[9px] tabular-nums ${active ? 'text-ws-accent' : 'opacity-60'}`}>
                  {n}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Formulaire d'upload (visible uniquement si fichier sélectionné) */}
      {pendingFile && (
        <div className="ws-card rounded-2xl border border-ws-accent/30 bg-ws-accent/[0.04] p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <FileText size={14} className="text-ws-accent flex-shrink-0" />
              <span className="text-sm text-ws-paper font-medium truncate">{pendingFile.name}</span>
              <span className="text-[10px] font-mono text-ws-mist whitespace-nowrap">
                {formatBytes(pendingFile.size)}
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setPendingFile(null);
                setUploadError(null);
              }}
              className="p-1.5 rounded-md text-ws-mist hover:text-ws-paper hover:bg-white/5"
              aria-label="Annuler"
            >
              <X size={14} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="md:col-span-2">
              <label className="block text-[10px] font-mono uppercase tracking-[0.18em] text-ws-mist mb-1">
                Nom affiché au client
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-ws-panel border border-ws-line text-ws-paper text-sm focus:outline-none focus:border-ws-accent"
                placeholder={pendingFile.name}
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono uppercase tracking-[0.18em] text-ws-mist mb-1">
                Catégorie
              </label>
              <select
                value={form.category}
                onChange={(e) =>
                  setForm((s) => ({ ...s, category: e.target.value as ClientDocumentCategory }))
                }
                className="w-full px-3 py-2 rounded-lg bg-ws-panel border border-ws-line text-ws-paper text-sm focus:outline-none focus:border-ws-accent"
              >
                {CATEGORY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-mono uppercase tracking-[0.18em] text-ws-mist mb-1">
                Description (optionnel)
              </label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-ws-panel border border-ws-line text-ws-paper text-sm focus:outline-none focus:border-ws-accent"
                placeholder="Précisions pour le client…"
              />
            </div>
          </div>

          {uploadError && (
            <p
              className="text-xs text-red-300 bg-red-500/10 border border-red-500/20 rounded-md px-2 py-1.5 font-mono"
              role="alert"
            >
              {uploadError}
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <Button
              size="sm"
              onClick={handleUpload}
              loading={uploading}
              icon={<Upload size={14} />}
              className="normal-case tracking-normal"
            >
              Envoyer au client
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setPendingFile(null);
                setUploadError(null);
              }}
              className="normal-case tracking-normal"
            >
              Annuler
            </Button>
          </div>
        </div>
      )}

      {/* Liste */}
      <div className="ws-card rounded-2xl border border-ws-line overflow-hidden">
        {error && (
          <div className="px-4 py-2.5 text-xs text-red-300 bg-red-500/10 border-b border-red-500/20 font-mono">
            {error}
          </div>
        )}

        {loading && unified.length === 0 ? (
          <p className="text-sm text-ws-mist py-8 text-center font-mono">Chargement…</p>
        ) : filtered.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <FolderOpen size={22} className="mx-auto mb-3 text-ws-mist/60" />
            <p className="text-sm text-ws-paper font-medium mb-1">
              {filter === 'all' ? 'Aucun document' : 'Aucun élément dans ce filtre'}
            </p>
            <p className="text-xs text-ws-mist max-w-md mx-auto leading-relaxed">
              {filter === 'all'
                ? 'Les devis et factures que vous créez pour ce client apparaîtront ici automatiquement. Vous pouvez aussi uploader des documents complémentaires.'
                : 'Élargissez le filtre ou créez un nouveau document.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-ws-line">
            {filtered.map((item) => (
              <UnifiedRow
                key={item.id}
                item={item}
                previewing={previewingDocId === (item.source as ClientDocument).id}
                onPreviewUpload={openUploadPreview}
                onPreviewQuote={openQuotePreview}
                onPreviewInvoice={openInvoicePreview}
                onDelete={(doc) => setConfirmDelete(doc)}
                onValidateRequest={handleValidateRequest}
                onRejectRequest={(doc) => {
                  setRejectingDoc(doc);
                  setRejectionReason('');
                }}
              />
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={!!confirmDelete}
        title="Supprimer ce document ?"
        description={
          confirmDelete
            ? `« ${confirmDelete.name} » sera supprimé de l'espace client. Cette action est irréversible.`
            : ''
        }
        onConfirm={handleConfirmDelete}
        onClose={() => setConfirmDelete(null)}
      />

      {/* Modal refus de demande */}
      <Modal
        isOpen={!!rejectingDoc}
        onClose={() => {
          setRejectingDoc(null);
          setRejectionReason('');
        }}
        title="Refuser la demande"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-ws-ink leading-relaxed">
            Vous allez refuser <strong className="text-ws-paper">« {rejectingDoc?.name} »</strong>.
            Le fichier actuel sera supprimé et le client devra ré-uploader. Indiquez le motif —
            il sera visible par le client.
          </p>
          <textarea
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            rows={3}
            placeholder="ex : Format SVG manquant, fichier corrompu, mauvais visuel…"
            className="w-full px-3 py-2 rounded-lg bg-ws-panel border border-ws-line text-ws-paper text-sm focus:outline-none focus:border-red-500 resize-none"
            autoFocus
          />
          <div className="flex gap-3">
            <Button
              variant="secondary"
              className="flex-1 normal-case tracking-normal"
              onClick={() => {
                setRejectingDoc(null);
                setRejectionReason('');
              }}
            >
              Annuler
            </Button>
            <Button
              variant="danger"
              className="flex-1 normal-case tracking-normal"
              onClick={handleRejectRequest}
              loading={rejectingSubmitting}
              disabled={!rejectionReason.trim()}
            >
              Refuser et redemander
            </Button>
          </div>
        </div>
      </Modal>

      {pdfPreview &&
        (pdfPreview.kind === 'devis' ? (
          <DevisPreviewOverlay
            html={pdfPreview.html}
            filename={pdfPreview.filename}
            onClose={() => setPdfPreview(null)}
          />
        ) : (
          <InvoicePreviewOverlay
            html={pdfPreview.html}
            filename={pdfPreview.filename}
            onClose={() => setPdfPreview(null)}
          />
        ))}
    </section>
  );
}

/* ──────────────────────── Row component ──────────────────────── */

interface UnifiedRowProps {
  item: UnifiedItem;
  previewing: boolean;
  onPreviewUpload: (doc: ClientDocument) => void;
  onPreviewQuote: (q: Quote) => void;
  onPreviewInvoice: (inv: Invoice) => void;
  onDelete: (doc: ClientDocument) => void;
  onValidateRequest: (doc: ClientDocument) => Promise<void> | void;
  onRejectRequest: (doc: ClientDocument) => void;
}

const PRIORITY_BADGE: Record<string, string> = {
  low: 'bg-ws-deep/40 text-ws-mist border-ws-line',
  normal: 'bg-sky-500/10 text-sky-300 border-sky-500/30',
  high: 'bg-amber-500/12 text-amber-300 border-amber-500/35',
  urgent: 'bg-red-500/12 text-red-300 border-red-500/35',
};

function UnifiedRow({
  item,
  previewing,
  onPreviewUpload,
  onPreviewQuote,
  onPreviewInvoice,
  onDelete,
  onValidateRequest,
  onRejectRequest,
}: UnifiedRowProps) {
  const isUpload = item.kind === 'upload';
  const isQuote = item.kind === 'devis';
  const isInvoice = !isUpload && !isQuote;

  // Détection demande (request) parmi les uploads
  const doc = isUpload ? (item.source as ClientDocument) : null;
  const isRequest = !!doc?.is_request;
  const requestStatus = doc?.request_status;
  const requestReceived = isRequest && requestStatus === 'received';
  const requestPending = isRequest && (requestStatus === 'requested' || !requestStatus);
  const requestValidated = isRequest && requestStatus === 'validated';

  /* Icon + style par type */
  let Icon = FileText;
  let iconStyle = 'bg-ws-deep/40 text-ws-mist border-ws-line';
  let kindLabel = '';
  let kindTone = 'bg-ws-deep/40 text-ws-mist border-ws-line';

  if (isRequest) {
    Icon = MailQuestion;
    iconStyle = requestPending
      ? 'bg-sky-500/12 text-sky-300 border-sky-500/30'
      : requestReceived
        ? 'bg-amber-500/12 text-amber-300 border-amber-500/30'
        : requestValidated
          ? 'bg-emerald-500/12 text-emerald-300 border-emerald-500/30'
          : 'bg-ws-deep/40 text-ws-mist border-ws-line';
    kindLabel = 'Demande';
    kindTone = iconStyle;
  } else if (isUpload && doc) {
    Icon = CATEGORY_ICON[doc.category] ?? FileText;
    iconStyle = CATEGORY_STYLE[doc.category];
    kindLabel = CATEGORY_OPTIONS.find((o) => o.value === doc.category)?.label ?? doc.category;
    kindTone = CATEGORY_STYLE[doc.category];
  } else if (isQuote) {
    Icon = FileSignature;
    iconStyle = 'bg-ws-accent/12 text-ws-accent border-ws-accent/35';
    kindLabel = 'Devis';
    kindTone = 'bg-ws-accent/10 text-ws-accent border-ws-accent/30';
  } else {
    Icon = Receipt;
    iconStyle = 'bg-emerald-500/12 text-emerald-300 border-emerald-500/30';
    kindLabel = 'Facture';
    kindTone = 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30';
  }

  const handleView = () => {
    if (isQuote) {
      onPreviewQuote(item.source as Quote);
    } else if (isInvoice) {
      onPreviewInvoice(item.source as Invoice);
    } else if (doc?.file_path) {
      onPreviewUpload(doc);
    }
  };

  // Status spécifique des demandes
  let requestStatusBadge: { label: string; tone: string; icon: React.ReactNode } | null = null;
  if (isRequest) {
    if (requestPending) {
      requestStatusBadge = {
        label: doc?.rejection_reason ? 'À refaire' : 'En attente client',
        tone: 'bg-sky-500/12 text-sky-300 border-sky-500/30',
        icon: <Clock size={9} />,
      };
    } else if (requestReceived) {
      requestStatusBadge = {
        label: 'À valider',
        tone: 'bg-amber-500/15 text-amber-300 border-amber-500/35',
        icon: <AlertCircle size={9} />,
      };
    } else if (requestValidated) {
      requestStatusBadge = {
        label: 'Validé',
        tone: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
        icon: <CheckCircle2 size={9} />,
      };
    }
  }

  // Date d'échéance (si demande avec due date)
  const dueDate = doc?.request_due_date;
  const overdue =
    dueDate && requestPending && new Date(dueDate) < new Date(new Date().toDateString());

  return (
    <div className="px-4 py-3.5 flex items-center gap-3 hover:bg-ws-raised/30 transition-colors group">
      <div
        className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border ${iconStyle}`}
      >
        <Icon size={16} strokeWidth={2} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium text-ws-paper truncate">{item.title}</p>
          <span
            className={`inline-flex items-center px-1.5 py-0.5 rounded-full border text-[9px] font-mono uppercase tracking-[0.15em] ${kindTone}`}
          >
            {kindLabel}
          </span>
          {requestStatusBadge && (
            <span
              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-[9px] font-mono uppercase tracking-[0.15em] ${requestStatusBadge.tone}`}
            >
              {requestStatusBadge.icon}
              {requestStatusBadge.label}
            </span>
          )}
          {isRequest && doc && doc.request_priority !== 'normal' && (
            <span
              className={`inline-flex items-center px-1.5 py-0.5 rounded-full border text-[9px] font-mono uppercase tracking-[0.15em] ${PRIORITY_BADGE[doc.request_priority]}`}
            >
              {doc.request_priority === 'urgent'
                ? 'Urgent'
                : doc.request_priority === 'high'
                  ? 'Élevée'
                  : 'Faible'}
            </span>
          )}
          {item.statusLabel && item.statusTone && !isRequest && (
            <span
              className={`inline-flex items-center px-1.5 py-0.5 rounded-full border text-[9px] font-mono uppercase tracking-[0.15em] ${item.statusTone}`}
            >
              {item.statusLabel}
            </span>
          )}
          {!isUpload && (
            <span
              className="inline-flex items-center gap-1 text-[9px] font-mono text-ws-mist/60"
              title="Document automatique — non modifiable depuis ce module"
            >
              <Lock size={9} />
              auto
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {item.subtitle && (
            <span className="text-[11px] font-mono text-ws-mist truncate">{item.subtitle}</span>
          )}
          {dueDate && (
            <span
              className={`text-[10px] font-mono flex items-center gap-1 ${
                overdue ? 'text-red-300' : 'text-ws-mist/70'
              }`}
            >
              <Calendar size={9} />
              {overdue ? 'En retard' : 'Échéance'} {formatDate(dueDate)}
            </span>
          )}
          {!dueDate && (
            <span className="text-[10px] font-mono text-ws-mist/70 flex items-center gap-1">
              <Calendar size={9} />
              {formatDate(item.date)}
            </span>
          )}
          {isUpload && doc?.file_size != null && (
            <span className="text-[10px] font-mono text-ws-mist/70">
              {formatBytes(doc.file_size)}
            </span>
          )}
          {isRequest && doc?.rejection_reason && (
            <span className="text-[10px] font-mono text-red-300/80 italic truncate">
              Refusé : {doc.rejection_reason}
            </span>
          )}
        </div>
      </div>

      {item.amount != null && (
        <span className="text-sm font-mono font-semibold tabular-nums text-ws-paper hidden sm:inline whitespace-nowrap">
          {formatCurrency(item.amount)}
        </span>
      )}

      <div className="flex items-center gap-1 flex-shrink-0">
        {/* Demande reçue : actions Valider / Refuser */}
        {requestReceived && doc && (
          <>
            <button
              type="button"
              onClick={() => onValidateRequest(doc)}
              className="p-1.5 rounded-md text-ws-mist hover:text-emerald-300 hover:bg-emerald-500/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50"
              aria-label="Valider"
              title="Valider la demande"
            >
              <CheckCircle2 size={14} />
            </button>
            <button
              type="button"
              onClick={() => onRejectRequest(doc)}
              className="p-1.5 rounded-md text-ws-mist hover:text-red-400 hover:bg-red-500/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/50"
              aria-label="Refuser"
              title="Refuser et redemander"
            >
              <XCircle size={14} />
            </button>
          </>
        )}

        {/* Voir le fichier (si dispo) */}
        {(!isRequest || doc?.file_path) && (
          <button
            type="button"
            onClick={handleView}
            disabled={previewing}
            className="p-1.5 rounded-md text-ws-mist hover:text-ws-accent hover:bg-ws-accent/10 disabled:opacity-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ws-accent/50"
            aria-label={`Voir ${item.title}`}
            title="Voir"
          >
            {previewing ? <Loader2 size={14} className="animate-spin" /> : <Eye size={14} />}
          </button>
        )}

        {/* Supprimer (uniquement uploads / demandes — pas devis ni factures) */}
        {isUpload && doc && (
          <button
            type="button"
            onClick={() => onDelete(doc)}
            className="p-1.5 rounded-md text-ws-mist hover:text-red-400 hover:bg-red-500/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/50"
            aria-label={`Supprimer ${item.title}`}
            title="Supprimer"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
