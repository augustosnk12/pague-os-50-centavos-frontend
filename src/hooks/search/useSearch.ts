import { useEffect, useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { searchApi, type SearchResult } from '../../api/search.api'
import { normalizeTerm } from '../../lib/searchMatch'

export const SEARCH_MIN = 2

/**
 * Global search (improvement 21). Waits for a short pause in typing before
 * asking the API, and keeps the last results on screen while the next arrive.
 */
export function useSearch(q: string, { delay = 250, limit = 8 }: { delay?: number; limit?: number } = {}) {
  // "Inglês", "ingles " and "INGLES" are the same search (one request, one cache entry).
  const term = normalizeTerm(q)
  const [debounced, setDebounced] = useState(term)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(term), delay)
    return () => clearTimeout(t)
  }, [term, delay])
  const enabled = debounced.length >= SEARCH_MIN
  const query = useQuery<SearchResult>({
    queryKey: ['search', debounced, limit],
    // A newer term cancels the request still on its way (TanStack passes the signal).
    queryFn: ({ signal }) => searchApi.search(debounced, limit, signal).then((r) => r.data),
    enabled,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  })
  return {
    ...query,
    data: enabled && term.length >= SEARCH_MIN ? query.data : undefined,
    active: term.length >= SEARCH_MIN,
    /** The answer for exactly what is typed has arrived (so "nothing found" is true). */
    settled: debounced === term && enabled && !query.isFetching,
  }
}
