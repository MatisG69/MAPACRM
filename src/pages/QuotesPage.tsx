import { useState } from 'react';
import { Plus, Pencil, Trash2, FileInput } from 'lucide-react';
import { Header } from '../components/layout/Header';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Badge } from '../components/ui/Badge';
import { QuoteForm } from '../components/quotes/QuoteForm';
import type { Client, Invoice, Opportunity, Project, Quote } from '../lib/types';
import { formatCurrency, formatDate, generateInvoiceNumber } from '../lib/utils';

interface QuotesPageProps {
  quotes: Quote[];
  clients: Client[];
  projects: Project[];
  opportunities: Opportunity[];
  onCreate: (data: Omit<Quote, 'id' | 'created_at' | 'updated_at' | 'client' | 'project' | 'opportunity'>) => Promise<Quote>;
  onUpdate: (id: string, data: Partial<Quote>) => Promise<Quote>;
  onDelete: (id: string) => Promise<void>;
  onCreateInvoice: (
    data: Omit<Invoice, 'id' | 'created_at' | 'updated_at' | 'client' | 'project'>
  ) => Promise<Invoice>;
}

export function QuotesPage({
  quotes,
  clients,
  projects,
  opportunities,
  onCreate,
  onUpdate,
  onDelete,
  onCreateInvoice,
}: QuotesPageProps) {
  const [modal, setModal] = useState<'new' | 'edit' | 'convert' | null>(null);
  const [editing, setEditing] = useState<Quote | null>(null);
  const [convertQuote, setConvertQuote] = useState<Quote | null>(null);
  const [convertMode, setConvertMode] = useState<'total' | 'deposit'>('total');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [convertLoading, setConvertLoading] = useState(false);

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
        invoice_number: generateInvoiceNumber(),
        amount,
        status: 'draft',
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
          <Button icon={<Plus size={16} />} className="normal-case tracking-normal" onClick={() => setModal('new')}>
            Nouveau devis
          </Button>
        }
      />
      <div className="px-4 py-4 md:p-8 space-y-4 bg-ws-deep/20 min-h-[calc(100vh-120px)]">
        {quotes.length === 0 ? (
          <p className="text-sm text-ws-mist font-mono text-center py-16 ws-card rounded-xl">
            Aucun devis — créez-en un pour alimenter le pipeline.
          </p>
        ) : (
          <div className="space-y-2">
            {quotes.map((q) => (
              <div
                key={q.id}
                className="ws-card rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-ws-line/80"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <p className="font-medium text-ws-paper">{q.title}</p>
                    <Badge value={q.status} />
                    {q.version > 1 && (
                      <span className="text-[10px] font-mono text-ws-mist">v{q.version}</span>
                    )}
                  </div>
                  <p className="text-xs text-ws-mist font-mono truncate">
                    {q.quote_number} · {q.client?.name}
                    {q.project?.name ? ` · ${q.project.name}` : ''}
                  </p>
                  <p className="text-sm font-mono text-ws-bull mt-2 tabular-nums">{formatCurrency(q.amount)}</p>
                  {q.valid_until && (
                    <p className="text-[10px] text-ws-mist mt-1">Valide jusqu’au {formatDate(q.valid_until)}</p>
                  )}
                  {q.deposit_requested && q.deposit_amount != null && (
                    <p className="text-[10px] text-ws-gold mt-1">
                      Acompte : {formatCurrency(q.deposit_amount)}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="secondary"
                    icon={<FileInput size={16} />}
                    className="normal-case tracking-normal text-xs"
                    onClick={() => openConvert(q)}
                  >
                    Facturer
                  </Button>
                  <Button
                    variant="secondary"
                    icon={<Pencil size={16} />}
                    className="normal-case tracking-normal"
                    onClick={() => {
                      setEditing(q);
                      setModal('edit');
                    }}
                  >
                    Modifier
                  </Button>
                  <Button
                    variant="danger"
                    icon={<Trash2 size={16} />}
                    className="normal-case tracking-normal"
                    onClick={() => setDeleteId(q.id)}
                  >
                    Supprimer
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal
        isOpen={modal === 'new' || modal === 'edit'}
        onClose={() => {
          setModal(null);
          setEditing(null);
        }}
        title={modal === 'edit' ? 'Modifier le devis' : 'Nouveau devis'}
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
            } else {
              await onCreate(data);
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
    </div>
  );
}
