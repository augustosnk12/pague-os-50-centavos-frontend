/**
 * Calculadora de parcelas (public page, issue #7). Without interest it splits
 * exactly like the app and the API (genInstallments: total / n rounded to the
 * cent, installment #1 takes the difference, days 29–31 fall on the last day
 * of shorter months). With a monthly rate it uses the Price table (fixed
 * installment), as stores and banks do.
 */
import { genInstallments } from './utils'

export const MAX_INSTALLMENTS = 120
export const MAX_RATE = 30 // % a.m.

export interface CalcRow {
  number: number
  dueDate: string // YYYY-MM-DD
  cents: number
}

export interface CalcResult {
  rows: CalcRow[]
  totalCents: number
  interestCents: number
}

/** Fixed installment of the Price table, in cents (rate in % per month). */
export function priceInstallment(principalCents: number, count: number, ratePct: number): number {
  const i = ratePct / 100
  if (i <= 0) return Math.round(principalCents / count)
  return Math.round((principalCents * i) / (1 - Math.pow(1 + i, -count)))
}

/** Rate typed in pt-BR ("2,5") → number, or NaN. */
export function parseRate(text: string): number {
  const t = text.trim().replace(/\s|%/g, '').replace(',', '.')
  if (!t) return 0
  return /^\d+(\.\d+)?$/.test(t) ? Number(t) : NaN
}

export function calcInstallments(principalCents: number, count: number, firstDue: string, ratePct = 0): CalcResult | null {
  if (!(principalCents > 0) || !Number.isInteger(count) || count < 1 || count > MAX_INSTALLMENTS) return null
  if (!/^\d{4}-\d{2}-\d{2}$/.test(firstDue) || !(ratePct >= 0) || ratePct > MAX_RATE) return null
  const base = genInstallments(principalCents / 100, count, `${firstDue}T00:00:00.000Z`)
  if (base.length === 0) return null
  const fixed = ratePct > 0 ? priceInstallment(principalCents, count, ratePct) : null
  const rows = base.map((p) => ({
    number: p.number,
    dueDate: p.dueDate.slice(0, 10),
    cents: fixed ?? Math.round(Number(p.amount) * 100),
  }))
  const totalCents = rows.reduce((s, r) => s + r.cents, 0)
  return { rows, totalCents, interestCents: totalCents - principalCents }
}
