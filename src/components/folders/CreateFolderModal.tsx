import { useEffect, useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import type { Folder, FolderNode } from '../../lib/types';
import { FOLDER_COLORS, DEFAULT_FOLDER_COLOR } from './folderColors';

interface CreateFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Dossier en cours d'édition (édition) ou null (création). */
  initial?: Folder | null;
  /** Arborescence pour proposer le parent. */
  tree: FolderNode[];
  /** ID du dossier pré-sélectionné comme parent (création depuis un dossier existant). */
  defaultParentId?: string | null;
  /** IDs interdits comme parent (descendance + soi-même, pour éviter les cycles en édition). */
  forbiddenParentIds?: ReadonlyArray<string>;
  onSubmit: (
    values: Pick<Folder, 'name' | 'color' | 'parent_id'>
  ) => Promise<unknown> | unknown;
}

function flattenForSelect(nodes: FolderNode[]): Array<{ id: string; label: string; depth: number }> {
  const out: Array<{ id: string; label: string; depth: number }> = [];
  const walk = (list: FolderNode[]) => {
    for (const n of list) {
      out.push({ id: n.id, label: n.name, depth: n.depth });
      if (n.children.length) walk(n.children);
    }
  };
  walk(nodes);
  return out;
}

export function CreateFolderModal({
  isOpen,
  onClose,
  initial,
  tree,
  defaultParentId = null,
  forbiddenParentIds = [],
  onSubmit,
}: CreateFolderModalProps) {
  const isEdit = Boolean(initial);
  const [name, setName] = useState('');
  const [color, setColor] = useState<string>(DEFAULT_FOLDER_COLOR);
  const [parentId, setParentId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    if (initial) {
      setName(initial.name);
      setColor(initial.color || DEFAULT_FOLDER_COLOR);
      setParentId(initial.parent_id);
    } else {
      setName('');
      setColor(DEFAULT_FOLDER_COLOR);
      setParentId(defaultParentId);
    }
    setErr(null);
  }, [isOpen, initial, defaultParentId]);

  const flatOptions = flattenForSelect(tree).filter((o) => !forbiddenParentIds.includes(o.id));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setErr('Le nom du dossier est obligatoire');
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      await onSubmit({ name: trimmed, color, parent_id: parentId });
      onClose();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEdit ? 'Modifier le dossier' : 'Nouveau dossier'} size="md">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-1.5">
          <label className="block text-xs font-mono uppercase tracking-wider text-ws-mist">Nom</label>
          <input
            type="text"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex. Particuliers, Pro B2B, 2026, …"
            className="w-full rounded-xl border border-ws-line bg-ws-deep/40 px-3 py-2.5 text-sm text-ws-paper placeholder:text-ws-mist/60 focus:border-ws-accent focus:outline-none"
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-mono uppercase tracking-wider text-ws-mist">Couleur</label>
          <div className="flex flex-wrap gap-2">
            {FOLDER_COLORS.map((c) => {
              const selected = color === c.value;
              return (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setColor(c.value)}
                  className={`w-8 h-8 rounded-lg border-2 transition-all ${
                    selected ? 'border-ws-paper scale-110' : 'border-transparent hover:border-ws-line'
                  }`}
                  style={{ backgroundColor: c.value }}
                  aria-label={c.label}
                  title={c.label}
                />
              );
            })}
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-mono uppercase tracking-wider text-ws-mist">
            Dossier parent <span className="normal-case tracking-normal text-ws-mist/70">(optionnel)</span>
          </label>
          <select
            value={parentId ?? ''}
            onChange={(e) => setParentId(e.target.value || null)}
            className="w-full rounded-xl border border-ws-line bg-ws-deep/40 px-3 py-2.5 text-sm text-ws-paper focus:border-ws-accent focus:outline-none"
          >
            <option value="">— Racine —</option>
            {flatOptions.map((o) => (
              <option key={o.id} value={o.id}>
                {'  '.repeat(o.depth)}
                {o.depth > 0 ? '↳ ' : ''}
                {o.label}
              </option>
            ))}
          </select>
        </div>

        {err && (
          <p className="text-xs text-ws-bear bg-ws-bear-dim/40 border border-red-500/30 rounded-lg px-3 py-2">
            {err}
          </p>
        )}

        <div className="flex gap-2 pt-2">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            className="flex-1 normal-case tracking-normal"
          >
            Annuler
          </Button>
          <Button type="submit" loading={busy} className="flex-1 normal-case tracking-normal">
            {isEdit ? 'Enregistrer' : 'Créer le dossier'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
