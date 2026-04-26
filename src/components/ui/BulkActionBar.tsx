import { X } from 'lucide-react';
import type { ReactNode } from 'react';

interface BulkActionBarProps {
  count: number;
  /** Libellé au singulier — ex. "facture", le « s » est ajouté auto si count > 1 */
  itemLabel: string;
  /** Boutons d'action passés en children (groupés à droite) */
  children: ReactNode;
  onClear: () => void;
}

/**
 * Barre flottante d'actions groupées affichée en bas de page quand au moins
 * un item est sélectionné. Affiche le compteur, les actions disponibles, et
 * un bouton X pour vider la sélection.
 */
export function BulkActionBar({ count, itemLabel, children, onClear }: BulkActionBarProps) {
  if (count === 0) return null;
  const plural = count > 1 ? 's' : '';
  return (
    <div
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-4 py-2.5 rounded-2xl border border-ws-line bg-ws-panel/95 backdrop-blur-xl shadow-glow"
      role="region"
      aria-label="Actions groupées"
    >
      <button
        type="button"
        onClick={onClear}
        className="flex h-8 w-8 items-center justify-center rounded-xl text-ws-mist hover:text-ws-paper hover:bg-white/5 transition-colors"
        aria-label="Désélectionner tout"
        title="Désélectionner tout (Échap)"
      >
        <X size={16} />
      </button>
      <div className="text-sm">
        <span className="font-mono text-ws-accent font-semibold">{count}</span>{' '}
        <span className="text-ws-paper">
          {itemLabel}
          {plural} sélectionné{plural}
        </span>
      </div>
      <div className="h-5 w-px bg-ws-line" />
      <div className="flex items-center gap-2">{children}</div>
    </div>
  );
}
