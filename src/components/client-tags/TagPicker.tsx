import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Plus, Search, Tag as TagIcon } from 'lucide-react';
import type { ClientTag } from '../../lib/types';
import { ClientTagBadge } from './ClientTagBadge';

/** Palette de couleurs proposée pour la création rapide d'un tag. */
const TAG_COLORS = [
  '#b8973a', '#d4a574', '#c98a4c',
  '#7a98c2', '#a07ac2', '#c27a7a',
  '#7ac28b', '#e85d5d', '#9aa3ad',
];

interface TagPickerProps {
  /** Tous les tags du référentiel (chargés via useClientTags). */
  allTags: ClientTag[];
  /** IDs des tags actuellement sélectionnés. */
  selectedIds: string[];
  /** Appelé quand la sélection change. */
  onChange: (nextIds: string[]) => void;
  /** Crée un nouveau tag dans le référentiel (et l'ajoute à la sélection). */
  onCreateTag: (
    values: Pick<ClientTag, 'label'> & Partial<Pick<ClientTag, 'color'>>
  ) => Promise<ClientTag>;
  /** Désactive l'édition (lecture seule). */
  disabled?: boolean;
}

/**
 * Multi-select de tags avec création inline et picker de couleur.
 *
 * UX :
 *   - Pastilles des tags sélectionnés (cliquables pour retirer)
 *   - Champ de recherche → filtre les tags existants
 *   - Si aucune correspondance → bouton "Créer le tag « X »" + picker couleur
 *   - Cliquer un tag suggéré → toggle dans la sélection
 */
export function TagPicker({
  allTags,
  selectedIds,
  onChange,
  onCreateTag,
  disabled = false,
}: TagPickerProps) {
  const [query, setQuery] = useState('');
  const [openSuggestions, setOpenSuggestions] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createColor, setCreateColor] = useState(TAG_COLORS[0]);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const tagsById = useMemo(() => new Map(allTags.map((t) => [t.id, t] as const)), [allTags]);
  const selectedTags = useMemo(
    () =>
      selectedIds
        .map((id) => tagsById.get(id))
        .filter((t): t is ClientTag => Boolean(t)),
    [selectedIds, tagsById]
  );

  const q = query.trim().toLowerCase();
  const suggestions = useMemo(() => {
    return allTags
      .filter((t) => !selectedIds.includes(t.id))
      .filter((t) => (q ? t.label.toLowerCase().includes(q) : true))
      .sort((a, b) => a.position - b.position || a.label.localeCompare(b.label, 'fr'));
  }, [allTags, selectedIds, q]);

  /* Détecte un label exact (case-insensitive) dans les tags existants pour
     éviter de proposer "Créer X" si X existe déjà mais n'est pas suggéré
     (parce que déjà sélectionné). */
  const exactMatchExists = useMemo(
    () => q.length > 0 && allTags.some((t) => t.label.toLowerCase() === q),
    [allTags, q]
  );

  const canCreate = q.length > 0 && !exactMatchExists;

  /* Fermer la dropdown quand clic à l'extérieur. */
  useEffect(() => {
    if (!openSuggestions) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpenSuggestions(false);
      }
    };
    setTimeout(() => document.addEventListener('mousedown', handler), 0);
    return () => document.removeEventListener('mousedown', handler);
  }, [openSuggestions]);

  const toggle = (tagId: string) => {
    if (selectedIds.includes(tagId)) {
      onChange(selectedIds.filter((id) => id !== tagId));
    } else {
      onChange([...selectedIds, tagId]);
    }
  };

  const handleCreate = async () => {
    const label = query.trim();
    if (!label) return;
    setCreating(true);
    try {
      const created = await onCreateTag({ label, color: createColor });
      onChange([...selectedIds, created.id]);
      setQuery('');
      setCreateColor(TAG_COLORS[0]);
      // Garde le focus sur l'input pour ajouter d'autres tags rapidement.
      inputRef.current?.focus();
    } finally {
      setCreating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (suggestions.length > 0) {
        toggle(suggestions[0].id);
        setQuery('');
      } else if (canCreate) {
        void handleCreate();
      }
      return;
    }
    if (e.key === 'Backspace' && query === '' && selectedIds.length > 0) {
      // Backspace dans un champ vide → retire le dernier tag sélectionné
      onChange(selectedIds.slice(0, -1));
    }
    if (e.key === 'Escape') {
      setOpenSuggestions(false);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <div
        className={`flex flex-wrap items-center gap-1.5 rounded-xl border border-ws-line bg-ws-deep/40 px-2 py-2 min-h-[44px] ${
          disabled ? 'opacity-60' : 'focus-within:border-ws-accent/50'
        }`}
      >
        {selectedTags.map((tag) => (
          <ClientTagBadge
            key={tag.id}
            tag={tag}
            size="md"
            onRemove={disabled ? undefined : () => toggle(tag.id)}
          />
        ))}
        <input
          ref={inputRef}
          type="text"
          value={query}
          disabled={disabled}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpenSuggestions(true);
          }}
          onFocus={() => setOpenSuggestions(true)}
          onKeyDown={handleKeyDown}
          placeholder={selectedTags.length === 0 ? 'Ajouter un tag…' : ''}
          className="flex-1 min-w-[120px] bg-transparent border-none outline-none text-sm md:text-xs text-ws-paper placeholder:text-ws-mist/60 px-1 py-0.5"
        />
      </div>

      {openSuggestions && !disabled && (
        <div className="absolute left-0 right-0 mt-1.5 z-20 rounded-xl border border-ws-line bg-ws-panel shadow-2xl overflow-hidden">
          {suggestions.length > 0 && (
            <div className="max-h-60 overflow-y-auto py-1">
              {suggestions.slice(0, 12).map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => {
                    toggle(tag.id);
                    setQuery('');
                    inputRef.current?.focus();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-left hover:bg-ws-raised transition-colors"
                >
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: tag.color }}
                    aria-hidden
                  />
                  <span className="flex-1 truncate text-ws-paper">{tag.label}</span>
                  <Check
                    size={12}
                    className={selectedIds.includes(tag.id) ? 'text-ws-accent' : 'invisible'}
                  />
                </button>
              ))}
            </div>
          )}

          {canCreate && (
            <div className={`p-2.5 ${suggestions.length > 0 ? 'border-t border-ws-line/60' : ''}`}>
              <p className="text-[10px] font-mono uppercase tracking-wider text-ws-mist mb-2 px-1">
                Couleur
              </p>
              <div className="flex flex-wrap gap-1.5 mb-2.5 px-1">
                {TAG_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCreateColor(c)}
                    className={`w-6 h-6 rounded-md border-2 transition-all ${
                      createColor === c ? 'border-ws-paper scale-110' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: c }}
                    aria-label={`Couleur ${c}`}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={() => void handleCreate()}
                disabled={creating}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-ws-accent/15 hover:bg-ws-accent/25 text-ws-accent text-xs font-semibold transition-colors disabled:opacity-50"
              >
                <Plus size={12} />
                Créer le tag « {query} »
              </button>
            </div>
          )}

          {suggestions.length === 0 && !canCreate && (
            <div className="px-3 py-4 text-center">
              <TagIcon size={16} className="mx-auto text-ws-mist mb-1.5 opacity-60" />
              <p className="text-[10px] font-mono text-ws-mist">
                {q ? 'Ce tag est déjà ajouté' : 'Tape pour rechercher ou créer un tag'}
              </p>
            </div>
          )}
        </div>
      )}

      <p className="text-[10px] font-mono text-ws-mist/70 mt-1.5 px-1 flex items-center gap-1.5">
        <Search size={10} />
        Tape pour chercher · Entrée pour valider · Backspace pour retirer le dernier
      </p>
    </div>
  );
}
