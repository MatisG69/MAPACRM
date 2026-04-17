import { useState } from 'react'
import { Search, Loader2, CheckCircle2, AlertCircle, BarChart2, X } from 'lucide-react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { useLeadImport } from '../../hooks/useLeadImport'
import type { ImportStats } from '../../lib/apify/import'

interface ScrapingImportModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

function StatRow({ label, value, color = 'text-ws-paper' }: { label: string; value: number; color?: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-ws-line/50 last:border-0">
      <span className="text-xs font-mono text-ws-ink uppercase tracking-wider">{label}</span>
      <span className={`text-sm font-mono font-bold tabular-nums ${color}`}>{value}</span>
    </div>
  )
}

function ResultsPanel({ stats, onClose }: { stats: ImportStats; onClose: () => void }) {
  return (
    <div className="space-y-4">
      <div className={`flex items-center gap-3 p-4 rounded-lg border ${
        stats.imported > 0
          ? 'bg-ws-bull-dim border-ws-bull/25'
          : 'bg-ws-bear-dim border-ws-bear/25'
      }`}>
        {stats.imported > 0
          ? <CheckCircle2 size={20} className="text-ws-bull flex-shrink-0" />
          : <AlertCircle size={20} className="text-ws-bear flex-shrink-0" />
        }
        <div>
          <p className="text-sm font-semibold text-ws-paper font-display">
            {stats.imported > 0 ? 'Import terminé' : 'Aucun lead importé'}
          </p>
          <p className="text-xs text-ws-ink font-mono mt-0.5">
            {stats.imported > 0
              ? `${stats.imported} lead${stats.imported > 1 ? 's' : ''} ajouté${stats.imported > 1 ? 's' : ''} dans MAPA CRM`
              : stats.errors > 0
                ? `${stats.errors} erreur${stats.errors > 1 ? 's' : ''} — vérifiez les policies RLS Supabase`
                : `${stats.skipped} doublon${stats.skipped > 1 ? 's' : ''} détecté${stats.skipped > 1 ? 's' : ''} — leads déjà présents`
            }
          </p>
        </div>
      </div>

      <div className="ws-card rounded-lg p-4">
        <p className="ws-section-title mb-3 flex items-center gap-2">
          <BarChart2 size={13} />
          Résumé
        </p>
        <StatRow label="Fiches analysées" value={stats.total} />
        <StatRow label="Qualifiés" value={stats.qualified} color="text-ws-highlight" />
        <StatRow label="Importés" value={stats.imported} color="text-ws-bull" />
        <StatRow label="Doublons ignorés" value={stats.skipped} color="text-ws-mist" />
        {stats.errors > 0 && (
          <StatRow label="Erreurs" value={stats.errors} color="text-ws-bear" />
        )}
      </div>

      <Button className="w-full normal-case tracking-normal" onClick={handleClose}>
        Voir les leads dans le registre clients
      </Button>
    </div>
  )
}

export function ScrapingImportModal({ isOpen, onClose, onSuccess }: ScrapingImportModalProps) {
  const [query, setQuery] = useState('')
  const [location, setLocation] = useState('')
  const [maxResults, setMaxResults] = useState(50)

  // onInsertDone = déclenche le refetch côté parent, mais ne ferme PAS le modal
  const { status, error, stats, importProgress, startRun, reset } = useLeadImport(onSuccess)

  const isRunning = status === 'starting' || status === 'running' || status === 'importing'

  const handleClose = () => {
    if (isRunning) return
    reset()
    onClose()
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim() || !location.trim()) return
    startRun(query.trim(), location.trim(), maxResults)
  }

  const handleReset = () => {
    reset()
    setQuery('')
    setLocation('')
    setMaxResults(50)
  }

  const runningLabel = () => {
    if (status === 'starting') return 'Démarrage du job Apify…'
    if (status === 'running') return 'Recherche d\'entreprises en cours…'
    if (status === 'importing') return `Import dans MAPA CRM… ${importProgress}%`
    return ''
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Importer des leads via Scrapping"
      size="md"
    >
      {status === 'done' && stats ? (
        <ResultsPanel stats={stats} onClose={handleClose} />
      ) : isRunning ? (
        <div className="py-8 flex flex-col items-center gap-4 text-center">
          <div className="w-14 h-14 rounded-full bg-ws-wire/10 border border-ws-wire/20 flex items-center justify-center">
            <Loader2 size={24} className="text-ws-highlight animate-spin" />
          </div>
          <div>
            <p className="text-sm font-semibold text-ws-paper font-display">{runningLabel()}</p>
            <p className="text-xs text-ws-mist font-mono mt-1">
              Google Maps Scraper · temps estimé 30–90 s
            </p>
          </div>
          {status === 'importing' && (
            <div className="w-full max-w-xs bg-ws-line rounded-full h-1.5 overflow-hidden">
              <div
                className="h-full bg-ws-highlight transition-all duration-500 rounded-full"
                style={{ width: `${importProgress}%` }}
              />
            </div>
          )}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {status === 'error' && error && (
            <div className="flex items-start gap-3 p-3 rounded-lg bg-ws-bear-dim border border-ws-bear/30">
              <AlertCircle size={16} className="text-ws-bear flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-mono text-ws-bear leading-relaxed">{error}</p>
              </div>
              <button type="button" onClick={handleReset} className="text-ws-mist hover:text-ws-paper">
                <X size={14} />
              </button>
            </div>
          )}

          <div className="space-y-3">
            <div>
              <label className="form-label">Secteur / catégorie *</label>
              <input
                className="input"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ex : boulangerie, plombier, restaurant…"
                required
              />
            </div>
            <div>
              <label className="form-label">Ville ou région *</label>
              <input
                className="input"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="ex : Lyon, Bordeaux, 75001…"
                required
              />
            </div>
            <div>
              <label className="form-label">Nombre max de résultats</label>
              <select
                className="input"
                value={maxResults}
                onChange={(e) => setMaxResults(Number(e.target.value))}
              >
                {[20, 50, 100, 150, 200].map((n) => (
                  <option key={n} value={n}>{n} entreprises</option>
                ))}
              </select>
            </div>
          </div>

          <div className="ws-card rounded-lg p-3 text-xs text-ws-mist font-mono leading-relaxed">
            Les entreprises sans site web, à présence digitale faible ou sur annuaires uniquement seront
            importées comme prospects avec un <span className="text-ws-highlight">score digital</span> et
            le badge <span className="text-violet-300 font-semibold">Scrapping</span>.
          </div>

          <div className="flex gap-3 pt-1">
            <Button
              type="button"
              variant="secondary"
              className="flex-1 normal-case tracking-normal"
              onClick={handleClose}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              className="flex-1 normal-case tracking-normal"
              icon={<Search size={15} />}
              loading={isRunning}
              disabled={!query.trim() || !location.trim()}
            >
              Lancer l'import
            </Button>
          </div>
        </form>
      )}
    </Modal>
  )
}
