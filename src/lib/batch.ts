/**
 * "Receber várias de uma vez" (S7, improvement 49): one amount received for
 * several installments of a debtor, across all their debts.
 */
import { daysUntil } from './installmentTag'
import { leftOf } from './debtorProfile'
import type { DebtWithInstallments } from '../hooks/debts/useDebtsByDebtor'
import type { Installment } from '../types/installment'

export interface BatchCandidate {
  inst: Installment
  debt: DebtWithInstallments
  /** What is still owed on it, cents. */
  left: number
  late: boolean
}

/** Last day of today's month (YYYY-MM-DD). */
export function monthEnd(today: string): string {
  const [y, m] = today.split('-').map(Number)
  return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10)
}

/** Every open installment of the debtor: overdue first, then by due day. */
export function batchCandidates(debts: DebtWithInstallments[], today: string): BatchCandidate[] {
  return debts
    .flatMap((debt) => debt.installments.map((inst) => ({ inst, debt, left: leftOf(inst), late: daysUntil(inst.dueDate, today) < 0 })))
    .filter((c) => c.left > 0)
    .sort((a, b) => {
      if (a.late !== b.late) return a.late ? -1 : 1
      const da = a.inst.dueDate.slice(0, 10)
      const db = b.inst.dueDate.slice(0, 10)
      return da < db ? -1 : da > db ? 1 : a.inst.number - b.inst.number
    })
}

/** Opens with everything due until the end of the month (overdue included). */
export const dueThisMonth = (c: BatchCandidate, today: string) => c.inst.dueDate.slice(0, 10) <= monthEnd(today)

export interface Allocation {
  /** installmentId → cents, in the order of the candidates. */
  amounts: Map<string, number>
  /** Sum of what is left on the selected ones, cents. */
  selTotal: number
  /** Received beyond the selected ones, cents (must be 0 to register). */
  over: number
  /** Selected and fully paid by this amount. */
  full: number
  /** Selected and only partly paid (at most one: the last one reached). */
  partial: BatchCandidate | null
  /** Selected but the amount ran out before them. */
  notCovered: number
}

/**
 * Splits `amount` over the selected candidates from the oldest to the newest
 * (the candidates' order). Less than the total leaves the last one reached
 * partial; more is reported as `over`.
 */
export function allocate(candidates: BatchCandidate[], selected: ReadonlySet<string>, amount: number): Allocation {
  const pool = candidates.filter((c) => selected.has(c.inst.id))
  const amounts = new Map<string, number>()
  let rest = Math.max(0, Math.round(amount))
  let full = 0
  let partial: BatchCandidate | null = null
  for (const c of pool) {
    if (rest <= 0) break
    const take = Math.min(c.left, rest)
    amounts.set(c.inst.id, take)
    rest -= take
    if (take === c.left) full++
    else partial = c
  }
  return {
    amounts,
    selTotal: pool.reduce((s, c) => s + c.left, 0),
    over: rest,
    full,
    partial,
    notCovered: pool.length - amounts.size,
  }
}
