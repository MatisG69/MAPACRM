import { useEffect, useRef, useState } from 'react';
import { Folder as FolderIcon, FolderX, Search } from 'lucide-react';
import type { FolderNode } from '../../lib/types';

interface MoveToFolderMenuProps {
  isOpen: boolean;
  onClose: () => void;
  tree: FolderNode[];
  /** Dossier actuellement sélectionné (pour l'indicateur ✓). */
  currentFolderId?: string | null;
  /** IDs interdits (typique : on déplace un dossier, pas ses descendants). */
  forbiddenIds?: ReadonlyArray<string>;
  onSelect: (folderId: string | null) => void | Promise<void>;
  /** Position d'ancrage : top-right du déclencheur. */
  anchor?: { top: number; left: number };
}

interface FlatRow {
  id: string;
  name: string;
  color: string;
  depth: number;
}

function flatten(nodes: FolderNode[]): FlatRow[] {
  const out: FlatRow[] = [];
  const walk = (list: FolderNode[]) => {
    for (const n of list) {
      out.push({ id: n.id, name: n.name, color: n.color, depth: n.depth });
      if (n.children.length) walk(n.children);
    }
  };
  walk(nodes);
  return out;
}

/**
 * Menu contextuel pour déplacer un (ou plusieurs) item vers un dossier.
 * Inclut une option "Sans dossier" + un champ de recherche si > 8 dossiers.
 */
export function MoveToFolderMenu({
  isOpen,
  onClose,
  tree,
  currentFolderId,
  forbiddenIds = [],
  onSelect,
  anchor,
}: MoveToFolderMenuProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setSearch('');
      return;
    }
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const escHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    setTimeout(() => document.addEventListener('mousedown', handler), 0);
    document.addEventListener('keydown', escHandler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('keydown', escHandler);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const allRows = flatten(tree);
  const q = search.trim().toLowerCase();
  const rows = q ? allRows.filter((r) => r.name.toLowerCase().includes(q)) : allRows;
  const showSearch = allRows.length > 8;

  const handlePick = async (folderId: string | null) => {
    await onSelect(folderId);
    onClose();
  };

  const positionStyle: React.CSSProperties = anchor
    ? { position: 'fixed', top: anchor.top, left: anchor.left, zIndex: 60 }
    : { position: 'absolute', top: '100%', right: 0, marginTop: 4, zIndex: 60 };

  return (
    <div
      ref={ref}
      style={positionStyle}
      className="w-64 rounded-2xl border border-ws-line bg-ws-panel shadow-2xl overflow-hidden"
      role="menu"
    >
      <div className="px-3 py-2 border-b border-ws-line/60 text-[10px] font-mono uppercase tracking-wider text-ws-mist">
        Déplacer vers…
      </div>
      {showSearch && (
        <div className="px-2 pt-2">
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ws-mist/60" />
            <input
              type="text"
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un dossier"
              className="w-full pl-8 pr-2 py-1.5 rounded-lg bg-ws-deep/50 border border-ws-line/60 text-xs text-ws-paper placeholder:text-ws-mist/50 focus:border-ws-accent focus:outline-none"
            />
          </div>
        </div>
      )}
      <div className="max-h-72 overflow-y-auto py-1">
        <button
          type="button"
          onClick={() => void handlePick(null)}
          className={`w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-ws-raised text-left ${
            currentFolderId == null ? 'text-ws-accent' : 'text-ws-paper'
          }`}
        >
          <FolderX size={13} className="flex-shrink-0 text-ws-mist" />
          <span>Aucun dossier</span>
        </button>
        {rows.length === 0 ? (
          <p className="px-3 py-3 text-[10px] font-mono text-ws-mist text-center">
            {q ? `Aucun dossier pour « ${search} »` : 'Aucun dossier'}
          </p>
        ) : (
          rows.map((r) => {
            const disabled = forbiddenIds.includes(r.id);
            const selected = currentFolderId === r.id;
            return (
              <button
                key={r.id}
                type="button"
                disabled={disabled}
                onClick={() => void handlePick(r.id)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-xs text-left transition-colors ${
                  disabled
                    ? 'opacity-40 cursor-not-allowed'
                    : 'hover:bg-ws-raised'
                } ${selected ? 'text-ws-accent' : 'text-ws-paper'}`}
                style={{ paddingLeft: 12 + r.depth * 14 }}
                title={disabled ? 'Déplacement interdit (descendant)' : undefined}
              >
                <FolderIcon size={13} className="flex-shrink-0" style={{ color: r.color }} />
                <span className="truncate">{r.name}</span>
                {selected && <span className="ml-auto text-[10px] font-mono">✓</span>}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
