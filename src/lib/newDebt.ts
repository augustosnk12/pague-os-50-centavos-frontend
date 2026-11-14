/**
 * Nova dívida (S8): first due date by type (improvement 23), monthly
 * recurrence preview (improvement 39) and what is still missing.
 */
import type { DebtType } from '../types/debt'
import type { LenderSettings } from '../api/settings.api'

/** À vista (1 installment) or parcelado (improvement 18). */
export const INSTALLMENT_TYPES: DebtType[] = ['CREDIT_CARD', 'PIX_INSTALLMENT']
export const isInstallmentType = (t: DebtType) => INSTALLMENT_TYPES.includes(t)

const ymd = (y: number, m: number, d: number) => new Date(Date.UTC(y, m, d)).toISOString().slice(0, 10)
const lastDay = (y: number, m: number) => new Date(Date.UTC(y, m + 1, 0)).getUTCDate()

/** Same day `n` months later; days 29–31 fall on the last day of shorter months (like the API). */
export function addMonths(iso: string, n: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  return ymd(y, m - 1 + n, Math.min(d, lastDay(y, m - 1 + n)))
}

/** Next date on that day of the month, after today (29–31 → last day of short months). */
export function nextDayOf(day: number, today: string): string {
  const [y, m] = today.split('-').map(Number)
  const at = (mm: number) => ymd(y, mm, Math.min(day, lastDay(y, mm)))
  const here = at(m - 1)
  return here > today ? here : at(m)
}

/** The type's default day from Configurações, or the 1st of next month (as before). */
export function defaultDue(type: DebtType, settings: Pick<LenderSettings, 'defaultCardDueDay' | 'defaultPixInstallmentDueDay'> | undefined, today: string): string {
  const day = type === 'CREDIT_CARD' ? settings?.defaultCardDueDay : type === 'PIX_INSTALLMENT' ? settings?.defaultPixInstallmentDueDay : null
  if (day) return nextDayOf(day, today)
  const [y, m] = today.split('-').map(Number)
  return ymd(y, m, 1)
}

export type RecurrenceEnd = 'never' | 'count' | 'date'

/** The next (up to) 3 monthly charges, within the end chosen. */
export function recurringPreview(first: string, end: RecurrenceEnd, months: number, until: string): string[] {
  return [0, 1, 2]
    .map((k) => addMonths(first, k))
    .filter((due, k) => (end === 'count' ? k < months : end === 'date' ? !!until && due <= until : true))
}

export interface RecurrenceEndInfo {
  /** Due day (YYYY-MM-DD) of the last charge, or null when it never ends. */
  last: string | null
  /** Charges still to be created after the existing ones. */
  remaining: number | null
}

/**
 * When a monthly recurrence ends, from what already exists: its last charge
 * and the end chosen (a number of charges or a date). Same steps as the API
 * (same day each month, the last day of shorter months).
 */
export function recurrenceEnd(
  dues: string[],
  day: number | null | undefined,
  end: { occurrences?: number | null; endsAt?: string | null },
): RecurrenceEndInfo {
  const lastDue = [...dues].sort().pop()
  if (!lastDue || (!end.occurrences && !end.endsAt)) return { last: null, remaining: null }
  const d = day ?? Number(lastDue.slice(8, 10))
  const step = (k: number) => {
    const [y, m] = lastDue.split('-').map(Number)
    return ymd(y, m - 1 + k, Math.min(d, lastDay(y, m - 1 + k)))
  }
  if (end.occurrences) {
    const remaining = Math.max(0, end.occurrences - dues.length)
    return { last: remaining ? step(remaining) : lastDue, remaining }
  }
  const until = end.endsAt!.slice(0, 10)
  let k = 0
  while (k < 600 && step(k + 1) <= until) k++
  return { last: step(k), remaining: k }
}
