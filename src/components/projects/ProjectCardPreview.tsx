import { useEffect, useState } from 'react';
import { ExternalLink, Globe, ImageOff, Loader2 } from 'lucide-react';
import { resolveSitePreviewImage, normalizeSiteUrl, siteHostname } from '../../lib/sitePreview';

interface ProjectCardPreviewProps {
  siteUrl: string | null | undefined;
  projectName: string;
  className?: string;
  /** `hero` : grande bannière fiche projet + lien externe */
  layout?: 'card' | 'hero';
}

/**
 * Bandeau visuel : image Open Graph / capture Microlink, avec états chargement et repli élégant.
 */
export function ProjectCardPreview({
  siteUrl,
  projectName,
  className = '',
  layout = 'card',
}: ProjectCardPreviewProps) {
  const normalized = normalizeSiteUrl(siteUrl || undefined);
  const [phase, setPhase] = useState<'idle' | 'loading' | 'ready' | 'empty' | 'error'>(
    normalized ? 'loading' : 'empty'
  );
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!normalized) {
      setPhase('empty');
      setSrc(null);
      return;
    }
    let cancelled = false;
    setPhase('loading');
    setSrc(null);
    resolveSitePreviewImage(normalized).then((url) => {
      if (cancelled) return;
      if (url) {
        setSrc(url);
      } else {
        setPhase('error');
      }
    });
    return () => {
      cancelled = true;
    };
  }, [normalized]);

  const host = normalized ? siteHostname(normalized) : null;

  return (
    <div
      className={`relative w-full overflow-hidden ${
        layout === 'card' ? 'rounded-t-2xl border-b border-ws-line/60' : 'rounded-2xl border border-ws-line/50'
      } bg-ws-raised ${className}`}
    >
      <div
        className={`relative ${layout === 'hero' ? 'aspect-video min-h-[200px] sm:min-h-[260px]' : 'aspect-[21/10] sm:aspect-[2/1]'}`}
      >
        <div
          className="absolute inset-0 bg-gradient-to-br from-ws-surface via-ws-panel to-ws-deep"
          aria-hidden
        />
        <div
          className="absolute inset-0 opacity-[0.07] bg-[radial-gradient(ellipse_at_30%_0%,rgba(201,138,76,0.9),transparent_55%),radial-gradient(ellipse_at_100%_100%,rgba(139,87,42,0.5),transparent_45%)]"
          aria-hidden
        />

        {phase === 'loading' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-ws-mist z-[1]">
            <Loader2 className="h-7 w-7 animate-spin text-ws-accent-soft/80" strokeWidth={1.75} />
            <span className="font-mono text-[10px] uppercase tracking-[0.2em]">Aperçu du site…</span>
          </div>
        )}

        {src && (
          <img
            src={src}
            alt={`Aperçu visuel — ${projectName}`}
            referrerPolicy="no-referrer"
            className={`absolute inset-0 h-full w-full object-cover object-top transition-opacity duration-700 ${
              phase === 'ready' ? 'opacity-100' : 'opacity-0'
            }`}
            onError={() => {
              setSrc(null);
              setPhase('error');
            }}
            onLoad={() => setPhase('ready')}
          />
        )}

        {(phase === 'empty' || phase === 'error') && !src && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-4 text-center z-[1]">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-ws-lineStrong/80 bg-black/25 text-ws-mist">
              {phase === 'error' ? <ImageOff size={22} strokeWidth={1.5} /> : <Globe size={22} strokeWidth={1.5} />}
            </div>
            <p className="text-[11px] font-medium text-ws-ink max-w-[15rem] leading-snug">
              {phase === 'error'
                ? 'Image non disponible (og:image ou capture)'
                : 'Indiquez l’URL du site pour un aperçu automatique'}
            </p>
            {host && (
              <p className="font-mono text-[10px] text-ws-accent-soft/90 truncate max-w-[90%]">{host}</p>
            )}
          </div>
        )}

        {phase === 'ready' && src && (
          <div
            className="absolute inset-x-0 bottom-0 h-[55%] bg-gradient-to-t from-black/80 via-black/30 to-transparent pointer-events-none"
            aria-hidden
          />
        )}

        {layout === 'hero' && normalized && (
          <a
            href={normalized}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute top-3 right-3 z-[3] inline-flex items-center gap-1.5 rounded-xl border border-white/20 bg-black/45 px-3 py-1.5 text-[11px] font-medium text-ws-cream backdrop-blur-md transition-colors hover:bg-black/55 hover:border-ws-accent/35"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink size={14} strokeWidth={2} />
            Ouvrir
          </a>
        )}

        {normalized && (phase === 'ready' || phase === 'error') && host && (
          <div
            className={`absolute bottom-2.5 left-3 right-3 sm:bottom-3 sm:left-4 sm:right-4 flex items-center justify-between gap-2 z-[2] ${
              layout === 'hero' ? 'pr-24' : ''
            }`}
          >
            <span className="font-mono text-[10px] sm:text-[11px] text-ws-cream/95 truncate max-w-[75%] drop-shadow-md">
              {host}
            </span>
            <span className="flex-shrink-0 rounded-md border border-white/25 bg-black/40 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.15em] text-ws-cream/90 backdrop-blur-sm">
              Site
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
