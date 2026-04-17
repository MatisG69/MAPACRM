/**
 * Vercel serverless function — démarre un job Apify Google Maps Scraper.
 * La clé APIFY_API_TOKEN reste côté serveur, jamais exposée au navigateur.
 */
const ACTOR_ID = 'compass~google-maps-scraper'
const APIFY_BASE = 'https://api.apify.com/v2'

function cors(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }
}

export default async function handler(request: Request): Promise<Response> {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors() })
  }
  if (request.method !== 'POST') {
    return Response.json({ error: 'method_not_allowed' }, { status: 405 })
  }

  const token = process.env.APIFY_API_TOKEN
  if (!token?.trim()) {
    return Response.json(
      { error: 'APIFY_API_TOKEN non défini sur le serveur. Ajoutez-la dans vos variables d\'environnement Vercel.' },
      { status: 500, headers: cors() },
    )
  }

  let body: { query: string; location: string; maxResults?: number }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Corps de requête JSON invalide' }, { status: 400, headers: cors() })
  }

  const { query, location, maxResults = 50 } = body
  if (!query?.trim() || !location?.trim()) {
    return Response.json(
      { error: 'Les champs query et location sont requis' },
      { status: 400, headers: cors() },
    )
  }

  const searchString = `${query.trim()} ${location.trim()}`

  try {
    const res = await fetch(`${APIFY_BASE}/acts/${ACTOR_ID}/runs`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        searchStringsArray: [searchString],
        maxCrawledPlacesPerSearch: Math.min(Math.max(1, maxResults), 200),
        language: 'fr',
        countryCode: 'FR',
        includeWebResults: false,
      }),
    })

    if (!res.ok) {
      const text = await res.text()
      return Response.json(
        { error: `Erreur Apify (${res.status}) : ${text.slice(0, 300)}` },
        { status: 502, headers: cors() },
      )
    }

    const data = await res.json()
    const runId: string = data?.data?.id
    const status: string = data?.data?.status

    return Response.json({ runId, status }, { status: 200, headers: cors() })
  } catch (err) {
    return Response.json(
      { error: (err as Error).message },
      { status: 500, headers: cors() },
    )
  }
}
