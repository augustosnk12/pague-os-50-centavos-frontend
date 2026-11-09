import { fmtList, fmtMoney } from './format'
import type { InstallmentEnriched } from '../types/installment'

/** Whole days from `today` to the due day (negative = overdue). Both read as calendar days. */
export function daysUntil(dueDate: string, today: string): number {
  const utc = (s: string) => {
    const [y, m, d] = s.slice(0, 10).split('-').map(Number)
    return Date.UTC(y, m - 1, d)
  }
  return Math.round((utc(dueDate) - utc(today)) / 86_400_000)
}

/** What is still owed, in cents (integer math: no float drift). */
export function remainingCents(inst: { amount: string; paidAmount?: string | null }): number {
  return Math.max(0, Math.round(Number(inst.amount) * 100) - Math.round(Number(inst.paidAmount ?? '0') * 100))
}

export type TagTone = 'overdue' | 'partial' | 'pending' | 'paid' | 'muted'

export interface InstallmentTag {
  /** Short text shown in the row ("3d atraso", "Vence hoje", "05 nov"). */
  text: string
  /** Same, spelled out for screen readers ("3 dias de atraso"). */
  spoken: string
  tone: TagTone
}

/**
 * The short label of a compact installment row (improvement 4), derived from
 * the dates and amounts, never from the API's `status` (it can lag).
 */
export function installmentTag(
  inst: { amount: string; paidAmount?: string | null; dueDate: string },
  today: string,
  { showDate = true }: { showDate?: boolean } = {},
): InstallmentTag | null {
  const left = remainingCents(inst)
  const paid = Math.round(Number(inst.paidAmount ?? '0') * 100)
  if (left === 0) return { text: 'Pago', spoken: 'pago', tone: 'paid' }
  const partial = paid > 0 ? 'Parcial · ' : ''
  const d = daysUntil(inst.dueDate, today)
  if (d < 0) {
    const n = -d
    return { text: `${partial}${n}d atraso`, spoken: `${partial ? 'parcial, ' : ''}${n} ${n === 1 ? 'dia' : 'dias'} de atraso`, tone: 'overdue' }
  }
  if (paid > 0) {
    const falta = fmtMoney(left / 100)
    return { text: `Parcial · falta ${falta}`, spoken: `parcial, falta ${falta}`, tone: 'partial' }
  }
  if (d === 0) return { text: 'Vence hoje', spoken: 'vence hoje', tone: 'pending' }
  if (!showDate) return null
  const date = fmtList(inst.dueDate)
  return { text: date, spoken: `vence ${d === 1 ? 'amanhã' : `em ${date}`}`, tone: 'muted' }
}

/** "7/12", "mensal" for recurring debts, or "parcela 7" on an API that does not send the count. */
export function installmentPosition(inst: Pick<InstallmentEnriched, 'number' | 'debt'>): string {
  if (inst.debt?.recurrence === 'MONTHLY') return '↻ mensal'
  const n = inst.debt?.installmentCount
  return n ? `${inst.number}/${n}` : `parcela ${inst.number}`
}
