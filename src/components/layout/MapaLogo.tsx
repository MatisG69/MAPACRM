import logoUrl from '../../../img/logo.png';

type MapaLogoProps = {
  className?: string;
  /**
   * sidebarInline — à côté du texte MAPACRM (comme l’ancien carré « M »)
   * header — bandeau mobile
   */
  variant?: 'sidebarInline' | 'header';
};

export function MapaLogo({ className = '', variant = 'sidebarInline' }: MapaLogoProps) {
  const sizeClass =
    variant === 'sidebarInline'
      ? 'h-11 w-auto max-w-[5.25rem] shrink-0'
      : 'h-8 w-auto max-w-[5rem] sm:h-9 sm:max-w-[5.5rem] shrink-0';

  return (
    <img
      src={logoUrl}
      alt="MAPA Développement"
      width={200}
      height={48}
      decoding="async"
      className={`block object-contain object-left ${sizeClass} ${className}`}
    />
  );
}
