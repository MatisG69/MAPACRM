import { useRef, useState } from 'react'
import { ArrowLeft, X, FileDown, Loader2 } from 'lucide-react'
import { Button } from '../ui/Button'

interface DevisPreviewOverlayProps {
  html: string
  filename: string
  onBack?: () => void
  onClose: () => void
}

export function DevisPreviewOverlay({ html, filename, onBack, onClose }: DevisPreviewOverlayProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [downloading, setDownloading] = useState(false)

  const handleSavePdf = async () => {
    setDownloading(true)
    try {
      const res = await fetch('/api/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html, filename }),
      })
      if (!res.ok) throw new Error('API unavailable')

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      // API not available (local dev) — fall back to browser print
      iframeRef.current?.contentWindow?.print()
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-[#0d0d0d]">
      <div className="flex items-center justify-between px-4 py-3 border-b border-ws-line/60 bg-ws-panel/95 backdrop-blur flex-shrink-0">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-2 text-sm text-ws-mist hover:text-ws-paper transition-colors"
          >
            <ArrowLeft size={15} />
            Modifier
          </button>
        ) : (
          <div />
        )}

        <span className="text-xs font-mono text-ws-ink uppercase tracking-widest">Aperçu devis</span>

        <div className="flex items-center gap-2">
          <Button
            icon={downloading ? <Loader2 size={14} className="animate-spin" /> : <FileDown size={14} />}
            className="normal-case tracking-normal text-xs py-1.5"
            onClick={handleSavePdf}
            disabled={downloading}
          >
            {downloading ? 'Génération…' : 'Télécharger PDF'}
          </Button>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-lg text-ws-mist hover:text-ws-paper hover:bg-white/[0.06] transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      <div className="flex-1 relative">
        <iframe
          ref={iframeRef}
          srcDoc={html}
          title={filename}
          className="absolute inset-0 w-full h-full border-0"
        />
      </div>
    </div>
  )
}
