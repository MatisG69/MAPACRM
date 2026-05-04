import { useState, useMemo } from 'react';
import { Pencil, Trash2, FileInput, FileText, Eye, Check, Loader2, FolderInput } from 'lucide-react';
import { useBulkSelection } from '../hooks/useBulkSelection';
import { BulkActionBar } from '../components/ui/BulkActionBar';
import { Header } from '../components/layout/Header';
import type { AppNotification } from '../components/layout/Header';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Badge } from '../components/ui/Badge';
import { QuoteForm } from '../components/quotes/QuoteForm';
import { GenerateDevisModal } from '../components/quotes/GenerateDevisModal';
import { DevisPreviewOverlay } from '../components/quotes/DevisPreviewOverlay';
import { FolderSidebar } from '../components/folders/FolderSidebar';
import { FolderBadge } from '../components/folders/FolderBadge';
import { CreateFolderModal } from '../components/folders/CreateFolderModal';
import { MoveToFolderMenu } from '../components/folders/MoveToFolderMenu';
import { generateDevisHTML, isRecurringQuoteHeuristic } from '../lib/devisGenerator';
import type {
  Client,
  Folder,
  FolderNode,
  Invoice,
  InvoiceStatus,
  Opportunity,
  Project,
  Quote,
  QuoteStatus,
} from '../lib/types';
import { formatCurrency, formatDate, generateInvoiceNumber } from '../lib/utils';
import { getDescendantIds } from '../hooks/useFolders';

function quoteStatusToInvoiceStatus(quoteStatus: QuoteStatus): InvoiceStatus {
  if (quoteStatus === 'signed' || quoteStatus === 'sent') return 'sent';
  return 'draft';
}

interface QuotesPageProps {
  quotes: Quote[];
  clients: Client[];
  projects: Project[];
  opportunities: Opportunity[];
  folders: Folder[];
  folderTree: FolderNode[];
  onCreate: (data: Omit<Quote, 'id' | 'created_at' | 'updated_at' | 'client' | 'project' | 'opportunity'>) => Promise<Quote>;
  onUpdate: (id: string, data: Partial<Quote>) => Promise<Quote>;
  onDelete: (id: string) => Promise<void>;
  onCreateInvoice: (
    data: Omit<Invoice, 'id' | 'created_at' | 'updated_at' | 'client' | 'project'>
  ) => Promise<Invoice>;
  onCreateFolder: (
    values: Pick<Folder, 'name'> & Partial<Pick<Folder, 'parent_id' | 'color' | 'position'>>
  ) => Promise<Folder>;
  onUpdateFolder: (id: string, values: Partial<Folder>) => Promise<Folder>;
  onDeleteFolder: (id: string) => Promise<void>;
}

type SelectedFolder = string | null | '__unfiled__';

export function QuotesPage({
  quotes,
  clients,
  projects,
  opportunities,
  folders,
  folderTree,
  onCreate,
  onUpdate,
  onDelete,
  onCreateInvoice,
  onCreateFolder,
  onUpdateFolder,
  onDeleteFolder,
}: QuotesPageProps) {
  const [modal, setModal] = useState<'edit' | 'convert' | 'devis' | null>(null);
  const [editing, setEditing] = useState<Quote | null>(null);
  const [convertQuote, setConvertQuote] = useState<Quote | null>(null);
  const [previewQuote, setPreviewQuote] = useState<{ html: string; filename: string } | null>(null);
  const [convertMode, setConvertMode] = useState<'total' | 'deposit'>('total');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [convertLoading, setConvertLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // ─── Folder state ───
  const [selectedFolder, setSelectedFolder] = useState<SelectedFolder>(null);
  const [folderModal, setFolderModal] = useState<{
    mode: 'create' | 'edit';
    parentId: string | null;
    folder: Folder | null;
  } | null>(null);
  const [moveMenu, setMoveMenu] = useState<
    | { quoteId: string; anchor: { top: number; left: number } }
    | null
  >(null);
  const [bulkMoveOpen, setBulkMoveOpen] = useState<{ top: number; left: number } | null>(null);

  // Compteurs par dossier (items directs de chaque dossier)
  const folderCounts = useMemo(() => {
    const out: Record<string, number> = { __null__: 0, __total__: quotes.length };
    for (const q of quotes) {
      const key = q.folder_id ?? '__null__';
      out[key] = (out[key] ?? 0) + 1;
    }
    return out;
  }, [quotes]);

  // Filtrage : par dossier puis par recherche.
  const filteredQuotes = useMemo(() => {
    let list = quotes;
    if (selectedFolder === '__unfiled__') {
      list = list.filter((q) => !q.folder_id);
    } else if (typeof selectedFolder === 'string') {
      // Inclut les sous-dossiers (cumul récursif).
      const ids = new Set(getDescendantIds(folders, selectedFolder));
      list = list.filter((q) => q.folder_id && ids.has(q.folder_id));
    }
    const q = searchQuery.trim().toLowerCase();
    if (!q) return list;
    return list.filter((quote) => {
      const clientName = clients.find((c) => c.id === quote.client_id)?.name ?? quote.client?.name ?? '';
      return (
        quote.title.toLowerCase().includes(q) ||
        (quote.quote_number ?? '').toLowerCase().includes(q) ||
        clientName.toLowerCase().includes(q) ||
        (quote.project?.name ?? '').toLowerCase().includes(q)
      );
    });
  }, [quotes, clients, searchQuery, selectedFolder, folders]);

  const visibleIds = useMemo(() => filteredQuotes.map((q) => q.id), [filteredQuotes]);
  const selection = useBulkSelection(visibleIds);

  const folderById = useMemo(() => new Map(folders.map((f) => [f.id, f] as const)), [folders]);

  const [bulkBusy, setBulkBusy] = useState(false);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);

  const bulkMarkSigned = async () => {
    setBulkBusy(true);
    try {
      const today = new Date().toISOString();
      for (const id of selection.selectedIds) {
        const q = quotes.find((qq) => qq.id === id);
        if (!q || q.status === 'signed') continue;
        await onUpdate(id, { status: 'signed', signed_at: today });
      }
      selection.clear();
    } finally {
      setBulkBusy(false);
    }
  };

  const bulkMarkSent = async () => {
    setBulkBusy(true);
    try {
      for (const id of selection.selectedIds) {
        const q = quotes.find((qq) => qq.id === id);
        if (!q || q.status === 'sent' || q.status === 'signed') continue;
        await onUpdate(id, { status: 'sent' });
      }
      selection.clear();
    } finally {
      setBulkBusy(false);
    }
  };

  const bulkDelete = async () => {
    setBulkBusy(true);
    try {
      for (const id of selection.selectedIds) {
        await onDelete(id);
      }
      selection.clear();
      setConfirmBulkDelete(false);
    } finally {
      setBulkBusy(false);
    }
  };

  const bulkMoveToFolder = async (folderId: string | null) => {
    setBulkBusy(true);
    try {
      for (const id of selection.selectedIds) {
        await onUpdate(id, { folder_id: folderId });
      }
      selection.clear();
    } finally {
      setBulkBusy(false);
    }
  };

  const moveSingleQuote = async (quoteId: string, folderId: string | null) => {
    await onUpdate(quoteId, { folder_id: folderId });
  };

  const handleCreateOrEditFolder = async (
    values: Pick<Folder, 'name' | 'color' | 'parent_id'>
  ) => {
    if (folderModal?.mode === 'edit' && folderModal.folder) {
      await onUpdateFolder(folderModal.folder.id, values);
    } else {
      await onCreateFolder(values);
    }
  };

  const handleDeleteFolder = async (folder: Folder) => {
    await onDeleteFolder(folder.id);
    if (selectedFolder === folder.id) setSelectedFolder(null);
  };

  const notifications = useMemo<AppNotification[]>(() => {
    const today = new Date();
    const result: AppNotification[] = [];

    for (const q of quotes) {
      if (q.valid_until) {
        const expiry = new Date(q.valid_until);
        const daysLeft = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (daysLeft >= 0 && daysLeft <= 7 && q.status !== 'signed' && q.status !== 'refused' && q.status !== 'expired') {
          result.push({
            id: `expiry-${q.id}`,
            type: daysLeft <= 2 ? 'warning' : 'info',
            message: `"${q.title}" expire dans ${daysLeft === 0 ? 'aujourd\'hui' : `${daysLeft} jour${daysLeft > 1 ? 's' : ''}`}`,
            time: formatDate(q.valid_until),
          });
        }
      }
      if (q.status === 'signed' && q.signed_at) {
        const signedDate = new Date(q.signed_at);
        const daysSince = Math.floor((today.getTime() - signedDate.getTime()) / (1000 * 60 * 60 * 24));
        if (daysSince <= 3) {
          result.push({
            id: `signed-${q.id}`,
            type: 'success',
            message: `Devis "${q.title}" signé${daysSince === 0 ? ' aujourd\'hui' : ` il y a ${daysSince} jour${daysSince > 1 ? 's' : ''}`}`,
            time: formatDate(q.signed_at),
          });
        }
      }
    }

    return result;
  }, [quotes]);

  const openPreview = (q: Quote) => {
    const fullClient = clients.find((c) => c.id === q.client_id)
    const client: Client | null = fullClient ?? (q.client
      ? {
          id: q.client.id,
          name: q.client.name,
          first_name: null,
          last_name: null,
          company: q.client.company ?? null,
          email: null,
          phone: null,
          address: null,
          city: null,
          website: null,
          status: 'prospect' as const,
          source: null,
          notes: null,
          satisfaction_rating: null,
          feedback: null,
          profession: null,
          legal_form: null,
          siret: null,
          vat_number: null,
          contact_role: null,
          avatar_color: q.client.avatar_color,
          created_at: '',
          updated_at: '',
        }
      : null)

    if (!client) return

    const project = projects.find((p) => p.id === q.project_id) ?? null

    const isRecurring = isRecurringQuoteHeuristic({
      quote_number: q.quote_number,
      title: q.title,
      notes: q.notes,
    })

    const parentQuoteForDeposit =
      isRecurring && q.parent_quote_id
        ? quotes.find((p) => p.id === q.parent_quote_id) ?? null
        : null
    const sourceQuote = parentQuoteForDeposit ?? q
    const depositPercent =
      sourceQuote.deposit_requested && sourceQuote.deposit_amount && sourceQuote.amount
        ? Math.round((sourceQuote.deposit_amount / sourceQuote.amount) * 100)
        : 30

    let parentQuoteRef: string | null = null
    if (isRecurring && q.notes) {
      const match = q.notes.match(/Suivi de la prestation livrée au titre du devis [^\n]+/)
      if (match) parentQuoteRef = match[0]
    }

    const html = generateDevisHTML({
      client,
      project,
      amount: q.amount,
      quoteNumber: q.quote_number ?? undefined,
      validityDays: 30,
      validUntilISO: q.valid_until,
      depositPercent,
      customNotes: isRecurring ? undefined : q.notes ?? undefined,
      includeCGV: !isRecurring,
      isRecurring,
      recurringScope: project?.recurring_support_scope ?? null,
      recurringTitle: isRecurring ? q.title : null,
      recurringDescription: project?.recurring_support_description ?? null,
      parentQuoteRef,
    })
    setPreviewQuote({ html, filename: `devis-${q.quote_number ?? q.id}.pdf` })
  }

  const openConvert = (q: Quote) => {
    setConvertQuote(q);
    setConvertMode(q.deposit_requested && q.deposit_amount ? 'deposit' : 'total');
    setModal('convert');
  };

  const handleConvert = async () => {
    if (!convertQuote) return;
    setConvertLoading(true);
    try {
      const useDeposit =
        convertMode === 'deposit' &&
        convertQuote.deposit_requested &&
        convertQuote.deposit_amount != null &&
        convertQuote.deposit_amount > 0;
      const amount = useDeposit ? convertQuote.deposit_amount! : convertQuote.amount;
      await onCreateInvoice({
        client_id: convertQuote.client_id,
        project_id: convertQuote.project_id,
        source_quote_id: convertQuote.id,
        // Hérite du dossier du devis source — UX cohérente : la facture suit le classement.
        folder_id: convertQuote.folder_id,
        invoice_number: generateInvoiceNumber(),
        amount,
        status: quoteStatusToInvoiceStatus(convertQuote.status),
        due_date: null,
        paid_date: null,
        notes: `Suite au devis ${convertQuote.quote_number || convertQuote.title}${useDeposit ? ' (acompte)' : ''}`,
      });
      setModal(null);
      setConvertQuote(null);
    } finally {
      setConvertLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleteLoading(true);
    await onDelete(deleteId);
    setDeleteLoading(false);
    setDeleteId(null);
  };

  return (
    <div>
      <Header
        title="Devis"
        subtitle="Propositions commerciales · conversion facture"
        actions={
          <Button
            variant="secondary"
            icon={<FileText size={16} />}
            className="normal-case tracking-normal"
            onClick={() => setModal('devis')}
          >
            Générer devis PDF
          </Button>
        }
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        notifications={notifications}
      />
      <div className="px-4 py-4 md:p-8 bg-ws-deep/20 min-h-[calc(100vh-120px)]">
        <div className="md:flex md:gap-4">
          <FolderSidebar
            tree={folderTree}
            counts={folderCounts}
            selectedFolderId={selectedFolder}
            onSelect={setSelectedFolder}
            onCreate={(parentId) => setFolderModal({ mode: 'create', parentId, folder: null })}
            onEdit={(folder) => setFolderModal({ mode: 'edit', parentId: folder.parent_id, folder })}
            onDelete={handleDeleteFolder}
          />
          <main className="flex-1 min-w-0 mt-4 md:mt-0 space-y-4">
        {filteredQuotes.length === 0 ? (
          <p className="text-sm text-ws-mist font-mono text-center py-16 ws-card rounded-xl">
            {searchQuery
              ? `Aucun devis pour « ${searchQuery} »`
              : selectedFolder === '__unfiled__'
                ? 'Aucun devis sans dossier.'
                : selectedFolder
                  ? 'Aucun devis dans ce dossier.'
                  : 'Aucun devis — créez-en un pour alimenter le pipeline.'}
          </p>
        ) : (
          <div className="space-y-2">
            <label className="flex items-center gap-2 px-2 text-xs text-ws-mist font-mono cursor-pointer select-none">
              <input
                type="checkbox"
                checked={selection.allSelected}
                ref={(el) => {
                  if (el) el.indeterminate = selection.someSelected;
                }}
                onChange={() => selection.toggleAll()}
                className="w-4 h-4 accent-ws-accent"
              />
              Tout sélectionner ({filteredQuotes.length})
            </label>
            {filteredQuotes.map((q) => {
              const isSelected = selection.has(q.id);
              const folder = q.folder_id ? folderById.get(q.folder_id) ?? null : null;
              const meta = [q.quote_number, q.client?.name, q.project?.name]
                .filter(Boolean)
                .join(' · ');
              return (
                <article
                  key={q.id}
                  className={`group ws-card rounded-xl border transition-all ${
                    isSelected
                      ? 'border-ws-accent/50 bg-ws-accent/5 shadow-glow-sm'
                      : 'border-ws-line/80 hover:border-ws-line'
                  }`}
                >
                  {/* En-tête : checkbox · titre · badges */}
                  <header className="flex items-start gap-3 p-4 sm:p-5 pb-2">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => selection.toggle(q.id)}
                      className="mt-1 w-4 h-4 accent-ws-accent flex-shrink-0"
                      aria-label={`Sélectionner devis ${q.quote_number || q.title}`}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="font-medium text-ws-paper text-sm sm:text-base leading-snug min-w-0 break-words">
                          {q.title}
                        </h3>
                        <div className="flex items-center gap-1.5 flex-shrink-0 pt-0.5">
                          {q.version > 1 && (
                            <span className="text-[10px] font-mono text-ws-mist border border-ws-line/60 rounded-md px-1.5 py-0.5">
                              v{q.version}
                            </span>
                          )}
                          <Badge value={q.status} />
                        </div>
                      </div>
                      {meta && (
                        <p className="text-xs text-ws-mist font-mono mt-1.5 truncate">{meta}</p>
                      )}
                    </div>
                  </header>

                  {/* Pied : montant + métadonnées + actions */}
                  <div className="flex items-end justify-between gap-3 flex-wrap px-4 sm:px-5 pb-4 sm:pb-5 pt-2 pl-11 sm:pl-12">
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className="font-mono text-base sm:text-lg font-semibold text-ws-bull tabular-nums">
                          {formatCurrency(q.amount)}
                        </span>
                        {q.deposit_requested && q.deposit_amount != null && (
                          <span className="text-[10px] font-mono text-ws-gold uppercase tracking-wider">
                            acompte {formatCurrency(q.deposit_amount)}
                          </span>
                        )}
                      </div>
                      {q.valid_until && (
                        <span className="text-[10px] text-ws-mist font-mono">
                          valide jusqu'au {formatDate(q.valid_until)}
                        </span>
                      )}
                      <FolderBadge
                        folder={folder}
                        onClick={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          setMoveMenu({
                            quoteId: q.id,
                            anchor: { top: rect.bottom + 4, left: rect.left },
                          });
                        }}
                      />
                    </div>
                    <div className="flex items-center gap-0.5 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => openPreview(q)}
                        title="Aperçu PDF"
                        aria-label="Aperçu PDF"
                        className="min-w-[40px] min-h-[40px] sm:min-w-[36px] sm:min-h-[36px] flex items-center justify-center rounded-lg text-ws-mist hover:text-ws-paper hover:bg-ws-raised transition-colors"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => openConvert(q)}
                        title="Convertir en facture"
                        aria-label="Convertir en facture"
                        className="min-w-[40px] min-h-[40px] sm:min-w-[36px] sm:min-h-[36px] flex items-center justify-center rounded-lg text-ws-mist hover:text-ws-accent hover:bg-ws-raised transition-colors"
                      >
                        <FileInput size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditing(q);
                          setModal('edit');
                        }}
                        title="Modifier"
                        aria-label="Modifier"
                        className="min-w-[40px] min-h-[40px] sm:min-w-[36px] sm:min-h-[36px] flex items-center justify-center rounded-lg text-ws-mist hover:text-ws-paper hover:bg-ws-raised transition-colors"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteId(q.id)}
                        title="Supprimer"
                        aria-label="Supprimer"
                        className="min-w-[40px] min-h-[40px] sm:min-w-[36px] sm:min-h-[36px] flex items-center justify-center rounded-lg text-ws-mist hover:text-ws-bear hover:bg-ws-bear-dim transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
          </main>
        </div>
      </div>

      <Modal
        isOpen={modal === 'edit'}
        onClose={() => {
          setModal(null);
          setEditing(null);
        }}
        title="Modifier le devis"
        size="lg"
      >
        <QuoteForm
          initial={editing ?? undefined}
          clients={clients}
          projects={projects}
          opportunities={opportunities}
          onCancel={() => {
            setModal(null);
            setEditing(null);
          }}
          onSubmit={async (data) => {
            if (editing) {
              await onUpdate(editing.id, data);
            }
            setModal(null);
            setEditing(null);
          }}
        />
      </Modal>

      <Modal
        isOpen={modal === 'convert' && Boolean(convertQuote)}
        onClose={() => {
          setModal(null);
          setConvertQuote(null);
        }}
        title="Créer une facture depuis le devis"
        size="md"
      >
        {convertQuote && (
          <div className="space-y-4">
            <p className="text-sm text-ws-ink">
              Devis <span className="text-ws-paper font-mono">{convertQuote.quote_number}</span> ·{' '}
              {formatCurrency(convertQuote.amount)}
            </p>
            {convertQuote.deposit_requested && convertQuote.deposit_amount != null && convertQuote.deposit_amount > 0 ? (
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm text-ws-paper cursor-pointer">
                  <input
                    type="radio"
                    name="cm"
                    checked={convertMode === 'total'}
                    onChange={() => setConvertMode('total')}
                  />
                  Montant total ({formatCurrency(convertQuote.amount)})
                </label>
                <label className="flex items-center gap-2 text-sm text-ws-paper cursor-pointer">
                  <input
                    type="radio"
                    name="cm"
                    checked={convertMode === 'deposit'}
                    onChange={() => setConvertMode('deposit')}
                  />
                  Acompte ({formatCurrency(convertQuote.deposit_amount)})
                </label>
              </div>
            ) : (
              <p className="text-xs text-ws-mist">Une facture brouillon sera créée pour le montant total.</p>
            )}
            <div className="flex gap-2 pt-2">
              <Button variant="secondary" className="flex-1 normal-case tracking-normal" onClick={() => setModal(null)}>
                Annuler
              </Button>
              <Button className="flex-1 normal-case tracking-normal" loading={convertLoading} onClick={handleConvert}>
                Créer la facture
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(deleteId)}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Supprimer ce devis ?"
        description="Action définitive."
        loading={deleteLoading}
      />

      <ConfirmDialog
        isOpen={confirmBulkDelete}
        onClose={() => setConfirmBulkDelete(false)}
        onConfirm={bulkDelete}
        title={`Supprimer ${selection.count} devis ?`}
        description="Action définitive — tous les devis sélectionnés seront supprimés."
        loading={bulkBusy}
      />

      <BulkActionBar
        count={selection.count}
        itemLabel="devis"
        onClear={() => selection.clear()}
      >
        <div className="relative">
          <Button
            variant="secondary"
            icon={<FolderInput size={14} />}
            onClick={(e) => {
              const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
              setBulkMoveOpen({ top: rect.bottom + 4, left: rect.left });
            }}
            disabled={bulkBusy}
            className="normal-case tracking-normal text-xs py-1.5"
          >
            Déplacer
          </Button>
        </div>
        <Button
          variant="secondary"
          icon={bulkBusy ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
          onClick={() => void bulkMarkSigned()}
          disabled={bulkBusy}
          className="normal-case tracking-normal text-xs py-1.5"
        >
          Marquer signés
        </Button>
        <Button
          variant="secondary"
          icon={
            bulkBusy ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />
          }
          onClick={() => void bulkMarkSent()}
          disabled={bulkBusy}
          className="normal-case tracking-normal text-xs py-1.5"
        >
          Marquer envoyés
        </Button>
        <Button
          icon={<Trash2 size={14} />}
          onClick={() => setConfirmBulkDelete(true)}
          disabled={bulkBusy}
          className="normal-case tracking-normal text-xs py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-200 border-red-500/40"
        >
          Supprimer
        </Button>
      </BulkActionBar>

      <CreateFolderModal
        isOpen={Boolean(folderModal)}
        onClose={() => setFolderModal(null)}
        initial={folderModal?.folder ?? null}
        tree={folderTree}
        defaultParentId={folderModal?.parentId ?? null}
        forbiddenParentIds={
          folderModal?.mode === 'edit' && folderModal.folder
            ? getDescendantIds(folders, folderModal.folder.id)
            : []
        }
        onSubmit={handleCreateOrEditFolder}
      />

      <MoveToFolderMenu
        isOpen={moveMenu !== null}
        onClose={() => setMoveMenu(null)}
        tree={folderTree}
        currentFolderId={
          moveMenu ? quotes.find((q) => q.id === moveMenu.quoteId)?.folder_id ?? null : null
        }
        anchor={moveMenu?.anchor}
        onSelect={async (folderId) => {
          if (moveMenu) await moveSingleQuote(moveMenu.quoteId, folderId);
        }}
      />

      <MoveToFolderMenu
        isOpen={bulkMoveOpen !== null}
        onClose={() => setBulkMoveOpen(null)}
        tree={folderTree}
        anchor={bulkMoveOpen ?? undefined}
        onSelect={async (folderId) => {
          await bulkMoveToFolder(folderId);
        }}
      />

      <GenerateDevisModal
        isOpen={modal === 'devis'}
        onClose={() => setModal(null)}
        clients={clients}
        projects={projects}
        onCreateQuote={onCreate}
      />

      {previewQuote && (
        <DevisPreviewOverlay
          html={previewQuote.html}
          filename={previewQuote.filename}
          onClose={() => setPreviewQuote(null)}
        />
      )}
    </div>
  );
}
