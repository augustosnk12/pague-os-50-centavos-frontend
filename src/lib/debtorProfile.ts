/**
 * Debtor profile (S4): the numbers of the header, the debts split into open
 * and paid off, and the payment timeline — from GET /debtors/:id/debts.
 * Status always derived from dates and amounts.
 */
import { daysUntil } from './installmentTag'
import { fmtBR } from './format'
import { recurrenceEnd } from './newDebt'
import type { DebtWithInstallments } from '../hooks/debts/useDebtsByDebtor'
import type { Installment, InstallmentEnriched } from '../types/installment'
import type { Debtor } from '../types/debtor'
import type { Payment } from '../types/payment'

const cents = (v: string | null | undefined) => Math.round(Number(v ?? '0') * 100)
export const leftOf = (i: Pick<Installment, 'amount' | 'paidAmount'>) => Math.max(0, cents(i.amount) - cents(i.paidAmount))
const isLate = (i: Installment, today: string) => leftOf(i) > 0 && daysUntil(i.dueDate, today) < 0

export const debtLeft = (d: DebtWithInstallments) => d.installments.reduce((s, i) => s + leftOf(i), 0)
export const debtLate = (d: DebtWithInstallments, today: string) => d.installments.some((i) => isLate(i, today))
export const openInstallments = (d: DebtWithInstallments) =>
  [...d.installments].filter((i) => leftOf(i) > 0).sort((a, b) => (a.dueDate < b.dueDate ? -1 : a.dueDate > b.dueDate ? 1 : a.number - b.number))

export interface ProfileNumbers {
  /** Still owed on everything, cents. */
  owed: number
  /** Overdue part of it, cents. */
  late: number
  /** Next due day of an open installment (YYYY-MM-DD) when nothing is late. */
  next: string | null
  /** Received on everything, cents. */
  received: number
  /** Share of paid installments paid on or before the due day (null: none paid yet). */
  onTime: number | null
  paidCount: number
  count: number
}

export function profileNumbers(debts: DebtWithInstallments[], today: string): ProfileNumbers {
  const all = debts.flatMap((d) => d.installments)
  const open = all.filter((i) => leftOf(i) > 0)
  const paid = all.filter((i) => leftOf(i) === 0)
  const lastPay = (i: Installment) => (i.payments ?? []).map((p) => p.paidAt.slice(0, 10)).sort().pop()
  const punctual = paid.filter((i) => {
    const last = lastPay(i)
    return !last || last <= i.dueDate.slice(0, 10)
  })
  const next = open.filter((i) => !isLate(i, today)).map((i) => i.dueDate.slice(0, 10)).sort()[0] ?? null
  return {
    owed: open.reduce((s, i) => s + leftOf(i), 0),
    late: open.filter((i) => isLate(i, today)).reduce((s, i) => s + leftOf(i), 0),
    next,
    received: all.reduce((s, i) => s + cents(i.paidAmount), 0),
    onTime: paid.length ? punctual.length / paid.length : null,
    paidCount: paid.length,
    count: all.length,
  }
}

/** Open debts (overdue first) and paid-off debts. */
export function splitDebts(debts: DebtWithInstallments[], today: string) {
  const open = debts.filter((d) => debtLeft(d) > 0).sort((a, b) => Number(debtLate(b, today)) - Number(debtLate(a, today)))
  const paid = debts.filter((d) => debtLeft(d) === 0 && d.installments.length > 0)
  return { open, paid }
}

export interface TimelineEntry {
  payment: Payment
  installment: Installment
  debt: DebtWithInstallments
  /** Days after the due day (0 = on time). */
  daysLate: number
}

/** Every payment, newest first. */
export function paymentTimeline(debts: DebtWithInstallments[]): TimelineEntry[] {
  return debts
    .flatMap((debt) =>
      debt.installments.flatMap((installment) =>
        (installment.payments ?? []).map((payment) => ({
          payment,
          installment,
          debt,
          daysLate: Math.max(0, -daysUntil(installment.dueDate, payment.paidAt.slice(0, 10))),
        })),
      ),
    )
    .sort((a, b) => (a.payment.paidAt < b.payment.paidAt ? 1 : a.payment.paidAt > b.payment.paidAt ? -1 : 0))
}

/** When the last installment of a paid-off debt was paid. */
export const paidOffOn = (d: DebtWithInstallments) =>
  d.installments.flatMap((i) => (i.payments ?? []).map((p) => p.paidAt.slice(0, 10))).sort().pop() ?? null

/** An installment of this debt in the shape the rows and sheets use. */
export function enrich(i: Installment, d: DebtWithInstallments, debtor: Debtor): InstallmentEnriched {
  return {
    ...i,
    debt: {
      id: d.id,
      description: d.description,
      type: d.type,
      debtorId: debtor.id,
      installmentCount: d.installments.length,
      recurrence: d.recurrence ?? null,
      debtor: { id: debtor.id, name: debtor.name, avatarHue: debtor.avatarHue, avatarEmoji: debtor.avatarEmoji },
    },
  }
}

/** When a monthly debt ends: its end from the charges that exist and the end chosen. */
export function debtRecurrenceEnd(d: DebtWithInstallments) {
  return recurrenceEnd(d.installments.map((i) => i.dueDate.slice(0, 10)), d.recurrenceDay, {
    occurrences: d.recurrenceOccurrences,
    endsAt: d.recurrenceEndsAt,
  })
}

/** "sem fim", "até 10/04/2027", "última em 10/12/2026", "terminou em 10/10/2026". */
export function recurrenceEndLabel(d: DebtWithInstallments, today: string): string {
  const { last, remaining } = debtRecurrenceEnd(d)
  if (!last) return 'sem fim'
  if (remaining) return `até ${fmtBR(last)}`
  return last < today ? `terminou em ${fmtBR(last)}` : `última em ${fmtBR(last)}`
}
