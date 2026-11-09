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
