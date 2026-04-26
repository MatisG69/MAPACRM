import { useCallback, useEffect, useMemo, useState } from 'react';

/**
 * Gestion d'une sélection multiple de lignes (ids string).
 *
 * Utilisé sur les pages liste (factures, devis, relances, …) pour activer
 * des actions groupées : suppression, marquage, export, etc.
 *
 * Pas dépendant du type métier — accepte une liste générique d'ids présents
 * dans la vue (utile pour le « tout sélectionner » sur le filtré, et pour
 * purger automatiquement les ids qui sortent de la vue).
 */
export interface BulkSelection {
  /** Set des ids sélectionnés */
  selected: Set<string>;
  /** Nb d'ids sélectionnés ET présents dans la vue courante */
  count: number;
  /** True si tous les ids visibles sont sélectionnés (et qu'il y en a au moins 1) */
  allSelected: boolean;
  /** True si au moins un id de la vue est sélectionné mais pas tous */
  someSelected: boolean;
  /** Vrai si l'id est dans la sélection */
  has: (id: string) => boolean;
  /** Bascule un id (ajoute s'il n'y est pas, retire sinon) */
  toggle: (id: string) => void;
  /** Bascule la sélection globale (tout / rien) sur la vue courante */
  toggleAll: () => void;
  /** Force la sélection à un set précis */
  set: (ids: string[]) => void;
  /** Vide la sélection */
  clear: () => void;
  /** Liste ordonnée des ids sélectionnés présents dans la vue courante */
  selectedIds: string[];
}

export function useBulkSelection(visibleIds: readonly string[]): BulkSelection {
  const [selected, setSelected] = useState<Set<string>>(() => new Set());

  const visibleSet = useMemo(() => new Set(visibleIds), [visibleIds]);

  const selectedIds = useMemo(
    () => visibleIds.filter((id) => selected.has(id)),
    [visibleIds, selected]
  );

  const count = selectedIds.length;
  const allSelected = visibleIds.length > 0 && count === visibleIds.length;
  const someSelected = count > 0 && count < visibleIds.length;

  const has = useCallback((id: string) => selected.has(id), [selected]);

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    setSelected((prev) => {
      // Considère uniquement la vue courante pour la bascule
      const inViewCount = visibleIds.reduce((acc, id) => (prev.has(id) ? acc + 1 : acc), 0);
      const allCurrentlySelected = inViewCount === visibleIds.length && visibleIds.length > 0;
      if (allCurrentlySelected) {
        const next = new Set(prev);
        for (const id of visibleIds) next.delete(id);
        return next;
      }
      const next = new Set(prev);
      for (const id of visibleIds) next.add(id);
      return next;
    });
  }, [visibleIds]);

  const set = useCallback((ids: string[]) => {
    setSelected(new Set(ids));
  }, []);

  const clear = useCallback(() => setSelected(new Set()), []);

  // Purge en effet de bord les ids qui ont quitté la vue (suppression DB,
  // changement de filtre, etc.). Pas critique pour le rendu (selectedIds
  // dérive déjà de visibleIds), mais évite d'accumuler des ids morts.
  useEffect(() => {
    setSelected((prev) => {
      let dirty = false;
      const next = new Set<string>();
      for (const id of prev) {
        if (visibleSet.has(id)) next.add(id);
        else dirty = true;
      }
      return dirty ? next : prev;
    });
  }, [visibleSet]);

  return {
    selected,
    count,
    allSelected,
    someSelected,
    has,
    toggle,
    toggleAll,
    set,
    clear,
    selectedIds,
  };
}
