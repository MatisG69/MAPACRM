import { useEffect, useState } from 'react';
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
 * Barre flottante d'actions groupées affichée en haut de la page (sous le Header)
 * dès qu'au moins un item est sélectionné. Apparaît avec une animation slide-down,
 * reste visible au scroll, et se masque seamlessly quand la sélection est vidée.
 *
 * Échappement clavier (Escape) → vide la sélection.
 */
export function BulkActionBar({ count, itemLabel, children, onClear }: BulkActionBarProps) {
  /* Pour permettre l'animation de sortie, on conserve la dernière valeur de count
     pendant la transition de fermeture (sinon l'élément disparaît instantanément
     dès que count repasse à 0). */
  const [visible, setVisible] = useState(count > 0);
  const [displayCount, setDisplayCount] = useState(count);

  useEffect(() => {
    if (count > 0) {
      setDisplayCount(count);
      setVisible(true);
    } else {
      setVisible(false);
    }
  }, [count]);

  useEffect(() => {
    if (count === 0) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClear();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [count, onClear]);

  if (count === 0 && !visible) return null;
  const plural = displayCount > 1 ? 's' : '';

  return (
    <div
      role="region"
      aria-label="Actions groupées"
      aria-live="polite"
      /*
        Positionnement :
          • mobile : 76 px du haut (≈ hauteur Header mobile + safe-area)
          • desktop : 96 px du haut (≈ hauteur Header desktop)
          • z-30 : au-dessus du contenu mais sous les modals (z-50)
        Animation d'entrée/sortie via opacity + translate.
      */
      /* Position calée juste sous le Header (qui est sticky top-0).
           Header ≈ 76 px mobile / 104 px desktop. + safe-area iOS pour notch / dynamic island.
         Animation d'entrée/sortie via opacity + translate. */
      className={`fixed left-1/2 -translate-x-1/2 z-30 top-[calc(76px+env(safe-area-inset-top,0px))] md:top-[calc(104px+env(safe-area-inset-top,0px))] max-md:left-3 max-md:right-3 max-md:translate-x-0 transition-all duration-200 ease-out ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-3 pointer-events-none'
      }`}
    >
      <div
        className="flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-2 rounded-2xl border border-ws-accent/35 bg-ws-panel/95 backdrop-blur-xl shadow-2xl shadow-black/60"
        style={{ boxShadow: '0 12px 40px -8px rgba(175, 112, 55, 0.35), 0 0 0 1px rgba(212, 165, 116, 0.08)' }}
      >
        <button
          type="button"
          onClick={onClear}
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-ws-mist hover:text-ws-paper hover:bg-white/5 transition-colors"
          aria-label="Désélectionner tout (Échap)"
          title="Désélectionner tout (Échap)"
        >
          <X size={16} />
        </button>

        <div className="flex items-center gap-2 px-1.5 min-w-0">
          <span className="flex h-7 min-w-[28px] items-center justify-center rounded-lg bg-ws-accent/15 px-2 font-mono text-sm font-semibold tabular-nums text-ws-accent">
            {displayCount}
          </span>
          <span className="text-xs sm:text-sm text-ws-paper whitespace-nowrap font-medium">
            {itemLabel}
            {plural} <span className="text-ws-mist font-normal">sélectionné{plural}</span>
          </span>
        </div>

        <div className="h-6 w-px bg-ws-line/80 flex-shrink-0" />

        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto scrollbar-ws max-md:-mr-1 max-md:pr-1">
          {children}
        </div>
      </div>
    </div>
  );
}
