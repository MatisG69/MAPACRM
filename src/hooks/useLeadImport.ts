import { useState, useCallback, useRef } from 'react'
import { startApifyRun, pollApifyRun, fetchApifyDataset } from '../lib/apify/client'
import { importLeadsToSupabase } from '../lib/apify/import'
import type { ApifyBusinessResult, ImportStats } from '../lib/apify/import'

export type ImportStatus = 'idle' | 'starting' | 'running' | 'importing' | 'done' | 'error'

const TERMINAL_STATUSES = ['SUCCEEDED', 'FAILED', 'ABORTED', 'TIMED-OUT']

export function useLeadImport(onInsertDone?: () => void) {
  const [status, setStatus] = useState<ImportStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState<ImportStats | null>(null)
  const [importProgress, setImportProgress] = useState(0)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }, [])

  const startRun = useCallback(
    async (query: string, location: string, maxResults: number) => {
      stopPolling()
      setStatus('starting')
      setError(null)
      setStats(null)
      setImportProgress(0)

      try {
        const runId = await startApifyRun(query, location, maxResults)
        setStatus('running')

        pollRef.current = setInterval(async () => {
          try {
            const { status: runStatus, datasetId } = await pollApifyRun(runId)

            if (runStatus === 'SUCCEEDED' && datasetId) {
              stopPolling()
              const rawItems = await fetchApifyDataset(datasetId)
              setStatus('importing')
              const importStats = await importLeadsToSupabase(
                rawItems as ApifyBusinessResult[],
                (done, total) => setImportProgress(total > 0 ? Math.round((done / total) * 100) : 0),
              )
              setStats(importStats)
              setStatus('done')
              onInsertDone?.()
            } else if (TERMINAL_STATUSES.includes(runStatus)) {
              stopPolling()
              setStatus('error')
              setError(`Job Apify terminé avec statut : ${runStatus}`)
            }
          } catch (e) {
            stopPolling()
            setStatus('error')
            setError((e as Error).message)
          }
        }, 4_000)
      } catch (e) {
        setStatus('error')
        setError((e as Error).message)
      }
    },
    [stopPolling, onInsertDone],
  )

  const reset = useCallback(() => {
    stopPolling()
    setStatus('idle')
    setError(null)
    setStats(null)
    setImportProgress(0)
  }, [stopPolling])

  return { status, error, stats, importProgress, startRun, reset }
}
