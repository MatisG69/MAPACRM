/**
 * Vercel Edge : extrait og:image / twitter:image depuis la page distante.
 * Évite le CORS navigateur et améliore la qualité des aperçus en prod.
 */
export const config = { runtime: 'edge' };

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function extractOgImage(html: string, baseHref: string): string | null {
  const patterns: RegExp[] = [
    /<meta\s+[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i,
    /<meta\s+[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i,
    /<meta\s+[^>]*property=["']og:image:secure_url["'][^>]*content=["']([^"']+)["']/i,
    /<meta\s+[^>]*content=["']([^"']+)["'][^>]*property=["']og:image:secure_url["']/i,
    /<meta\s+[^>]*name=["']twitter:image["'][^>]*content=["']([^"']+)["']/i,
    /<meta\s+[^>]*content=["']([^"']+)["'][^>]*name=["']twitter:image["']/i,
    /<meta\s+[^>]*name=["']twitter:image:src["'][^>]*content=["']([^"']+)["']/i,
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m?.[1]) {
      const raw = decodeEntities(m[1].trim());
      try {
        return new URL(raw, baseHref).href;
      } catch {
        continue;
      }
    }
  }
  return null;
}

export default async function handler(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const target = searchParams.get('url');
  if (!target || !/^https?:\/\//i.test(target)) {
    return Response.json({ imageUrl: null, error: 'invalid_url' }, { status: 400 });
  }

  let finalUrl: string;
  try {
    finalUrl = new URL(target).href;
  } catch {
    return Response.json({ imageUrl: null, error: 'invalid_url' }, { status: 400 });
  }

  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 12_000);
    const res = await fetch(finalUrl, {
      redirect: 'follow',
      signal: ctrl.signal,
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        'User-Agent': 'Mozilla/5.0 (compatible; MAPACRM/1.0; +https://mapacrm) AppleWebKit/537.36',
      },
    });
    clearTimeout(t);
    if (!res.ok) {
      return Response.json({ imageUrl: null }, { status: 200, headers: cors() });
    }
    const html = await res.text();
    const base = res.url || finalUrl;
    const imageUrl = extractOgImage(html.slice(0, 500_000), base);
    return Response.json(
      { imageUrl },
      {
        status: 200,
        headers: {
          ...cors(),
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
        },
      }
    );
  } catch {
    return Response.json({ imageUrl: null }, { status: 200, headers: cors() });
  }
}

function cors(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET',
  };
}
