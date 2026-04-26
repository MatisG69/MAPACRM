import { useRef, useState, type KeyboardEvent } from 'react';
import { X, Mail, AlertCircle } from 'lucide-react';

interface EmailChipsInputProps {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  maxItems?: number;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Vérifie qu'un email est syntaxiquement valide (pas de check DNS / SMTP). */
function isValidEmail(s: string): boolean {
  return EMAIL_RE.test(s.trim());
}

/**
 * Champ de saisie multi-emails au format chip / tag.
 *  - Tape un email + Enter / virgule / Tab → ajoute un chip
 *  - Backspace sur input vide → retire le dernier chip
 *  - Coller plusieurs emails (séparés par , ; ou espace / retour) → tous ajoutés
 *  - X sur chip → retire l'email
 *  - Email invalide affiché en rouge (validation visuelle, pas bloquante)
 */
export function EmailChipsInput({
  value,
  onChange,
  placeholder = 'email@exemple.fr, …',
  maxItems = 50,
}: EmailChipsInputProps) {
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const addEmails = (raw: string) => {
    const candidates = raw
      .split(/[,;\s\n]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (candidates.length === 0) return;
    const existing = new Set(value.map((v) => v.toLowerCase()));
    const next = [...value];
    for (const c of candidates) {
      const lower = c.toLowerCase();
      if (existing.has(lower)) continue;
      if (next.length >= maxItems) break;
      next.push(c);
      existing.add(lower);
    }
    onChange(next);
    setDraft('');
  };

  const removeAt = (idx: number) => {
    const next = value.slice();
    next.splice(idx, 1);
    onChange(next);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',' || e.key === ';' || e.key === 'Tab') {
      if (draft.trim()) {
        e.preventDefault();
        addEmails(draft);
      }
    } else if (e.key === 'Backspace' && draft === '' && value.length > 0) {
      e.preventDefault();
      const next = value.slice(0, -1);
      onChange(next);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData('text');
    if (/[,;\s\n]/.test(pasted)) {
      e.preventDefault();
      addEmails(pasted);
    }
  };

  const handleBlur = () => {
    if (draft.trim()) addEmails(draft);
  };

  return (
    <div
      onClick={() => inputRef.current?.focus()}
      className="w-full min-h-[44px] px-2.5 py-1.5 rounded-xl bg-ws-deep/50 border border-ws-line focus-within:border-ws-accent transition-colors flex flex-wrap items-center gap-1.5 cursor-text"
    >
      {value.map((email, idx) => {
        const valid = isValidEmail(email);
        return (
          <span
            key={`${email}-${idx}`}
            className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-mono border ${
              valid
                ? 'bg-ws-accent/12 text-ws-accent-soft border-ws-accent/25'
                : 'bg-red-500/12 text-red-300 border-red-500/30'
            }`}
            title={valid ? email : `Email invalide : ${email}`}
          >
            {valid ? <Mail size={10} /> : <AlertCircle size={10} />}
            <span className="truncate max-w-[220px]">{email}</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeAt(idx);
              }}
              className="hover:text-ws-paper transition-colors"
              aria-label={`Retirer ${email}`}
              tabIndex={-1}
            >
              <X size={10} />
            </button>
          </span>
        );
      })}
      <input
        ref={inputRef}
        type="email"
        autoComplete="off"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        onBlur={handleBlur}
        placeholder={value.length === 0 ? placeholder : ''}
        className="flex-1 min-w-[140px] bg-transparent border-none outline-none text-sm text-ws-paper placeholder:text-ws-mist/50 px-1 py-0.5"
      />
    </div>
  );
}
