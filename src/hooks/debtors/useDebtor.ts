import { useQuery } from '@tanstack/react-query'
import { debtorsApi } from '../../api/debtors.api'

/** People change little: 5 minutes before refetching (improvement 43); edits invalidate it. */
export const DEBTORS_STALE = 5 * 60_000

export const debtorQuery = (id: string) => ({
  queryKey: ['debtors', id],
  queryFn: () => debtorsApi.get(id).then((r) => r.data),
  staleTime: DEBTORS_STALE,
})

export function useDebtor(id: string) {
  return useQuery({ ...debtorQuery(id), enabled: !!id })
}
