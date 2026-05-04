import { X } from 'lucide-react';
import type { ClientTag } from '../../lib/types';

interface ClientTagBadgeProps {
  tag: Pick<ClientTag, 'label' | 'color'>;
  onRemove?: () => void;
  size?: 'sm' | 'md';
  className?: string;
}

/**
 * Rendu d'un tag client en badge coloré.
 * - `size="sm"` (défaut) : aligné sur les autres badges (Status, Profession, etc.)
 * - `size="md"` : taille confortable pour le picker / l'édition
 * - `onRemove` : si fourni, affiche un X cliquable pour retirer le tag.
 */
export function ClientTagBadge({ tag, onRemove, size = 'sm', className = '' }: ClientTagBadgeProps) {
  const cls =
    size === 'sm'
      ? 'text-[10px] px-2 py-0.5'
      : 'text-xs px-2.5 py-1';

  /* La couleur du tag pilote bordure + texte ; le fond est dérivé en alpha
     pour rester subtil sur le thème sombre, lisible sans être criard. */
  const style: React.CSSProperties = {
    color: tag.color,
    borderColor: `${tag.color}66`,
    backgroundColor: `${tag.color}1f`,
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded border font-mono font-semibold uppercase tracking-wide max-w-full ${cls} ${className}`}
      style={style}
    >
      <span className="truncate">{tag.label}</span>
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          aria-label={`Retirer le tag ${tag.label}`}
          className="flex-shrink-0 hover:opacity-100 opacity-70 transition-opacity"
        >
          <X size={size === 'sm' ? 10 : 12} />
        </button>
      )}
    </span>
  );
}
