import { useMemo, useState } from 'react';
import { Plus, FileText, Pencil, Trash2 } from 'lucide-react';
import { Header } from '../components/layout/Header';
import type { AppNotification } from '../components/layout/Header';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { EmptyState } from '../components/ui/EmptyState';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { InvoiceForm } from '../components/invoices/InvoiceForm';
import { Client, Invoice, Project } from '../lib/types';
import { formatCurrency, formatDate, isOverdue } from '../lib/utils';

interface InvoicesPageProps {
  invoices: Invoice[];
  clients: Client[];
  projects: Project[];
  onCreate: (
    data: Omit<Invoice, 'id' | 'created_at' | 'updated_at' | 'client' | 'project'>
  ) => Promise<Invoice>;
  onUpdate: (id: string, data: Partial<Invoice>) => Promise<Invoice>;
  onDelete: (id: string) => Promise<void>;
}

export function InvoicesPage({ invoices, clients, projects, onCreate, onUpdate, onDelete }: InvoicesPageProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [editInvoice, setEditInvoice] = useState<Invoice | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [search, setSearch] = useState('');

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
          <Button icon={<Plus size={16} />} onClick={() => setShowCreate(true)}>
            Nouvelle facture
          </Button>
        }
      />

      <div className="px-4 py-4 md:p-8 bg-ws-deep/20 min-h-[calc(100vh-120px)]">
        {invoices.length === 0 ? (
          <EmptyState
            icon={<FileText size={24} />}
            title="Aucune facture"
            description="Consignez chaque facture pour un tableau de bord type reporting financier"
            action={{ label: 'Créer une facture', onClick: () => setShowCreate(true) }}
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
                  className="ws-card rounded-2xl p-4 border border-ws-line space-y-3 touch-manipulation"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-mono text-xs text-ws-gold/90">{inv.invoice_number || '—'}</p>
                      <p className="font-medium text-ws-paper mt-1">{inv.client?.name || '—'}</p>
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
            <table className="w-full text-sm min-w-[720px]">
              <thead>
                <tr className="ws-table-header">
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
                  <tr key={inv.id} className="border-b border-ws-line/50 hover:bg-ws-raised/40 group">
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
    </div>
  );
}
