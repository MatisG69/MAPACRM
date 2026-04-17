const ACTOR_ID = 'compass~crawler-google-places'
const BASE = 'https://api.apify.com/v2'

function token(): string {
  const t = import.meta.env.VITE_APIFY_API_TOKEN as string | undefined
  if (!t?.trim()) throw new Error('VITE_APIFY_API_TOKEN non défini dans le fichier .env')
  return t
}

export async function startApifyRun(query: string, location: string, maxResults: number): Promise<string> {
  const res = await fetch(`${BASE}/acts/${ACTOR_ID}/runs`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      searchStringsArray: [`${query.trim()} ${location.trim()}`],
      maxCrawledPlacesPerSearch: Math.min(Math.max(1, maxResults), 200),
      language: 'fr',
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Apify (${res.status}) : ${text.slice(0, 300)}`)
  }

  const data = await res.json()
  const runId: string = data?.data?.id
  if (!runId) throw new Error('Apify n\'a pas retourné de runId')
  return runId
}

export async function pollApifyRun(runId: string): Promise<{ status: string; datasetId?: string }> {
  const res = await fetch(`${BASE}/actor-runs/${runId}`, {
    headers: { Authorization: `Bearer ${token()}` },
  })
  if (!res.ok) throw new Error(`Polling run échoué (${res.status})`)
  const data = await res.json()
  return {
    status: data.data.status as string,
    datasetId: data.data.defaultDatasetId as string | undefined,
  }
}

export async function fetchApifyDataset(datasetId: string): Promise<unknown[]> {
  const res = await fetch(`${BASE}/datasets/${datasetId}/items?limit=200&clean=true`, {
    headers: { Authorization: `Bearer ${token()}` },
  })
  if (!res.ok) throw new Error(`Dataset fetch échoué (${res.status})`)
  return res.json()
}
