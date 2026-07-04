import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { debtorsApi } from '../../api/debtors.api'
import type { DebtorReliability } from '../../types/debtor'

export function useDebtors(reliability?: DebtorReliability) {
  return useQuery({
    queryKey: ['debtors', reliability ?? null],
    queryFn: () => debtorsApi.list(reliability).then((r) => r.data),
    // Keep the current list visible while switching reliability filters,
    // so the filter chips don't flash the full-page loading state.
    placeholderData: keepPreviousData,
  })
}
