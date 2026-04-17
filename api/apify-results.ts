/**
 * Vercel serverless function — interroge le statut d'un run Apify et retourne les résultats.
 * Polling côté client toutes les 4s jusqu'à SUCCEEDED / FAILED.
 */
const APIFY_BASE = 'https://api.apify.com/v2'

function cors(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
  }
}

export default async function handler(request: Request): Promise<Response> {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors() })
  }

  const token = process.env.APIFY_API_TOKEN
  if (!token?.trim()) {
    return Response.json(
      { error: 'APIFY_API_TOKEN non défini sur le serveur' },
      { status: 500, headers: cors() },
    )
  }

  const { searchParams } = new URL(request.url)
  const runId = searchParams.get('runId')
  if (!runId) {
    return Response.json({ error: 'Paramètre runId manquant' }, { status: 400, headers: cors() })
  }

  const authHeaders = { Authorization: `Bearer ${token}` }

  try {
    const runRes = await fetch(`${APIFY_BASE}/actor-runs/${runId}`, { headers: authHeaders })
    if (!runRes.ok) {
      return Response.json(
        { error: `Erreur récupération run (${runRes.status})` },
        { status: 502, headers: cors() },
      )
    }

    const runData = await runRes.json()
    const { status, defaultDatasetId } = runData.data as { status: string; defaultDatasetId: string }

    if (status !== 'SUCCEEDED') {
      return Response.json({ status }, { status: 200, headers: cors() })
    }

    const itemsRes = await fetch(
      `${APIFY_BASE}/datasets/${defaultDatasetId}/items?limit=200&clean=true`,
      { headers: authHeaders },
    )
    if (!itemsRes.ok) {
      return Response.json(
        { error: 'Erreur récupération dataset' },
        { status: 502, headers: cors() },
      )
    }

    const items = await itemsRes.json()
    return Response.json(
      { status: 'SUCCEEDED', items },
      { status: 200, headers: { ...cors(), 'Cache-Control': 'no-store' } },
    )
  } catch (err) {
    return Response.json(
      { error: (err as Error).message },
      { status: 500, headers: cors() },
    )
  }
}
