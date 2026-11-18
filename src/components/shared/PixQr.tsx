import { useEffect, useState } from 'react'

/** Dark modules of a QR Code as one SVG path (1 unit = 1 module). */
async function qrPath(text: string): Promise<{ d: string; size: number }> {
  // Loaded only when a QR is shown: keeps it out of the initial bundle.
  const { default: qrcode } = await import('qrcode-generator')
  const qr = qrcode(0, 'M')
  qr.addData(text)
  qr.make()
  const n = qr.getModuleCount()
  let d = ''
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) d += `M${c} ${r}h1v1h-1z`
  return { d, size: n }
}

const QUIET = 4 // quiet zone, in modules (what scanners expect)

/**
 * A Pix QR Code (improvement 51): black on white in both themes, so any bank
 * app can read it, with the quiet zone around it.
 */
export function PixQr({ code, label, px = 200 }: { code: string; label: string; px?: number }) {
  const [qr, setQr] = useState<{ d: string; size: number; for: string } | null>(null)
  useEffect(() => {
    let alive = true
    void qrPath(code).then((r) => alive && setQr({ ...r, for: code }))
    return () => {
      alive = false
    }
  }, [code])
  const ready = qr && qr.for === code
  return (
    <div className="lt-qr-box" role="img" aria-label={label} style={{ width: px, height: px }}>
      {ready && (
        <svg viewBox={`${-QUIET} ${-QUIET} ${qr.size + QUIET * 2} ${qr.size + QUIET * 2}`} width={px} height={px} shapeRendering="crispEdges" aria-hidden="true">
          <rect x={-QUIET} y={-QUIET} width={qr.size + QUIET * 2} height={qr.size + QUIET * 2} fill="#fff" />
          <path d={qr.d} fill="#000" />
        </svg>
      )}
    </div>
  )
}
