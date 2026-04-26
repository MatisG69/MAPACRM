export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);
}

export function formatDate(date: string | null): string {
  if (!date) return '—';
  return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(date));
}

export function formatDateTime(date: string | null): string {
  if (!date) return '—';
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

export function formatRelativeDate(date: string): string {
  const now = new Date();
  const d = new Date(date);
  const diff = now.getTime() - d.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor(diff / (1000 * 60));

  if (minutes < 1) return "À l'instant";
  if (minutes < 60) return `Il y a ${minutes} min`;
  if (hours < 24) return `Il y a ${hours}h`;
  if (days === 1) return 'Hier';
  if (days < 7) return `Il y a ${days} jours`;
  return formatDate(date);
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function isOverdue(date: string | null): boolean {
  if (!date) return false;
  return new Date(date) < new Date();
}

export function daysUntil(date: string | null): number | null {
  if (!date) return null;
  const diff = new Date(date).getTime() - new Date().getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export const AVATAR_COLORS = [
  '#2563EB', '#059669', '#DC2626', '#D97706', '#7C3AED',
  '#DB2777', '#0891B2', '#65A30D', '#EA580C', '#4F46E5',
];

export function getRandomColor(): string {
  return AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
}

/**
 * Numérotation chronologique stricte des factures (article 242 nonies A CGI).
 * Format : FAC-YYYY-NNN où NNN est le n° séquentiel sur l'année en cours.
 *
 * @param existing liste des numéros de facture déjà émis (pour calculer le suivant)
 * @returns le prochain numéro disponible. Si aucune facture cette année → FAC-YYYY-001.
 */
export function generateInvoiceNumber(existing: (string | null | undefined)[] = []): string {
  const year = new Date().getFullYear();
  const prefix = `FAC-${year}-`;
  let maxSeq = 0;
  for (const num of existing) {
    if (!num) continue;
    if (!num.startsWith(prefix)) continue;
    const tail = num.slice(prefix.length);
    const n = parseInt(tail, 10);
    if (Number.isFinite(n) && n > maxSeq) maxSeq = n;
  }
  const next = (maxSeq + 1).toString().padStart(3, '0');
  return `${prefix}${next}`;
}

/** Numéro suivant donné un numéro de référence (FAC-YYYY-NNN → FAC-YYYY-NNN+1). */
export function nextInvoiceNumber(reference: string): string {
  const m = reference.match(/^(FAC-\d{4}-)(\d+)$/);
  if (!m) {
    // fallback : on ré-extrait depuis liste vide → FAC-YYYY-001
    return generateInvoiceNumber([reference]);
  }
  const next = (parseInt(m[2], 10) + 1).toString().padStart(m[2].length, '0');
  return `${m[1]}${next}`;
}

export function generateQuoteNumber(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const rand = String(Math.floor(Math.random() * 9000) + 1000);
  return `DEV-${year}${month}-${rand}`;
}
