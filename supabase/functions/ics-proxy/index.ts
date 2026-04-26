/**
 * Edge Function : Proxy CORS pour calendriers ICS publics
 * --------------------------------------------------------
 * Le navigateur ne peut pas fetcher directement les URLs iCloud (pas de
 * header Access-Control-Allow-Origin). Cette fonction agit comme proxy :
 *  - Reçoit ?url=webcal://...
 *  - Whitelist iCloud / Google Calendar / Outlook (anti-SSRF)
 *  - Convertit webcal:// → https://
 *  - Récupère le flux ICS et le renvoie avec headers CORS ouverts
 *
 * Déploiement :
 *   cd MAPACRM
 *   npx supabase functions deploy ics-proxy --no-verify-jwt
 *
 * Usage côté client :
 *   GET https://<project>.supabase.co/functions/v1/ics-proxy?url=<webcal-url>
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Cache-Control': 'public, max-age=120',
};

const ALLOWED_HOST_SUFFIXES = [
  '.icloud.com',
  '.google.com',
  '.googleusercontent.com',
  '.outlook.com',
  '.office.com',
  '.office365.com',
  '.live.com',
];

function hostIsAllowed(host: string): boolean {
  const h = host.toLowerCase();
  if (h === 'icloud.com' || h === 'calendar.google.com' || h === 'outlook.com' || h === 'outlook.live.com') return true;
  return ALLOWED_HOST_SUFFIXES.some((suf) => h.endsWith(suf));
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }
  if (req.method !== 'GET') {
    return new Response('Method not allowed', { status: 405, headers: CORS_HEADERS });
  }

  try {
    const inputUrl = new URL(req.url).searchParams.get('url');
    if (!inputUrl) {
      return new Response('Missing ?url parameter', { status: 400, headers: CORS_HEADERS });
    }

    let normalized = inputUrl.trim();
    if (normalized.startsWith('webcal://')) normalized = 'https://' + normalized.slice('webcal://'.length);
    if (!normalized.startsWith('https://')) {
      return new Response('Only https:// or webcal:// URLs are allowed', { status: 400, headers: CORS_HEADERS });
    }

    let target: URL;
    try {
      target = new URL(normalized);
    } catch {
      return new Response('Invalid URL', { status: 400, headers: CORS_HEADERS });
    }

    if (!hostIsAllowed(target.hostname)) {
      return new Response(
        `Host not allowed: ${target.hostname}. Whitelist: iCloud, Google Calendar, Outlook.`,
        { status: 403, headers: CORS_HEADERS }
      );
    }

    const upstream = await fetch(target.toString(), {
      headers: { 'User-Agent': 'MAPA-CRM-ICS-Proxy/1.0' },
      redirect: 'follow',
    });

    if (!upstream.ok) {
      return new Response(`Upstream returned ${upstream.status} ${upstream.statusText}`, {
        status: upstream.status,
        headers: CORS_HEADERS,
      });
    }

    const body = await upstream.text();
    return new Response(body, {
      status: 200,
      headers: { ...CORS_HEADERS, 'Content-Type': 'text/calendar; charset=utf-8' },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return new Response(`Proxy error: ${msg}`, { status: 500, headers: CORS_HEADERS });
  }
});
