import type { SearchResult } from '../api/search.api'

export type SearchHit =
  | { kind: 'debtor'; id: string; to: string; hit: SearchResult['debtors'][number] }
  | { kind: 'debt'; id: string; to: string; hit: SearchResult['debts'][number] }
  | { kind: 'all'; id: string; to: string; term: string }

/** Debtors first, then debts; a debt opens its debtor with that debt expanded. */
export function searchHits(data: SearchResult | undefined, term = '', limit = 8): SearchHit[] {
  if (!data) return []
  const full = data.debtors.length >= limit || data.debts.length >= limit
  return [
    ...data.debtors.map((h) => ({ kind: 'debtor' as const, id: `sr-d-${h.id}`, to: `/debtors/${h.id}`, hit: h })),
    ...data.debts.map((h) => ({ kind: 'debt' as const, id: `sr-x-${h.id}`, to: `/debtors/${h.debtorId}?divida=${h.id}`, hit: h })),
    ...(full && term ? [{ kind: 'all' as const, id: 'sr-all', to: `/debtors?q=${encodeURIComponent(term)}`, term }] : []),
  ]
}
