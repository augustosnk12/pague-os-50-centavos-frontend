/**
 * "Dividir uma conta com várias pessoas" (item 66): each person's part and how
 * it is split into installments, by the same rule as `genInstallments` and the
 * API (each installment rounded, the difference on the 1st).
 */
import { fmtMoney } from './format'

/** The API takes up to 20 people (the lender's own part is not a debt). */
export const SPLIT_MAX_PEOPLE = 20

export type SplitMode = 'equal' | 'custom'

export interface Share {
  id: string
  cents: number
}

/** Equal parts: the cents left over go to the first people (never to "Você"). */
export function equalShares(totalCents: number, ids: string[], withMe: boolean): Share[] {
  const people = ids.length + (withMe ? 1 : 0)
  if (!people) return []
  const base = Math.floor(totalCents / people)
  const left = totalCents - base * people
  return ids.map((id, k) => ({ id, cents: base + (k < left ? 1 : 0) }))
}

/** First installment and the others, in cents (rounded, difference on the 1st). */
export function splitInstallment(cents: number, n: number): { first: number; rest: number } {
  const count = Math.max(1, n)
  const rest = Math.round(cents / count)
  return { first: cents - rest * (count - 1), rest }
}

/** "à vista", "3× R$ 26,67", "R$ 26,66 + 2× R$ 26,67" or "R$ 80,00 por mês". */
export function shareInstallments(cents: number, n: number, monthly: boolean): string {
  if (monthly) return `${fmtMoney(cents / 100)} por mês`
  if (n < 2) return 'à vista'
  const { first, rest } = splitInstallment(cents, n)
  return first === rest ? `${n}× ${fmtMoney(rest / 100)}` : `${fmtMoney(first / 100)} + ${n - 1}× ${fmtMoney(rest / 100)}`
}

export interface SplitCheck {
  shares: Share[]
  /** Sum of the debtors' parts. */
  sum: number
  /** What is left for "Você" (0 or more when it adds up). */
  mine: number
  /** The first part smaller than 1 cent per installment. */
  tiny: Share | null
  /** Why it cannot be created yet, or null. */
  problem: 'tiny' | 'over' | 'short' | 'empty' | null
}

/**
 * The parts and whether they work: every part filled and at least 1 cent per
 * installment; "Valores diferentes" must add up to the total, or leave the
 * rest to "Você" when the lender also takes part.
 */
export function checkSplit(opts: {
  totalCents: number
  ids: string[]
  withMe: boolean
  mode: SplitMode
  custom: Record<string, string>
  installments: number
}): SplitCheck {
  const { totalCents, ids, withMe, mode, custom } = opts
  const n = Math.max(1, opts.installments)
  const shares = mode === 'custom' ? ids.map((id) => ({ id, cents: parseInt(custom[id] || '0', 10) || 0 })) : equalShares(totalCents, ids, withMe)
  const sum = shares.reduce((s, x) => s + x.cents, 0)
  const tiny = shares.find((x) => x.cents > 0 && x.cents < n) ?? null
  let problem: SplitCheck['problem'] = null
  if (mode === 'custom' && shares.some((x) => !x.cents)) problem = 'empty'
  else if (tiny || (mode === 'equal' && shares.some((x) => !x.cents))) problem = 'tiny'
  else if (mode === 'custom' && sum > totalCents) problem = 'over'
  else if (mode === 'custom' && !withMe && sum !== totalCents) problem = 'short'
  return { shares, sum, mine: totalCents - sum, tiny: tiny ?? (problem === 'tiny' ? shares.find((x) => !x.cents) ?? null : null), problem }
}
