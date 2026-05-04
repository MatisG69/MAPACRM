import type { Folder } from '../../lib/types';

interface FolderBadgeProps {
  folder: Folder | null | undefined;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  className?: string;
}

/**
 * Petit badge compact affichant le dossier d'un devis/facture.
 * Cliquable si onClick fourni (typiquement : ouvrir le menu "Déplacer vers...").
 */
export function FolderBadge({ folder, onClick, className = '' }: FolderBadgeProps) {
  const interactive = Boolean(onClick);
  const baseCls =
    'inline-flex items-center gap-1.5 max-w-[160px] rounded-md px-2 py-0.5 text-[10px] font-mono border transition-colors';
  const stateCls = folder
    ? 'border-ws-line/70 bg-ws-panel/60 text-ws-paper'
    : 'border-ws-line/50 bg-ws-deep/30 text-ws-mist italic';
  const hoverCls = interactive ? 'hover:border-ws-accent/40 hover:bg-ws-raised cursor-pointer' : '';

  const content = (
    <>
      <span
        aria-hidden
        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{ backgroundColor: folder?.color ?? '#666' }}
      />
      <span className="truncate">{folder?.name ?? 'Sans dossier'}</span>
    </>
  );

  if (interactive) {
    return (
      <button type="button" onClick={onClick} className={`${baseCls} ${stateCls} ${hoverCls} ${className}`}>
        {content}
      </button>
    );
  }
  return <span className={`${baseCls} ${stateCls} ${className}`}>{content}</span>;
}
