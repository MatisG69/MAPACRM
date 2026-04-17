import { useState } from 'react'
import { Download, ArrowLeft, X, Loader2 } from 'lucide-react'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import { Button } from '../ui/Button'

interface DevisPreviewOverlayProps {
  html: string
  filename: string
  onBack?: () => void
  onClose: () => void
}

export function DevisPreviewOverlay({ html, filename, onBack, onClose }: DevisPreviewOverlayProps) {
  const [downloading, setDownloading] = useState(false)

  const handleDownload = async () => {
    setDownloading(true)
    const injected: Element[] = []
    let container: HTMLDivElement | null = null
    try {
      const parser = new DOMParser()
      const parsed = parser.parseFromString(html, 'text/html')

      // Inject styles so fonts load in this document's context
      parsed.querySelectorAll('style').forEach((s) => {
        const el = document.createElement('style')
        el.textContent = s.textContent
        document.head.appendChild(el)
        injected.push(el)
      })

      // Container must be VISIBLE (in viewport) for html2canvas to capture it.
      // We use opacity:0.001 + pointer-events:none so it's invisible to the user
      // but the browser still renders it for capture.
      container = document.createElement('div')
      container.style.cssText = [
        'position:fixed',
        'top:0',
        'left:0',
        'width:794px',       // ~210mm at 96dpi — html2canvas works in px
        'min-height:1123px', // ~297mm at 96dpi
        'background:#0A0A0A',
        'overflow:visible',
        'z-index:9999',
        'opacity:0.001',
        'pointer-events:none',
      ].join(';')
      container.innerHTML = parsed.body.innerHTML
      document.body.appendChild(container)

      // Wait for fonts + allow one paint cycle
      await Promise.race([
        Promise.all([
          document.fonts.load('700 16px "Playfair Display"'),
          document.fonts.load('400 16px "Inter"'),
          document.fonts.load('400 16px "JetBrains Mono"'),
        ]),
        new Promise<void>((r) => setTimeout(r, 4000)),
      ])
      // Extra frame to guarantee the browser has rendered the container
      await new Promise<void>((r) => setTimeout(r, 300))

      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#0A0A0A',
        logging: false,
        width: container.scrollWidth,
        height: container.scrollHeight,
        windowWidth: container.scrollWidth,
        windowHeight: container.scrollHeight,
      })

      const imgData = canvas.toDataURL('image/jpeg', 0.98)
      const pdf = new jsPDF('p', 'mm', 'a4')
      const pdfW = pdf.internal.pageSize.getWidth()
      const pdfH = (canvas.height * pdfW) / canvas.width
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfW, pdfH)
      pdf.save(filename)
    } finally {
      if (container) document.body.removeChild(container)
      injected.forEach((el) => el.parentNode?.removeChild(el))
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
            icon={downloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            className="normal-case tracking-normal text-xs py-1.5"
            onClick={handleDownload}
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

      {/* srcdoc évite les problèmes de blob URL et charge directement le HTML */}
      <div className="flex-1 relative">
        <iframe
          srcDoc={html}
          title="Aperçu devis"
          className="absolute inset-0 w-full h-full border-0"
        />
      </div>
    </div>
  )
}
