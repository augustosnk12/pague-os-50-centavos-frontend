import type { InstallmentEnriched } from '../types/installment'
import type { DebtWithInstallments } from '../hooks/debts/useDebtsByDebtor'

/**
 * Previsão (improvement 69): what is still coming in over the next 6 months.
 * Pure, so the screen and the tests agree. Amounts in cents.
 *
 * - Counts the open part of every installment due from today to the end of the
 *   6th month. Overdue ones stay out (the screen shows them on a line of their own).
 * - Monthly recurring debts only ever have ONE future installment (API B6): the
 *   months after it are projected with the API's own rule (same day, clamped to
 *   the month's last day; ends after N charges or on a date).
 */
export const FORECAST_MONTHS = 6

export interface ForecastPerson {
  id: string
  name: string
  avatarHue: number | null
  avatarEmoji: string | null
  cents: number
  count: number
  /** Last due date in the window (YYYY-MM-DD). */
  last: string
}

export interface Forecast {
  months: { month: string; cents: number }[]
  totalCents: number
  /** Part of the total that comes from monthly recurring debts (generated or projected). */
  recurringCents: number
  count: number
  people: ForecastPerson[]
}

const cents = (v: string | number) => Math.round(Number(v) * 100)

/** "2026-11-26" → ["2026-11", …] (6 months, starting with today's). */
export function forecastMonths(today: string): string[] {
  const [y, m] = today.split('-').map(Number)
  return Array.from({ length: FORECAST_MONTHS }, (_, k) => {
    const d = new Date(Date.UTC(y, m - 1 + k, 1))
    return d.toISOString().slice(0, 7)
  })
}

/** Same day next month (UTC), clamped to the month's last day — as the API's nextMonthlyDueDate. */
export function nextMonthlyDue(previous: string, day: number): string {
  const [y, m] = previous.slice(0, 10).split('-').map(Number)
  const last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate()
  return new Date(Date.UTC(y, m, Math.min(day, last))).toISOString().slice(0, 10)
}

/** Due dates (YYYY-MM-DD) a recurring debt will still create up to `untilMonth` (inclusive). */
export function projectRecurring(debt: DebtWithInstallments, untilMonth: string): string[] {
  if (debt.recurrence !== 'MONTHLY' || !debt.recurrenceActive || !debt.installments.length) return []
  const day = debt.recurrenceDay ?? Number(debt.installments[0].dueDate.slice(8, 10))
  let last = debt.installments.map((i) => i.dueDate.slice(0, 10)).sort().at(-1)!
  let count = debt.installments.length
  const endsAt = debt.recurrenceEndsAt ? debt.recurrenceEndsAt.slice(0, 10) : null
  const out: string[] = []
  for (let guard = 0; guard < 24; guard++) {
    if (debt.recurrenceOccurrences != null && count >= debt.recurrenceOccurrences) break
    const next = nextMonthlyDue(last, day)
    if (next.slice(0, 7) > untilMonth) break
    if (endsAt && next > endsAt) break
    out.push(next)
    last = next
    count++
  }
  return out
}

export function buildForecast({
  today,
  installments,
  recurringDebts,
}: {
  today: string
  /** Installments of the 6 months (any status; duplicates are ignored). */
  installments: InstallmentEnriched[]
  /** Monthly recurring debts that appear in the window, with all their installments. */
  recurringDebts: DebtWithInstallments[]
}): Forecast {
  const months = forecastMonths(today)
  const first = months[0]
  const lastMonth = months[months.length - 1]
  const byMonth = new Map(months.map((m) => [m, 0]))
  const people = new Map<string, ForecastPerson>()
  let recurringCents = 0
  let count = 0

  const add = (who: InstallmentEnriched['debt']['debtor'] | undefined, debtorId: string, due: string, value: number, recurring: boolean) => {
    const month = due.slice(0, 7)
    if (value <= 0 || month < first || month > lastMonth) return
    byMonth.set(month, (byMonth.get(month) ?? 0) + value)
    if (recurring) recurringCents += value
    count++
    const p = people.get(debtorId) ?? {
      id: debtorId,
      name: who?.name ?? '',
      avatarHue: who?.avatarHue ?? null,
      avatarEmoji: who?.avatarEmoji ?? null,
      cents: 0,
      count: 0,
      last: due,
    }
    p.cents += value
    p.count++
    if (due > p.last) p.last = due
    people.set(debtorId, p)
  }

  const seen = new Set<string>()
  const whoByDebt = new Map<string, InstallmentEnriched['debt']>()
  for (const i of installments) {
    if (seen.has(i.id)) continue
    seen.add(i.id)
    if (i.debt) whoByDebt.set(i.debt.id, i.debt)
    const due = i.dueDate.slice(0, 10)
    if (due < today) continue // overdue: on its own line
    add(i.debt?.debtor, i.debt?.debtorId ?? '', due, cents(i.amount) - cents(i.paidAmount), i.debt?.recurrence === 'MONTHLY')
  }

  for (const d of recurringDebts) {
    const who = whoByDebt.get(d.id)
    for (const due of projectRecurring(d, lastMonth)) add(who?.debtor, d.debtorId, due, cents(d.totalAmount), true)
  }

  const monthsOut = months.map((month) => ({ month, cents: byMonth.get(month) ?? 0 }))
  return {
    months: monthsOut,
    totalCents: monthsOut.reduce((s, m) => s + m.cents, 0),
    recurringCents,
    count,
    people: [...people.values()].sort((a, b) => b.cents - a.cents || a.name.localeCompare(b.name)),
  }
}
