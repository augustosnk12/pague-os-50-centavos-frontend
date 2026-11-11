/**
 * The receipt as a PNG (improvement 37), drawn on a canvas. Always light
 * colours: it is sent to someone else, whatever theme the app is in.
 */
import { fmtMoney } from './format'
import type { Receipt } from './receipt'

const W = 720
const FONT = 'Manrope, -apple-system, "Segoe UI", sans-serif'
const C = { bg: '#f4f1f8', card: '#ffffff', text: '#2a2035', muted: '#6d6278', faint: '#857a90', line: '#e6e0ec', paid: '#2e7d4f', brandA: '#7b3fc4', brandB: '#5a2e9e' }

function rows(r: Receipt): [string, string][] {
  const base: [string, string][] = [['De', r.from], ['Para', r.to]]
  if (r.kind === 'payoff') return [...base, ['Dívida', r.ref ?? ''], ...(r.items ?? []).map((i) => [i.ref, i.amount] as [string, string]), ['Situação', '✓ Quitada']]
  if (r.kind === 'batch') return [...base, ...(r.items ?? []).map((i) => [`${i.ref} · ${i.status}`, i.amount] as [string, string]), ['Saldo em aberto', r.balance]]
  return [...base, ['Referente a', r.ref ?? ''], ['Parcela', r.installment ?? ''], ['Saldo da dívida', r.balance === 'Quitada' ? '✓ Quitada' : r.balance]]
}

const fit = (g: CanvasRenderingContext2D, text: string, max: number) => {
  if (g.measureText(text).width <= max) return text
  let t = text
  while (t.length > 1 && g.measureText(`${t}…`).width > max) t = t.slice(0, -1)
  return `${t}…`
}

export function drawReceipt(r: Receipt): HTMLCanvasElement {
  const list = rows(r)
  const H = 580 + list.length * 64
  const cv = document.createElement('canvas')
  cv.width = W
  cv.height = H
  const g = cv.getContext('2d')!
  const round = (x: number, y: number, w: number, h: number, rad: number) => {
    g.beginPath()
    g.moveTo(x + rad, y)
    g.arcTo(x + w, y, x + w, y + h, rad)
    g.arcTo(x + w, y + h, x, y + h, rad)
    g.arcTo(x, y + h, x, y, rad)
    g.arcTo(x, y, x + w, y, rad)
    g.closePath()
  }

  g.fillStyle = C.bg
  g.fillRect(0, 0, W, H)
  g.fillStyle = C.card
  round(40, 40, W - 80, H - 80, 36)
  g.fill()

  // Logo + title + code
  const grad = g.createLinearGradient(80, 84, 152, 156)
  grad.addColorStop(0, C.brandA)
  grad.addColorStop(1, C.brandB)
  g.fillStyle = grad
  round(80, 84, 72, 72, 20)
  g.fill()
  g.fillStyle = '#fff'
  g.font = `800 26px ${FONT}`
  g.textAlign = 'center'
  g.fillText('50¢', 116, 130)
  g.textAlign = 'left'
  g.fillStyle = C.text
  g.font = `800 28px ${FONT}`
  g.fillText(r.title, 172, 112)
  g.fillStyle = C.faint
  g.font = `700 22px ${FONT}`
  g.fillText(r.code, 172, 146)

  // Amount, date, status
  g.textAlign = 'center'
  g.fillStyle = C.text
  g.font = `800 72px ${FONT}`
  g.fillText(fmtMoney(r.totalCents / 100), W / 2, 290)
  g.fillStyle = C.muted
  g.font = `700 24px ${FONT}`
  g.fillText(r.date, W / 2, 334)
  g.fillStyle = C.paid
  g.font = `800 22px ${FONT}`
  g.fillText(r.kind === 'payoff' ? '✓ Quitada' : '✓ Recebido', W / 2, 376)

  // Tear line
  g.strokeStyle = C.line
  g.setLineDash([10, 10])
  g.lineWidth = 3
  g.beginPath()
  g.moveTo(80, 420)
  g.lineTo(W - 80, 420)
  g.stroke()
  g.setLineDash([])

  list.forEach(([k, v], n) => {
    const y = 476 + n * 64
    g.textAlign = 'left'
    g.fillStyle = C.faint
    g.font = `700 22px ${FONT}`
    const key = fit(g, k, 340)
    g.fillText(key, 90, y)
    // The value gets all the room the label leaves.
    const room = W - 180 - g.measureText(key).width - 28
    g.textAlign = 'right'
    g.fillStyle = v.startsWith('✓') ? C.paid : C.text
    g.font = `800 24px ${FONT}`
    g.fillText(fit(g, v, room), W - 90, y)
  })

  g.textAlign = 'center'
  g.fillStyle = '#9a90a4'
  g.font = `600 18px ${FONT}`
  g.fillText('Gerado por Pague os 50 centavos · não é documento fiscal', W / 2, H - 80)
  return cv
}

/**
 * Phones: the system share sheet with the image (to send in any app).
 * Elsewhere: download the PNG. Returns what happened.
 */
export async function shareOrDownload(r: Receipt, text: string): Promise<'shared' | 'downloaded' | 'cancelled'> {
  await document.fonts?.ready
  const blob = await new Promise<Blob | null>((ok) => drawReceipt(r).toBlob(ok, 'image/png'))
  if (!blob) throw new Error('canvas')
  const name = `${r.code}.png`
  const file = new File([blob], name, { type: 'image/png' })
  if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: r.title, text })
      return 'shared'
    } catch {
      return 'cancelled'
    }
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  return 'downloaded'
}
