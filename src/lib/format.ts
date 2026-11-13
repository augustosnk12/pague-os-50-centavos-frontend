/**
 * Date formats of the approved glossary (improvement 30). One module so every
 * screen writes dates the same way. Dates are calendar days (YYYY-MM-DD or an
 * ISO timestamp at UTC midnight, as the API stores due dates).
 *
 *   list     → "03 nov"
 *   title    → "ter, 03 nov"
 *   sentence → "terça, 3 de novembro"   (+ year when not the current one)
 */
const MONTHS_SHORT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
const MONTHS_LONG = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
const WEEKDAYS_SHORT = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']
const WEEKDAYS_LONG = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado']

/** Calendar day of a YYYY-MM-DD string or ISO timestamp, read in UTC (no time-zone shift). */
function day(value: string | Date): { y: number; m: number; d: number; wd: number } {
  const iso = typeof value === 'string' ? value : value.toISOString()
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  const wd = new Date(Date.UTC(y, m - 1, d)).getUTCDay()
  return { y, m: m - 1, d, wd }
}

export function fmtList(value: string | Date): string {
  const { m, d } = day(value)
  return `${String(d).padStart(2, '0')} ${MONTHS_SHORT[m]}`
}

export function fmtTitle(value: string | Date): string {
  const x = day(value)
  return `${WEEKDAYS_SHORT[x.wd]}, ${fmtList(value)}`
}

export function fmtSentence(value: string | Date, currentYear: number = new Date().getFullYear()): string {
  const x = day(value)
  return `${WEEKDAYS_LONG[x.wd]}, ${x.d} de ${MONTHS_LONG[x.m]}${x.y !== currentYear ? ` de ${x.y}` : ''}`
}

/** "R$ 1.234,50" — money is always formatted here or by <Money>. */
export function fmtMoney(value: number | string): string {
  return Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

/** "2026-11-09" → "09/11/2026" (Brazilian format, always). */
export function fmtBR(iso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return ''
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

/** "09/11/2026" → "2026-11-09"; '' when incomplete or not a real day. */
export function parseBR(text: string): string {
  const digits = text.replace(/\D/g, '')
  if (digits.length !== 8) return ''
  const d = Number(digits.slice(0, 2)), m = Number(digits.slice(2, 4)), y = Number(digits.slice(4, 8))
  if (y < 1900 || m < 1 || m > 12 || d < 1 || d > new Date(Date.UTC(y, m, 0)).getUTCDate()) return ''
  return `${digits.slice(4, 8)}-${digits.slice(2, 4)}-${digits.slice(0, 2)}`
}

/** Digits typed in a date field → "09/11/2026" as they come. */
export function maskBR(digits: string): string {
  const d = digits.slice(0, 8)
  return [d.slice(0, 2), d.slice(2, 4), d.slice(4, 8)].filter(Boolean).join('/')
}

/** "11912345678" → "(11) 91234-5678"; anything else is shown as typed. */
export function fmtPhone(phone: string): string {
  const d = phone.replace(/\D/g, '').replace(/^55(?=\d{10,11}$)/, '')
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return phone
}
