import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { MapPin, Loader2, X } from 'lucide-react';

/**
 * Champ de saisie d'adresse avec autocomplétion via l'API Adresse de
 * data.gouv.fr (Base Adresse Nationale française).
 *
 * - Gratuit, sans clé API, CORS ouvert
 * - Debounce 250 ms
 * - Navigation clavier (↑ ↓ Enter Esc)
 * - L'utilisateur peut quand même taper librement (lieu non-adresse, lien
 *   Zoom, nom de salle…) — l'autocomplete ne force rien.
 */

interface AddressSuggestion {
  label: string; // ex. "12 Rue de la Paix 75002 Paris"
  city: string;
  postcode: string;
  context: string;
}

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  inputClassName?: string;
  /** Type de recherche : 'address' (par défaut) ou 'street' (rue uniquement) */
  searchType?: 'address' | 'street';
}

const BAN_ENDPOINT = 'https://api-adresse.data.gouv.fr/search/';
const DEBOUNCE_MS = 250;
const MIN_CHARS = 3;

interface BanFeature {
  properties: {
    label: string;
    city?: string;
    postcode?: string;
    context?: string;
  };
}

export function AddressAutocomplete({
  value,
  onChange,
  placeholder = 'Adresse, lien Zoom, …',
  inputClassName,
  searchType = 'address',
}: AddressAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [highlightedIdx, setHighlightedIdx] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<number | null>(null);

  // Recherche debouncée
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!value || value.trim().length < MIN_CHARS) {
      setSuggestions([]);
      setLoading(false);
      return;
    }
    debounceRef.current = window.setTimeout(async () => {
      // Annuler requête précédente si elle traîne
      if (abortRef.current) abortRef.current.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      setLoading(true);
      try {
        const params = new URLSearchParams({
          q: value.trim(),
          limit: '6',
          autocomplete: '1',
        });
        if (searchType === 'street') params.set('type', 'street');
        const res = await fetch(`${BAN_ENDPOINT}?${params.toString()}`, { signal: ctrl.signal });
        if (!res.ok) throw new Error(`BAN ${res.status}`);
        const data = (await res.json()) as { features: BanFeature[] };
        const list = (data.features ?? []).map((f): AddressSuggestion => ({
          label: f.properties.label,
          city: f.properties.city || '',
          postcode: f.properties.postcode || '',
          context: f.properties.context || '',
        }));
        setSuggestions(list);
        setOpen(list.length > 0);
        setHighlightedIdx(-1);
      } catch (e) {
        if ((e as Error).name !== 'AbortError') {
          // Réseau / API down → fallback silencieux : pas de suggestions
          setSuggestions([]);
          setOpen(false);
        }
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value, searchType]);

  // Fermer le dropdown au clic extérieur
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const selectSuggestion = (s: AddressSuggestion) => {
    onChange(s.label);
    setOpen(false);
    setSuggestions([]);
    setHighlightedIdx(-1);
    // Garde le focus sur l'input pour permettre de continuer à éditer
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!open || suggestions.length === 0) {
      if (e.key === 'ArrowDown' && suggestions.length > 0) {
        setOpen(true);
        setHighlightedIdx(0);
        e.preventDefault();
      }
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIdx((i) => (i + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIdx((i) => (i - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === 'Enter') {
      if (highlightedIdx >= 0 && highlightedIdx < suggestions.length) {
        e.preventDefault();
        selectSuggestion(suggestions[highlightedIdx]);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
      setHighlightedIdx(-1);
    }
  };

  const clearValue = () => {
    onChange('');
    setSuggestions([]);
    setOpen(false);
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <MapPin
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-ws-mist pointer-events-none"
        />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          spellCheck={false}
          className={
            inputClassName ??
            'w-full pl-9 pr-9 py-2.5 rounded-xl bg-ws-deep/50 border border-ws-line text-ws-paper focus:outline-none focus:border-ws-accent placeholder:text-ws-mist/50 text-sm'
          }
        />
        {loading ? (
          <Loader2
            size={14}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-ws-mist animate-spin"
          />
        ) : value ? (
          <button
            type="button"
            onClick={clearValue}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-ws-mist hover:text-ws-paper hover:bg-white/5 transition-colors"
            aria-label="Effacer"
            tabIndex={-1}
          >
            <X size={14} />
          </button>
        ) : null}
      </div>

      {open && suggestions.length > 0 && (
        <div
          className="absolute z-50 left-0 right-0 mt-1 rounded-xl border border-ws-line bg-ws-panel/95 backdrop-blur-xl shadow-glow overflow-hidden max-h-72 overflow-y-auto"
          role="listbox"
        >
          {suggestions.map((s, i) => (
            <button
              key={`${s.label}-${i}`}
              type="button"
              role="option"
              aria-selected={i === highlightedIdx}
              onMouseDown={(e) => {
                // mousedown plutôt que click pour éviter que le blur ferme avant
                e.preventDefault();
                selectSuggestion(s);
              }}
              onMouseEnter={() => setHighlightedIdx(i)}
              className={`w-full text-left px-3 py-2.5 flex items-start gap-2.5 transition-colors border-b border-ws-line/40 last:border-b-0 ${
                i === highlightedIdx
                  ? 'bg-ws-accent/15 text-ws-paper'
                  : 'text-ws-ink hover:bg-ws-raised/40'
              }`}
            >
              <MapPin
                size={12}
                className={`mt-1 flex-shrink-0 ${
                  i === highlightedIdx ? 'text-ws-accent' : 'text-ws-mist'
                }`}
              />
              <div className="min-w-0 flex-1">
                <div className="text-sm truncate">{s.label}</div>
                {s.context && (
                  <div className="text-[10px] font-mono text-ws-mist/80 mt-0.5 truncate">
                    {s.context}
                  </div>
                )}
              </div>
            </button>
          ))}
          <div className="px-3 py-1.5 text-[9px] font-mono uppercase tracking-[0.2em] text-ws-mist/60 bg-ws-deep/30 border-t border-ws-line/40">
            Source : Base Adresse Nationale (data.gouv.fr)
          </div>
        </div>
      )}
    </div>
  );
}
