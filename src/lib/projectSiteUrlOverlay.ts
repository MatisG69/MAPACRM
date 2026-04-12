/**
 * Si la table Supabase `projects` n’a pas encore la colonne `site_url`,
 * on mémorise l’URL ici (navigateur) pour garder l’aperçu jusqu’à migration.
 */
const KEY = 'mapa-crm-project-site-url-overlay';

export function readSiteUrlOverlay(): Record<string, string> {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const p = JSON.parse(raw) as unknown;
    return p && typeof p === 'object' && !Array.isArray(p) ? (p as Record<string, string>) : {};
  } catch {
    return {};
  }
}

function writeSiteUrlOverlay(map: Record<string, string>) {
  localStorage.setItem(KEY, JSON.stringify(map));
}

export function setSiteUrlOverlay(projectId: string, url: string | null | undefined) {
  const map = { ...readSiteUrlOverlay() };
  if (url == null || url === '') delete map[projectId];
  else map[projectId] = url;
  writeSiteUrlOverlay(map);
}

export function removeSiteUrlOverlay(projectId: string) {
  const map = { ...readSiteUrlOverlay() };
  delete map[projectId];
  writeSiteUrlOverlay(map);
}

/**
 * Fusionne site_url : si la ligne API contient la clé `site_url`, on la prend telle quelle ;
 * sinon (colonne absente côté PostgREST) on utilise le cache navigateur.
 */
export function mergeProjectSiteUrlFromOverlay<T extends { id: string; site_url?: string | null }>(
  rows: T[]
): (T & { site_url: string | null })[] {
  const overlay = readSiteUrlOverlay();
  return rows.map((p) => {
    const site_url = Object.prototype.hasOwnProperty.call(p, 'site_url')
      ? (p.site_url ?? null)
      : overlay[p.id] ?? null;
    return { ...p, site_url };
  });
}

export function supabaseMissingSiteUrlColumn(err: { message?: string; code?: string } | null): boolean {
  if (!err) return false;
  const msg = (err.message || '').toLowerCase();
  const code = String(err.code || '');
  if (code === 'PGRST204' && msg.includes('site_url')) return true;
  if (msg.includes('site_url') && (msg.includes('column') || msg.includes('schema cache'))) return true;
  return false;
}
