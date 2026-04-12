import logoUrl from '../../../img/logo.png';

type MapaLogoProps = {
  className?: string;
  /** Sidebar : logo lisible dans la colonne · header : plus compact */
  variant?: 'sidebar' | 'header';
};

export function MapaLogo({ className = '', variant = 'sidebar' }: MapaLogoProps) {
  const sizeClass =
    variant === 'sidebar'
      ? 'h-10 w-auto max-w-[200px] sm:h-11'
      : 'h-7 w-auto max-w-[140px] sm:h-8';

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
