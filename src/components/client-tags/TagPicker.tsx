import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Plus, X } from 'lucide-react';
import type { ClientTag } from '../../lib/types';

/** Palette de couleurs proposée pour la création rapide d'un tag. */
const TAG_COLORS = [
  '#b8973a', '#d4a574', '#c98a4c',
  '#7a98c2', '#a07ac2', '#c27a7a',
  '#7ac28b', '#e85d5d', '#9aa3ad',
];

interface TagPickerProps {
  /** Tous les tags du référentiel. */
  allTags: ClientTag[];
  /** IDs des tags actuellement sélectionnés. */
  selectedIds: string[];
  /** Appelé quand la sélection change. */
  onChange: (nextIds: string[]) => void;
  /** Crée un nouveau tag dans le référentiel (et l'ajoute à la sélection). */
  onCreateTag: (
    values: Pick<ClientTag, 'label'> & Partial<Pick<ClientTag, 'color'>>
  ) => Promise<ClientTag>;
  /** Désactive l'édition. */
  disabled?: boolean;
}

/**
 * Sélecteur de tags en mode « cloud » : tous les tags du référentiel sont
 * affichés en pastilles cliquables. Click = toggle (ajoute / retire).
 *
 * Avantages vs autocompletion pure :
 *   - Découverte immédiate de tous les tags disponibles
 *   - 0 frappe pour assigner un tag déjà créé
 *   - Création inline d'un nouveau tag via bouton dédié (pas de mode caché)
 */
export function TagPicker({
  allTags,
  selectedIds,
  onChange,
  onCreateTag,
  disabled = false,
}: TagPickerProps) {
  const [creating, setCreating] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newColor, setNewColor] = useState(TAG_COLORS[0]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  /* Tri stable : par position du référentiel puis label, indépendant de l'ordre
     dans `selectedIds` (une fois sélectionné, le tag ne saute pas en début). */
  const sortedTags = useMemo(
    () =>
      [...allTags].sort(
        (a, b) => a.position - b.position || a.label.localeCompare(b.label, 'fr')
      ),
    [allTags]
  );

  useEffect(() => {
    if (creating) {
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [creating]);

  const toggle = (tagId: string) => {
    if (disabled) return;
    if (selectedIds.includes(tagId)) {
      onChange(selectedIds.filter((id) => id !== tagId));
    } else {
      onChange([...selectedIds, tagId]);
    }
  };

  const handleCreate = async () => {
    const label = newLabel.trim();
    if (!label) return;
    setBusy(true);
    setErr(null);
    try {
      const created = await onCreateTag({ label, color: newColor });
      onChange([...selectedIds, created.id]);
      setNewLabel('');
      setNewColor(TAG_COLORS[0]);
      setCreating(false);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const cancelCreate = () => {
    setCreating(false);
    setNewLabel('');
    setNewColor(TAG_COLORS[0]);
    setErr(null);
  };

  return (
    <div className="space-y-2.5">
      {sortedTags.length === 0 && !creating ? (
        <div className="rounded-xl border border-dashed border-ws-line/70 bg-ws-deep/30 px-4 py-5 text-center">
          <p className="text-xs text-ws-mist mb-3 font-mono">
            Aucun tag défini pour l'instant
          </p>
          <button
            type="button"
            onClick={() => setCreating(true)}
            disabled={disabled}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-ws-accent/15 hover:bg-ws-accent/25 text-ws-accent text-xs font-semibold transition-colors disabled:opacity-50"
          >
            <Plus size={12} />
            Créer le premier tag
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {sortedTags.map((tag) => {
            const selected = selectedIds.includes(tag.id);
            /* Selected : chip plein (bg + border + text en couleur du tag).
               Unselected : chip outline (juste border + text grisé) — discret. */
            const baseCls =
              'inline-flex items-center gap-1.5 rounded-md border text-[11px] font-mono font-semibold uppercase tracking-wide px-2.5 py-1 transition-all touch-manipulation';
            const selectedStyle: React.CSSProperties = {
              color: tag.color,
              borderColor: `${tag.color}80`,
              backgroundColor: `${tag.color}24`,
            };
            const unselectedStyle: React.CSSProperties = {
              color: '#7d6f62',
              borderColor: '#2e2620',
              backgroundColor: 'transparent',
            };
            return (
              <button
                key={tag.id}
                type="button"
                disabled={disabled}
                onClick={() => toggle(tag.id)}
                className={`${baseCls} ${
                  selected
                    ? 'shadow-glow-sm'
                    : 'hover:opacity-100 hover:scale-[1.02]'
                } ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                style={selected ? selectedStyle : unselectedStyle}
                aria-pressed={selected}
              >
                <span
                  aria-hidden
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: tag.color }}
                />
                <span className="truncate max-w-[160px]">{tag.label}</span>
                {selected && <Check size={11} className="flex-shrink-0" />}
              </button>
            );
          })}
          {!creating && (
            <button
              type="button"
              onClick={() => setCreating(true)}
              disabled={disabled}
              className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-ws-line text-[11px] font-mono font-semibold uppercase tracking-wide px-2.5 py-1 text-ws-mist hover:text-ws-accent hover:border-ws-accent/40 transition-colors touch-manipulation disabled:opacity-50"
            >
              <Plus size={12} />
              Nouveau
            </button>
          )}
        </div>
      )}

      {creating && (
        <div className="rounded-xl border border-ws-accent/30 bg-ws-accent/5 p-3 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] font-mono uppercase tracking-wider text-ws-accent">
              Nouveau tag
            </p>
            <button
              type="button"
              onClick={cancelCreate}
              className="w-6 h-6 flex items-center justify-center rounded-md text-ws-mist hover:text-ws-paper hover:bg-white/5 transition-colors"
              aria-label="Annuler"
            >
              <X size={12} />
            </button>
          </div>

          <input
            ref={inputRef}
            type="text"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void handleCreate();
              }
              if (e.key === 'Escape') cancelCreate();
            }}
            placeholder="Nom du tag (ex. Décideur, Urgent…)"
            className="w-full px-3 py-2 rounded-lg bg-ws-deep/60 border border-ws-line text-sm md:text-xs text-ws-paper placeholder:text-ws-mist/60 focus:border-ws-accent focus:outline-none"
          />

          <div>
            <p className="text-[10px] font-mono uppercase tracking-wider text-ws-mist mb-1.5">
              Couleur
            </p>
            <div className="flex flex-wrap gap-1.5">
              {TAG_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setNewColor(c)}
                  className={`w-7 h-7 rounded-md border-2 transition-all ${
                    newColor === c ? 'border-ws-paper scale-110' : 'border-transparent hover:border-ws-line'
                  }`}
                  style={{ backgroundColor: c }}
                  aria-label={`Couleur ${c}`}
                />
              ))}
            </div>
          </div>

          {err && (
            <p className="text-xs text-ws-bear bg-ws-bear-dim/40 border border-red-500/30 rounded-lg px-3 py-2">
              {err}
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={cancelCreate}
              disabled={busy}
              className="flex-1 px-3 py-2 rounded-lg border border-ws-line text-xs text-ws-paper hover:bg-ws-raised transition-colors"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={() => void handleCreate()}
              disabled={busy || !newLabel.trim()}
              className="flex-1 px-3 py-2 rounded-lg bg-ws-accent/15 hover:bg-ws-accent/25 border border-ws-accent/40 text-xs font-semibold text-ws-accent transition-colors disabled:opacity-50"
            >
              {busy ? 'Création…' : 'Créer le tag'}
            </button>
          </div>
        </div>
      )}

      <p className="text-[10px] font-mono text-ws-mist/70 px-1">
        Clique pour ajouter / retirer · « Nouveau » pour créer un tag personnalisé
      </p>
    </div>
  );
}
