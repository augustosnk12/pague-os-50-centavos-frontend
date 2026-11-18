/**
 * "Recentes" of the debtor picker (S8): who got a debt on this device lately.
 * Browser storage is only a per-device convenience: without it the order
 * falls back to the newest debtors.
 */
import type { Debtor } from '../types/debtor'

const KEY = 'lt-recent-debtors'

function read(): string[] {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}

export function rememberDebtor(id: string) {
  try {
    localStorage.setItem(KEY, JSON.stringify([id, ...read().filter((x) => x !== id)].slice(0, 12)))
  } catch {
    /* private mode / blocked storage */
  }
}

/** Recent first, then the newest debtors. */
export function byRecent(debtors: Debtor[]): Debtor[] {
  const recent = read()
  const rank = (d: Debtor) => {
    const i = recent.indexOf(d.id)
    return i === -1 ? Infinity : i
  }
  return [...debtors].sort((a, b) => rank(a) - rank(b) || (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0))
}
