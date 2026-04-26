import { useMemo, useState } from 'react';
import { FileText, Pencil, Trash2, FilePlus2, Eye, Check, Loader2 } from 'lucide-react';
import { useBulkSelection } from '../hooks/useBulkSelection';
import { BulkActionBar } from '../components/ui/BulkActionBar';
import { Header } from '../components/layout/Header';
import type { AppNotification } from '../components/layout/Header';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { EmptyState } from '../components/ui/EmptyState';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { InvoiceForm } from '../components/invoices/InvoiceForm';
import { GenerateInvoiceModal } from '../components/invoices/GenerateInvoiceModal';
import { InvoicePreviewOverlay } from '../components/invoices/InvoicePreviewOverlay';
import { generateInvoiceHTML, MAPA_VENDOR } from '../lib/invoiceGenerator';
import { Client, Invoice, Project, Quote } from '../lib/types';

/**
 * RIB MAPA pour règlement — paramétrable via env vars (zéro hardcoding produit).
 * Ces variables sont publiques (visibles côté client) car affichées sur les factures.
 */
const DEFAULT_IBAN =
  ((import.meta.env.VITE_MAPA_IBAN as string | undefined)?.trim() ||
    'FR76 1670 6050 8763 5180 1129 014');
const DEFAULT_BIC =
  ((import.meta.env.VITE_MAPA_BIC as string | undefined)?.trim() || 'AGRIFRPP867');
import { formatCurrency, formatDate, isOverdue } from '../lib/utils';

interface InvoicesPageProps {
  invoices: Invoice[];
  clients: Client[];
  projects: Project[];
  /** Devis du CRM (pour pré-remplir une facture depuis un devis signé) */
  quotes?: Quote[];
  onCreate: (
    data: Omit<Invoice, 'id' | 'created_at' | 'updated_at' | 'client' | 'project'>
  ) => Promise<Invoice>;
  onUpdate: (id: string, data: Partial<Invoice>) => Promise<Invoice>;
  onDelete: (id: string) => Promise<void>;
}

export function InvoicesPage({
  invoices,
  clients,
  projects,
  quotes = [],
  onCreate,
  onUpdate,
  onDelete,
}: InvoicesPageProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [showGenerate, setShowGenerate] = useState(false);
  const [editInvoice, setEditInvoice] = useState<Invoice | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewFilename, setPreviewFilename] = useState('');

  const openPreview = (inv: Invoice) => {
    const client =
      inv.client ?? clients.find((c) => c.id === inv.client_id) ?? null;
    const project =
      inv.project ?? projects.find((p) => p.id === inv.project_id) ?? null;
    if (!client) return;
    const sourceQuote = inv.source_quote_id
      ? quotes.find((q) => q.id === inv.source_quote_id)
      : null;
    // Détecte si c'est une facture d'acompte ou de solde via le notes ou le pattern de numéro.
    // À défaut, on génère en mode 'full' (pas d'acompte associé connu côté DB).
    const html = generateInvoiceHTML({
      client: {
        ...client,
        legal_form: (client as Client).legal_form ?? null,
        siret: (client as Client).siret ?? null,
        vat_number: (client as Client).vat_number ?? null,
        contact_role: (client as Client).contact_role ?? null,
      } as Client,
      project: project as Project | null,
      totalAmount: inv.amount,
      invoiceNumber: inv.invoice_number ?? '',
      kind: 'full',
      issueDateISO: inv.created_at?.slice(0, 10),
      dueDateISO: inv.due_date ?? undefined,
      serviceDateISO: inv.due_date ?? inv.created_at?.slice(0, 10),
      sourceQuoteRef: sourceQuote?.quote_number ?? undefined,
      sourceQuoteSignedISO: sourceQuote?.signed_at?.slice(0, 10) ?? undefined,
      customNotes: inv.notes ?? undefined,
      iban: DEFAULT_IBAN,
      bic: DEFAULT_BIC,
      vendor: MAPA_VENDOR,
    });
    setPreviewFilename(`facture-${inv.invoice_number ?? inv.id}.pdf`);
    setPreviewHtml(html);
  };

  const totalPending = invoices
    .filter((i) => i.status === 'sent' || i.status === 'overdue')
    .reduce((s, i) => s + i.amount, 0);

  const notifications = useMemo<AppNotification[]>(() => {
    const result: AppNotification[] = [];
    const overdueInvoices = invoices.filter((i) => i.status === 'overdue');
    if (overdueInvoices.length > 0) {
      result.push({
        id: 'overdue-invoices',
        type: 'warning',
        message: `${overdueInvoices.length} facture${overdueInvoices.length > 1 ? 's' : ''} en retard de paiement`,
      });
    }
    const today = new Date();
    const soon = invoices.filter((i) => {
      if (i.status !== 'sent' || !i.due_date) return false;
      const d = new Date(i.due_date);
      const days = Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return days >= 0 && days <= 7;
    });
    if (soon.length > 0) {
      result.push({
        id: 'due-soon',
        type: 'info',
        message: `${soon.length} facture${soon.length > 1 ? 's' : ''} à échéance dans 7 jours`,
      });
    }
    return result;
  }, [invoices]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return invoices;
    return invoices.filter((inv) =>
      [inv.invoice_number, inv.client?.name, inv.project?.name, inv.notes].some((f) =>
        f?.toLowerCase().includes(q)
      )
    );
  }, [invoices, search]);

  const visibleIds = useMemo(() => filtered.map((i) => i.id), [filtered]);
  const selection = useBulkSelection(visibleIds);

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleteLoading(true);
    await onDelete(deleteId);
    setDeleteLoading(false);
    setDeleteId(null);
  };

  // Bulk actions
  const [bulkBusy, setBulkBusy] = useState(false);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);

  const bulkMarkPaid = async () => {
    setBulkBusy(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      for (const id of selection.selectedIds) {
        const inv = invoices.find((i) => i.id === id);
        if (!inv || inv.status === 'paid') continue;
        await onUpdate(id, { status: 'paid', paid_date: today });
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
        const inv = invoices.find((i) => i.id === id);
        if (!inv || inv.status === 'sent' || inv.status === 'paid') continue;
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

  return (
    <div>
      <Header
        title="Compensation & factures"
        subtitle={
          invoices.length
            ? `${invoices.length} ligne(s) · ${formatCurrency(totalPending)} en attente de règlement`
            : 'Journal des montants facturés — suivi des encaissements'
        }
        searchValue={search}
        onSearchChange={setSearch}
        notifications={notifications}
        actions={
          <Button
            icon={<FilePlus2 size={16} />}
            onClick={() => setShowGenerate(true)}
            className="normal-case tracking-normal"
          >
            Générer une facture
          </Button>
        }
      />

      <div className="px-4 py-4 md:p-8 bg-ws-deep/20 min-h-[calc(100vh-120px)]">
        {invoices.length === 0 ? (
          <EmptyState
            icon={<FileText size={24} />}
            title="Aucune facture"
            description="Consignez chaque facture pour un tableau de bord type reporting financier"
            action={{ label: 'Générer une facture', onClick: () => setShowGenerate(true) }}
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<FileText size={24} />}
            title="Aucun résultat"
            description={`Aucune facture pour « ${search} »`}
          />
        ) : (
          <>
            <div className="md:hidden space-y-3">
              {filtered.map((inv) => (
                <div
                  key={inv.id}
                  className={`ws-card rounded-2xl p-4 border space-y-3 touch-manipulation transition-colors ${
                    selection.has(inv.id)
                      ? 'border-ws-accent/50 bg-ws-accent/5'
                      : 'border-ws-line'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={selection.has(inv.id)}
                        onChange={() => selection.toggle(inv.id)}
                        className="mt-1 w-4 h-4 accent-ws-accent flex-shrink-0"
                        aria-label={`Sélectionner facture ${inv.invoice_number || inv.id}`}
                      />
                      <div>
                        <p className="font-mono text-xs text-ws-gold/90">{inv.invoice_number || '—'}</p>
                        <p className="font-medium text-ws-paper mt-1">{inv.client?.name || '—'}</p>
                      </div>
                    </div>
                    <Badge value={inv.status} />
                  </div>
                  {inv.project?.name && (
                    <p className="text-xs text-ws-mist font-mono">{inv.project.name}</p>
                  )}
                  <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-ws-line/60">
                    <span className="font-mono font-semibold text-ws-bull tabular-nums text-lg">
                      {formatCurrency(inv.amount)}
                    </span>
                    <span
                      className={`font-mono text-xs ${inv.due_date && inv.status !== 'paid' && inv.status !== 'cancelled' && isOverdue(inv.due_date) ? 'text-ws-bear font-semibold' : 'text-ws-ink'}`}
                    >
                      {formatDate(inv.due_date)}
                    </span>
                  </div>
                  <div className="flex justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => openPreview(inv)}
                      className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl hover:bg-ws-panel text-ws-mist hover:text-ws-paper"
                      aria-label="Aperçu PDF"
                    >
                      <Eye size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditInvoice(inv)}
                      className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl hover:bg-ws-panel text-ws-mist hover:text-ws-paper"
                      aria-label="Modifier"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteId(inv.id)}
                      className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl hover:bg-ws-bear-dim text-ws-mist hover:text-ws-bear"
                      aria-label="Supprimer"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="hidden md:block ws-card rounded-lg overflow-hidden border-ws-line overflow-x-auto">
            <table className="w-full text-sm min-w-[760px]">
              <thead>
                <tr className="ws-table-header">
                  <th className="px-3 py-3 w-10">
                    <input
                      type="checkbox"
                      checked={selection.allSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = selection.someSelected;
                      }}
                      onChange={() => selection.toggleAll()}
                      className="w-4 h-4 accent-ws-accent"
                      aria-label="Tout sélectionner"
                    />
                  </th>
                  <th className="px-4 py-3">N°</th>
                  <th className="px-4 py-3">Client</th>
                  <th className="px-4 py-3 hidden lg:table-cell">Projet</th>
                  <th className="px-4 py-3 text-right">Montant</th>
                  <th className="px-4 py-3">Échéance</th>
                  <th className="px-4 py-3">Statut</th>
                  <th className="px-4 py-3 w-24 bg-ws-deep/30" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((inv) => (
                  <tr
                    key={inv.id}
                    className={`border-b border-ws-line/50 hover:bg-ws-raised/40 group transition-colors ${
                      selection.has(inv.id) ? 'bg-ws-accent/8' : ''
                    }`}
                  >
                    <td className="px-3 py-3">
                      <input
                        type="checkbox"
                        checked={selection.has(inv.id)}
                        onChange={() => selection.toggle(inv.id)}
                        className="w-4 h-4 accent-ws-accent"
                        aria-label={`Sélectionner facture ${inv.invoice_number || inv.id}`}
                      />
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-ws-gold/90">{inv.invoice_number || '—'}</td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-ws-paper">{inv.client?.name || '—'}</span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-ws-mist text-xs font-mono">
                      {inv.project?.name || '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-ws-bull tabular-nums">
                      {formatCurrency(inv.amount)}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">
                      <span
                        className={inv.due_date && inv.status !== 'paid' && inv.status !== 'cancelled' && isOverdue(inv.due_date) ? 'text-ws-bear font-semibold' : 'text-ws-ink'}
                      >
                        {formatDate(inv.due_date)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge value={inv.status} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                        <button
                          type="button"
                          onClick={() => openPreview(inv)}
                          className="p-1.5 rounded-md hover:bg-ws-panel text-ws-mist hover:text-ws-paper"
                          title="Aperçu PDF"
                        >
                          <Eye size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditInvoice(inv)}
                          className="p-1.5 rounded-md hover:bg-ws-panel text-ws-mist hover:text-ws-paper"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteId(inv.id)}
                          className="p-1.5 rounded-md hover:bg-ws-bear-dim text-ws-mist hover:text-ws-bear"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}
      </div>

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Nouvelle facture" size="lg">
        <InvoiceForm
          clients={clients}
          projects={projects}
          onSubmit={async (data) => {
            await onCreate(data);
            setShowCreate(false);
          }}
          onCancel={() => setShowCreate(false)}
        />
      </Modal>

      <GenerateInvoiceModal
        isOpen={showGenerate}
        onClose={() => setShowGenerate(false)}
        clients={clients}
        projects={projects}
        quotes={quotes}
        existingInvoices={invoices}
        defaultIban={DEFAULT_IBAN}
        defaultBic={DEFAULT_BIC}
        onCreateInvoice={onCreate}
      />

      {previewHtml && (
        <InvoicePreviewOverlay
          html={previewHtml}
          filename={previewFilename}
          onClose={() => setPreviewHtml(null)}
        />
      )}

      <Modal isOpen={!!editInvoice} onClose={() => setEditInvoice(null)} title="Modifier la facture" size="lg">
        {editInvoice && (
          <InvoiceForm
            key={editInvoice.id}
            initial={editInvoice}
            clients={clients}
            projects={projects}
            onSubmit={async (data) => {
              await onUpdate(editInvoice.id, data);
              setEditInvoice(null);
            }}
            onCancel={() => setEditInvoice(null)}
          />
        )}
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Supprimer la facture ?"
        description="Cette action est définitive."
        loading={deleteLoading}
      />

      <ConfirmDialog
        isOpen={confirmBulkDelete}
        onClose={() => setConfirmBulkDelete(false)}
        onConfirm={bulkDelete}
        title={`Supprimer ${selection.count} facture${selection.count > 1 ? 's' : ''} ?`}
        description="Action définitive — toutes les factures sélectionnées seront supprimées."
        loading={bulkBusy}
      />

      <BulkActionBar
        count={selection.count}
        itemLabel="facture"
        onClear={() => selection.clear()}
      >
        <Button
          variant="secondary"
          icon={
            bulkBusy ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />
          }
          onClick={() => void bulkMarkPaid()}
          disabled={bulkBusy}
          className="normal-case tracking-normal text-xs py-1.5"
        >
          Marquer réglées
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
          Marquer envoyées
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
    </div>
  );
}
