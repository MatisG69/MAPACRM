import { useEffect, useMemo, useState } from 'react';
import {
  ChevronRight,
  Folder as FolderIcon,
  FolderPlus,
  FolderX,
  Inbox,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import type { Folder, FolderNode } from '../../lib/types';
import { ConfirmDialog } from '../ui/ConfirmDialog';

interface FolderSidebarProps {
  tree: FolderNode[];
  /** Comptes par dossier (clé = folder.id, valeur = nombre d'items directs).
   *  La clé spéciale `__null__` représente les items sans dossier.
   *  La clé spéciale `__total__` représente le total. */
  counts: Record<string, number>;
  /** Dossier actif. `null` = "tous", `__unfiled__` = sans dossier. */
  selectedFolderId: string | null | '__unfiled__';
  onSelect: (folderId: string | null | '__unfiled__') => void;
  onCreate: (parentId: string | null) => void;
  onEdit: (folder: Folder) => void;
  onDelete: (folder: Folder) => Promise<void>;
}

/**
 * Sidebar arborescente des dossiers — desktop : colonne gauche,
 * mobile : sélecteur compact dépliable.
 *
 * Les compteurs incluent les items des sous-dossiers (cumul récursif),
 * ce qui correspond à l'attente naturelle d'un système de classement.
 */
export function FolderSidebar({
  tree,
  counts,
  selectedFolderId,
  onSelect,
  onCreate,
  onEdit,
  onDelete,
}: FolderSidebarProps) {
  // Compteurs cumulés (récursif) calculés à partir des compteurs directs.
  const cumulative = useMemo(() => {
    const out: Record<string, number> = {};
    const walk = (nodes: FolderNode[]): number => {
      let sum = 0;
      for (const n of nodes) {
        const direct = counts[n.id] ?? 0;
        const childSum = walk(n.children);
        out[n.id] = direct + childSum;
        sum += direct + childSum;
      }
      return sum;
    };
    walk(tree);
    return out;
  }, [tree, counts]);

  const totalCount = counts['__total__'] ?? 0;
  const unfiledCount = counts['__null__'] ?? 0;

  return (
    <>
      {/* Vue desktop : sidebar verticale fixe */}
      <aside className="hidden md:flex flex-col w-60 flex-shrink-0">
        <SidebarBody
          tree={tree}
          cumulative={cumulative}
          selectedFolderId={selectedFolderId}
          onSelect={onSelect}
          onCreate={onCreate}
          onEdit={onEdit}
          onDelete={onDelete}
          totalCount={totalCount}
          unfiledCount={unfiledCount}
        />
      </aside>

      {/* Vue mobile : déclencheur compact + drawer plein écran */}
      <MobileSidebar
        tree={tree}
        cumulative={cumulative}
        selectedFolderId={selectedFolderId}
        onSelect={onSelect}
        onCreate={onCreate}
        onEdit={onEdit}
        onDelete={onDelete}
        totalCount={totalCount}
        unfiledCount={unfiledCount}
      />
    </>
  );
}

interface SidebarBodyProps {
  tree: FolderNode[];
  cumulative: Record<string, number>;
  selectedFolderId: string | null | '__unfiled__';
  onSelect: (folderId: string | null | '__unfiled__') => void;
  onCreate: (parentId: string | null) => void;
  onEdit: (folder: Folder) => void;
  onDelete: (folder: Folder) => Promise<void>;
  totalCount: number;
  unfiledCount: number;
}

function SidebarBody({
  tree,
  cumulative,
  selectedFolderId,
  onSelect,
  onCreate,
  onEdit,
  onDelete,
  totalCount,
  unfiledCount,
}: SidebarBodyProps) {
  const [confirmDelete, setConfirmDelete] = useState<Folder | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await onDelete(confirmDelete);
      setConfirmDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="ws-card rounded-xl border border-ws-line/60 overflow-hidden flex flex-col">
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-ws-line/60">
        <span className="text-[10px] font-mono uppercase tracking-wider text-ws-mist">Dossiers</span>
        <button
          type="button"
          onClick={() => onCreate(null)}
          className="text-ws-mist hover:text-ws-accent transition-colors p-1 rounded-md hover:bg-ws-raised"
          aria-label="Nouveau dossier racine"
          title="Nouveau dossier"
        >
          <FolderPlus size={14} />
        </button>
      </div>
      <div className="flex flex-col overflow-y-auto max-h-[calc(100vh-220px)]">
        <SystemRow
          icon={<Inbox size={13} />}
          label="Tous"
          count={totalCount}
          selected={selectedFolderId === null}
          onClick={() => onSelect(null)}
        />
        <SystemRow
          icon={<FolderX size={13} />}
          label="Sans dossier"
          count={unfiledCount}
          selected={selectedFolderId === '__unfiled__'}
          onClick={() => onSelect('__unfiled__')}
        />
        {tree.length > 0 && <div className="border-t border-ws-line/40 my-1" />}
        {tree.map((node) => (
          <FolderTreeNode
            key={node.id}
            node={node}
            cumulative={cumulative}
            selectedFolderId={selectedFolderId}
            onSelect={onSelect}
            onCreate={onCreate}
            onEdit={onEdit}
            onAskDelete={setConfirmDelete}
          />
        ))}
        {tree.length === 0 && (
          <button
            type="button"
            onClick={() => onCreate(null)}
            className="text-xs text-ws-mist text-center py-4 px-3 hover:bg-ws-raised hover:text-ws-paper transition-colors"
          >
            <Plus size={14} className="inline mr-1.5" />
            Créer un premier dossier
          </button>
        )}
      </div>

      <ConfirmDialog
        isOpen={Boolean(confirmDelete)}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        title={`Supprimer le dossier « ${confirmDelete?.name ?? ''} » ?`}
        description="Les sous-dossiers seront aussi supprimés. Les devis et factures qu'ils contiennent ne sont pas supprimés — ils repassent en « Sans dossier »."
        loading={deleting}
      />
    </div>
  );
}

function SystemRow({
  icon,
  label,
  count,
  selected,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-2 text-xs text-left transition-colors ${
        selected ? 'bg-ws-accent/10 text-ws-accent' : 'text-ws-paper hover:bg-ws-raised'
      }`}
    >
      <span className="text-ws-mist flex-shrink-0">{icon}</span>
      <span className="flex-1 truncate">{label}</span>
      <span className={`font-mono text-[10px] ${selected ? 'text-ws-accent' : 'text-ws-mist'}`}>{count}</span>
    </button>
  );
}

interface FolderTreeNodeProps {
  node: FolderNode;
  cumulative: Record<string, number>;
  selectedFolderId: string | null | '__unfiled__';
  onSelect: (folderId: string | null | '__unfiled__') => void;
  onCreate: (parentId: string | null) => void;
  onEdit: (folder: Folder) => void;
  onAskDelete: (folder: Folder) => void;
}

function FolderTreeNode({
  node,
  cumulative,
  selectedFolderId,
  onSelect,
  onCreate,
  onEdit,
  onAskDelete,
}: FolderTreeNodeProps) {
  const [expanded, setExpanded] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const hasChildren = node.children.length > 0;
  const selected = selectedFolderId === node.id;
  const indent = 8 + node.depth * 14;

  return (
    <div>
      <div
        className={`group flex items-center gap-1 pr-1.5 transition-colors ${
          selected ? 'bg-ws-accent/10' : 'hover:bg-ws-raised'
        }`}
      >
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className={`flex-shrink-0 w-5 h-7 flex items-center justify-center text-ws-mist hover:text-ws-paper ${
            !hasChildren ? 'invisible' : ''
          }`}
          style={{ marginLeft: indent - 4 }}
          aria-label={expanded ? 'Replier' : 'Déplier'}
        >
          <ChevronRight
            size={11}
            className={`transition-transform ${expanded ? 'rotate-90' : ''}`}
          />
        </button>
        <button
          type="button"
          onClick={() => onSelect(node.id)}
          className={`flex-1 flex items-center gap-2 py-1.5 text-xs text-left min-w-0 ${
            selected ? 'text-ws-accent' : 'text-ws-paper'
          }`}
        >
          <FolderIcon size={12} className="flex-shrink-0" style={{ color: node.color }} />
          <span className="truncate">{node.name}</span>
          <span className={`ml-auto font-mono text-[10px] ${selected ? 'text-ws-accent' : 'text-ws-mist'}`}>
            {cumulative[node.id] ?? 0}
          </span>
        </button>
        <FolderActionsMenu
          open={menuOpen}
          onOpenChange={setMenuOpen}
          onCreateChild={() => onCreate(node.id)}
          onEdit={() => onEdit(node)}
          onDelete={() => onAskDelete(node)}
        />
      </div>
      {expanded && hasChildren && (
        <div>
          {node.children.map((child) => (
            <FolderTreeNode
              key={child.id}
              node={child}
              cumulative={cumulative}
              selectedFolderId={selectedFolderId}
              onSelect={onSelect}
              onCreate={onCreate}
              onEdit={onEdit}
              onAskDelete={onAskDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function FolderActionsMenu({
  open,
  onOpenChange,
  onCreateChild,
  onEdit,
  onDelete,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreateChild: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onOpenChange]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onOpenChange(!open);
        }}
        className="opacity-0 group-hover:opacity-100 focus:opacity-100 w-6 h-6 flex items-center justify-center rounded-md text-ws-mist hover:text-ws-paper hover:bg-ws-deep/50"
        aria-label="Actions du dossier"
      >
        <MoreHorizontal size={12} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => onOpenChange(false)} aria-hidden />
          <div className="absolute right-0 top-full mt-1 z-50 w-44 rounded-lg border border-ws-line bg-ws-panel shadow-xl overflow-hidden">
            <button
              type="button"
              onClick={() => {
                onCreateChild();
                onOpenChange(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-ws-paper hover:bg-ws-raised text-left"
            >
              <Plus size={12} className="text-ws-mist" />
              Sous-dossier
            </button>
            <button
              type="button"
              onClick={() => {
                onEdit();
                onOpenChange(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-ws-paper hover:bg-ws-raised text-left"
            >
              <Pencil size={12} className="text-ws-mist" />
              Renommer / couleur
            </button>
            <button
              type="button"
              onClick={() => {
                onDelete();
                onOpenChange(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 text-left border-t border-ws-line/40"
            >
              <Trash2 size={12} />
              Supprimer
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Variante mobile : un déclencheur compact + drawer en bas qui affiche
 * la même arborescence que la sidebar desktop.
 */
function MobileSidebar(props: SidebarBodyProps) {
  const [open, setOpen] = useState(false);
  const labelOf = (id: string | null | '__unfiled__'): string => {
    if (id === null) return 'Tous';
    if (id === '__unfiled__') return 'Sans dossier';
    const flat: FolderNode[] = [];
    const walk = (nodes: FolderNode[]) => {
      for (const n of nodes) {
        flat.push(n);
        if (n.children.length) walk(n.children);
      }
    };
    walk(props.tree);
    return flat.find((n) => n.id === id)?.name ?? 'Tous';
  };

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border border-ws-line bg-ws-panel/90 text-sm text-ws-paper"
      >
        <span className="flex items-center gap-2 min-w-0">
          <FolderIcon size={14} className="text-ws-accent flex-shrink-0" />
          <span className="truncate font-mono text-xs">{labelOf(props.selectedFolderId)}</span>
        </span>
        <ChevronRight size={14} className="text-ws-mist flex-shrink-0 rotate-90" />
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setOpen(false)} aria-hidden />
          <div className="relative w-full bg-ws-panel rounded-t-3xl border-t border-ws-line max-h-[80dvh] flex flex-col pb-[max(0.5rem,env(safe-area-inset-bottom))]">
            <div className="h-1 w-12 rounded-full bg-ws-accent mx-auto mt-3" />
            <div className="flex-1 overflow-y-auto">
              <SidebarBody
                {...props}
                onSelect={(id) => {
                  props.onSelect(id);
                  setOpen(false);
                }}
                onCreate={(parentId) => {
                  props.onCreate(parentId);
                  setOpen(false);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
