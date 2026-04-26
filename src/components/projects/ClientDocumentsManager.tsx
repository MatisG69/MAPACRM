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
} from 'lucide-react';
import { Button } from '../ui/Button';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { useClientDocuments } from '../../hooks/useClientDocuments';
import type { ClientDocument, ClientDocumentCategory } from '../../lib/types';
import { formatDate } from '../../lib/utils';

interface ClientDocumentsManagerProps {
  clientId: string;
  /** Si fourni, les uploads sont taggés avec ce projet et l'affichage est filtré dessus. */
  projectId?: string | null;
  /** Affiche un en-tête compact (utile en sous-section d'une page projet). */
  compact?: boolean;
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

function formatBytes(bytes: number | null): string {
  if (bytes == null) return '—';
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

export function ClientDocumentsManager({
  clientId,
  projectId,
  compact = false,
}: ClientDocumentsManagerProps) {
  const { documents, loading, error, upload, remove, getSignedUrl } = useClientDocuments(
    clientId,
    projectId ?? null,
  );

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [form, setForm] = useState({
    name: '',
    description: '',
    category: 'autre' as ClientDocumentCategory,
  });
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [confirmDelete, setConfirmDelete] = useState<ClientDocument | null>(null);
  const [previewing, setPreviewing] = useState<string | null>(null);

  const sortedDocs = useMemo(
    () => [...documents].sort((a, b) => b.created_at.localeCompare(a.created_at)),
    [documents],
  );

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

  const handlePreview = async (doc: ClientDocument) => {
    setPreviewing(doc.id);
    try {
      const url = await getSignedUrl(doc, 300);
      if (url) window.open(url, '_blank', 'noopener,noreferrer');
    } finally {
      setPreviewing(null);
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

  return (
    <section className="space-y-4">
      {!compact && (
        <header className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h3 className="font-display text-base font-bold text-ws-paper">
              Documents partagés
            </h3>
            <p className="text-xs font-mono text-ws-mist mt-0.5">
              Visibles par le client dans son espace portail
              {projectId ? ' · filtrés sur ce projet' : ''}
            </p>
          </div>
          <Button
            size="sm"
            variant="secondary"
            icon={<Upload size={14} />}
            onClick={onPickFile}
            className="normal-case tracking-normal"
          >
            Ajouter un document
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={onFileChange}
          />
        </header>
      )}

      {compact && (
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <FolderOpen size={14} className="text-ws-accent" />
            <span className="text-sm font-semibold text-ws-paper">Documents partagés</span>
            <span className="text-[10px] font-mono text-ws-mist">({documents.length})</span>
          </div>
          <Button
            size="sm"
            variant="secondary"
            icon={<Upload size={14} />}
            onClick={onPickFile}
            className="normal-case tracking-normal"
          >
            Ajouter
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={onFileChange}
          />
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
            <p className="text-xs text-red-300 bg-red-500/10 border border-red-500/20 rounded-md px-2 py-1.5 font-mono">
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

        {loading && documents.length === 0 ? (
          <p className="text-sm text-ws-mist py-8 text-center font-mono">Chargement…</p>
        ) : sortedDocs.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <FolderOpen size={22} className="mx-auto mb-3 text-ws-mist/60" />
            <p className="text-sm text-ws-paper font-medium mb-1">Aucun document partagé</p>
            <p className="text-xs text-ws-mist max-w-md mx-auto leading-relaxed">
              Cliquez sur « Ajouter un document » pour partager un contrat, un livrable, un
              compte-rendu… Le client le verra immédiatement dans son espace.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-ws-line">
            {sortedDocs.map((doc) => {
              const Icon = CATEGORY_ICON[doc.category] ?? FileText;
              return (
                <div
                  key={doc.id}
                  className="px-4 py-3.5 flex items-center gap-3 hover:bg-ws-raised/30 transition-colors group"
                >
                  <div
                    className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border ${CATEGORY_STYLE[doc.category]}`}
                  >
                    <Icon size={16} strokeWidth={2} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-ws-paper truncate">{doc.name}</p>
                      <span
                        className={`inline-flex items-center px-1.5 py-0.5 rounded-full border text-[9px] font-mono uppercase tracking-[0.15em] ${CATEGORY_STYLE[doc.category]}`}
                      >
                        {CATEGORY_OPTIONS.find((o) => o.value === doc.category)?.label ?? doc.category}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {doc.description && (
                        <span className="text-[11px] text-ws-ink truncate">{doc.description}</span>
                      )}
                      <span className="text-[10px] font-mono text-ws-mist/70 flex items-center gap-1">
                        <Calendar size={9} />
                        {formatDate(doc.created_at)}
                      </span>
                      <span className="text-[10px] font-mono text-ws-mist/70">
                        {formatBytes(doc.file_size)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => handlePreview(doc)}
                      disabled={previewing === doc.id}
                      className="p-1.5 rounded-md text-ws-mist hover:text-ws-accent hover:bg-ws-accent/10 disabled:opacity-50"
                      aria-label="Voir"
                      title="Voir"
                    >
                      {previewing === doc.id ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Eye size={14} />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(doc)}
                      className="p-1.5 rounded-md text-ws-mist hover:text-red-400 hover:bg-red-500/10"
                      aria-label="Supprimer"
                      title="Supprimer"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
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
    </section>
  );
}
