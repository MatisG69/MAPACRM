/** Normalise une URL saisie (ajoute https:// si besoin). */
export function normalizeSiteUrl(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  let u = raw.trim();
  if (!/^https?:\/\//i.test(u)) u = `https://${u}`;
  try {
    const parsed = new URL(u);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    return parsed.href;
  } catch {
    return null;
  }
}

export function siteHostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

const resolved = new Map<string, string | null>();
const inflight = new Map<string, Promise<string | null>>();

async function fetchOwnApi(normalizedUrl: string): Promise<string | null> {
  try {
    const r = await fetch(`/api/site-preview?url=${encodeURIComponent(normalizedUrl)}`);
    if (!r.ok) return null;
    const j = (await r.json()) as { imageUrl?: string | null };
    return j.imageUrl || null;
  } catch {
    return null;
  }
}

async function fetchMicrolinkImage(normalizedUrl: string): Promise<string | null> {
  try {
    const r = await fetch(
      `https://api.microlink.io/?url=${encodeURIComponent(normalizedUrl)}&palette=false&audio=false&video=false`
    );
    if (!r.ok) return null;
    const j = (await r.json()) as { data?: { image?: { url?: string }; logo?: { url?: string } } };
    return j?.data?.image?.url || j?.data?.logo?.url || null;
  } catch {
    return null;
  }
}

async function fetchMicrolinkScreenshot(normalizedUrl: string): Promise<string | null> {
  try {
    const r = await fetch(
      `https://api.microlink.io/?url=${encodeURIComponent(normalizedUrl)}&screenshot=true&meta=false`
    );
    if (!r.ok) return null;
    const j = (await r.json()) as { data?: { screenshot?: { url?: string } } };
    return j?.data?.screenshot?.url || null;
  } catch {
    return null;
  }
}

/**
 * Résout une URL d’image représentative (Open Graph via /api si déployé, sinon Microlink).
 * Résultat mis en cache par URL normalisée.
 */
export function resolveSitePreviewImage(siteUrl: string | null | undefined): Promise<string | null> {
  const normalized = normalizeSiteUrl(siteUrl || undefined);
  if (!normalized) return Promise.resolve(null);
  if (resolved.has(normalized)) return Promise.resolve(resolved.get(normalized)!);

  const existing = inflight.get(normalized);
  if (existing) return existing;

  const p = (async () => {
    let img = await fetchOwnApi(normalized);
    if (!img) img = await fetchMicrolinkImage(normalized);
    if (!img) img = await fetchMicrolinkScreenshot(normalized);
    resolved.set(normalized, img);
    return img;
  })();

  inflight.set(normalized, p);
  p.finally(() => inflight.delete(normalized));
  return p;
}
