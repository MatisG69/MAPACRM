import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase, isSupabaseEnabled } from '../lib/supabase';
import * as local from '../lib/localCrm';
import type { Folder, FolderNode } from '../lib/types';

/**
 * Construit l'arborescence des dossiers à partir de la liste plate.
 * Tri : par `position` puis par `name` à profondeur égale.
 */
function buildTree(folders: Folder[]): FolderNode[] {
  const byId = new Map<string, FolderNode>();
  for (const f of folders) {
    byId.set(f.id, { ...f, children: [], depth: 0 });
  }
  const roots: FolderNode[] = [];
  for (const node of byId.values()) {
    if (node.parent_id && byId.has(node.parent_id)) {
      const parent = byId.get(node.parent_id)!;
      parent.children.push(node);
      node.depth = parent.depth + 1;
    } else {
      roots.push(node);
    }
  }
  const sortRec = (nodes: FolderNode[]) => {
    nodes.sort((a, b) => a.position - b.position || a.name.localeCompare(b.name, 'fr'));
    for (const n of nodes) {
      if (n.children.length) {
        sortRec(n.children);
        for (const c of n.children) c.depth = n.depth + 1;
      }
    }
  };
  sortRec(roots);
  return roots;
}

/**
 * Renvoie tous les descendants d'un dossier (utile pour les compteurs cumulés).
 */
export function getDescendantIds(folders: Folder[], rootId: string): string[] {
  const childMap = new Map<string | null, string[]>();
  for (const f of folders) {
    const list = childMap.get(f.parent_id) ?? [];
    list.push(f.id);
    childMap.set(f.parent_id, list);
  }
  const result: string[] = [];
  const stack = [rootId];
  while (stack.length) {
    const id = stack.pop()!;
    result.push(id);
    for (const child of childMap.get(id) ?? []) stack.push(child);
  }
  return result;
}

/**
 * Renvoie le chemin (breadcrumbs) du dossier racine au dossier ciblé.
 */
export function getFolderPath(folders: Folder[], folderId: string | null): Folder[] {
  if (!folderId) return [];
  const byId = new Map(folders.map((f) => [f.id, f] as const));
  const path: Folder[] = [];
  let current: string | null = folderId;
  const seen = new Set<string>();
  while (current && !seen.has(current)) {
    seen.add(current);
    const f = byId.get(current);
    if (!f) break;
    path.unshift(f);
    current = f.parent_id;
  }
  return path;
}

/**
 * Vérifie qu'un déplacement parent est légal (pas de cycle).
 * Renvoie true si `nodeId` peut prendre `newParentId` comme parent.
 */
export function canMoveFolder(folders: Folder[], nodeId: string, newParentId: string | null): boolean {
  if (newParentId === null) return true;
  if (newParentId === nodeId) return false;
  const descendants = new Set(getDescendantIds(folders, nodeId));
  return !descendants.has(newParentId);
}

export function useFolders() {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFolders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (isSupabaseEnabled() && supabase) {
        const { data, error: err } = await supabase
          .from('folders')
          .select('*')
          .order('position', { ascending: true })
          .order('name', { ascending: true });
        if (err) throw err;
        setFolders((data || []) as Folder[]);
      } else {
        setFolders(local.localListFolders());
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFolders();
  }, [fetchFolders]);

  const createFolder = async (
    values: Pick<Folder, 'name'> & Partial<Pick<Folder, 'parent_id' | 'color' | 'position'>>
  ): Promise<Folder> => {
    const payload = {
      name: values.name.trim(),
      parent_id: values.parent_id ?? null,
      color: values.color ?? '#b8973a',
      position: values.position ?? 0,
    };
    if (isSupabaseEnabled() && supabase) {
      const { data, error: err } = await supabase.from('folders').insert([payload]).select('*').single();
      if (err) throw err;
      const row = data as Folder;
      setFolders((prev) => [...prev, row]);
      return row;
    }
    const row = local.localCreateFolder(payload);
    setFolders((prev) => [...prev, row]);
    return row;
  };

  const updateFolder = async (id: string, values: Partial<Folder>): Promise<Folder> => {
    if (values.parent_id !== undefined && !canMoveFolder(folders, id, values.parent_id)) {
      throw new Error('Déplacement impossible : créerait un cycle');
    }
    if (isSupabaseEnabled() && supabase) {
      const { data, error: err } = await supabase
        .from('folders')
        .update(values)
        .eq('id', id)
        .select('*')
        .single();
      if (err) throw err;
      const row = data as Folder;
      setFolders((prev) => prev.map((f) => (f.id === id ? row : f)));
      return row;
    }
    const row = local.localUpdateFolder(id, values);
    setFolders((prev) => prev.map((f) => (f.id === id ? row : f)));
    return row;
  };

  const deleteFolder = async (id: string): Promise<void> => {
    if (isSupabaseEnabled() && supabase) {
      const { error: err } = await supabase.from('folders').delete().eq('id', id);
      if (err) throw err;
    } else {
      local.localDeleteFolder(id);
    }
    // Cascade côté client : retirer ce dossier ET ses descendants de la liste
    const toRemove = new Set(getDescendantIds(folders, id));
    setFolders((prev) => prev.filter((f) => !toRemove.has(f.id)));
  };

  const tree = useMemo(() => buildTree(folders), [folders]);

  return {
    folders,
    tree,
    loading,
    error,
    refetch: fetchFolders,
    createFolder,
    updateFolder,
    deleteFolder,
  };
}
