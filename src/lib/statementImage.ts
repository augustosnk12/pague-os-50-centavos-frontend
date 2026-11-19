/**
 * The extrato as a PNG (S14), in the receipt's style (always light colours).
 * Drawn twice: once to measure where the content ends, then at that height.
 */
import { fmtMoney } from './format'
import { historyLine, rowText, statementPix, untilSuffix, type Statement } from './statement'

const W = 720
const MAX_ROWS = 6
const FONT = 'Manrope, -apple-system, "Segoe UI", sans-serif'
const C = { bg: '#f4f1f8', card: '#ffffff', text: '#2a2035', muted: '#6d6278', faint: '#857a90', line: '#e6e0ec', paid: '#2e7d4f', paidBg: '#e8f5ee', late: '#c0392b', brandA: '#7b3fc4', brandB: '#5a2e9e' }
const money = (c: number) => fmtMoney(c / 100)

function paint(name: string, issuedOn: string, s: Statement, withPix: boolean, H: number): { cv: HTMLCanvasElement; end: number } {
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
  const fit = (text: string, max: number) => {
    if (g.measureText(text).width <= max) return text
    let t = text
    while (t.length > 1 && g.measureText(`${t}…`).width > max) t = t.slice(0, -1)
    return `${t}…`
  }
  const pair = (left: string, right: string, x: number, y: number) => {
    g.textAlign = 'right'
    g.fillText(right, W - 90, y)
    const room = W - 90 - x - g.measureText(right).width - 20
    g.textAlign = 'left'
    g.fillText(fit(left, room), x, y)
  }

  g.fillStyle = C.bg
  g.fillRect(0, 0, W, H)
  g.fillStyle = C.card
  round(40, 40, W - 80, H - 80, 36)
  g.fill()

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
  g.fillText(fit(`Extrato de ${name}`, W - 172 - 90), 172, 112)
  g.fillStyle = C.faint
  g.font = `700 22px ${FONT}`
  g.fillText(`Emitido em ${issuedOn}`, 172, 146)

  let y = 250
  g.textAlign = 'center'
  if (s.debts.length) {
    g.fillStyle = C.text
    g.font = `800 64px ${FONT}`
    g.fillText(money(s.totalCents), W / 2, y)
    g.fillStyle = C.muted
    g.font = `700 22px ${FONT}`
    g.fillText(`em aberto${untilSuffix(s)}`, W / 2, y + 40)
    y += 40
    if (s.lateCents > 0) {
      g.fillStyle = C.late
      g.font = `800 22px ${FONT}`
      g.fillText(`${money(s.lateCents)} em atraso`, W / 2, y + 38)
      y += 38
    }
  } else {
    g.fillStyle = C.paid
    g.font = `800 48px ${FONT}`
    g.fillText('✓ Nada em aberto', W / 2, y)
  }

  y += 50
  g.strokeStyle = C.line
  g.setLineDash([10, 10])
  g.lineWidth = 3
  g.beginPath()
  g.moveTo(80, y)
  g.lineTo(W - 80, y)
  g.stroke()
  g.setLineDash([])
  y += 50

  for (const d of s.debts) {
    g.fillStyle = C.text
    g.font = `800 25px ${FONT}`
    pair(d.title, money(d.leftCents), 90, y)
    y += 40
    g.font = `700 21px ${FONT}`
    for (const r of d.rows.slice(0, MAX_ROWS)) {
      g.fillStyle = r.late ? C.late : C.muted
      pair(rowText(r), money(r.cents), 110, y)
      y += 36
    }
    if (d.rows.length > MAX_ROWS) {
      const rest = d.rows.slice(MAX_ROWS)
      g.textAlign = 'left'
      g.fillStyle = C.faint
      g.font = `700 19px ${FONT}`
      g.fillText(`+ ${rest.length} parcela${rest.length > 1 ? 's' : ''} · ${money(rest.reduce((t, r) => t + r.cents, 0))}`, 110, y)
      y += 36
    }
    y += 18
  }

  if (s.history && s.paymentCount) {
    g.fillStyle = C.paidBg
    round(80, y - 10, W - 160, 54, 14)
    g.fill()
    g.fillStyle = C.paid
    g.font = `800 21px ${FONT}`
    g.textAlign = 'center'
    g.fillText(`✓ ${historyLine(s)}`, W / 2, y + 25)
    y += 70
  }
  const pix = statementPix(s)
  if (withPix && pix) {
    g.fillStyle = C.muted
    g.font = `700 19px ${FONT}`
    g.textAlign = 'center'
    g.fillText(`Pix copia e cola na mensagem · ${money(pix.cents)}`, W / 2, y + 10)
    y += 40
  }

  g.textAlign = 'center'
  g.fillStyle = '#9a90a4'
  g.font = `600 18px ${FONT}`
  g.fillText('Gerado por Pague os 50 centavos · não é documento fiscal', W / 2, H - 80)
  return { cv, end: y }
}

export function drawStatement(name: string, issuedOn: string, s: Statement, withPix: boolean): HTMLCanvasElement {
  const first = paint(name, issuedOn, s, withPix, 2400)
  return paint(name, issuedOn, s, withPix, Math.max(620, first.end + 150)).cv
}
