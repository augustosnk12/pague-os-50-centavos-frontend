import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { planApi } from '../../api/plan.api'

/**
 * Plan, limits and usage (melhoria 62). Keyed under ['debtors'] so creating or
 * deleting a debtor or a debt (which invalidate ['debtors']) refreshes it.
 */
export const PLAN_KEY = ['debtors', 'me-plan'] as const

export function usePlan() {
  return useQuery({
    queryKey: PLAN_KEY,
    queryFn: () => planApi.mine().then((r) => r.data),
    staleTime: 60_000,
  })
}

export function useRequestLimit() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => planApi.requestLimit().then((r) => r.data),
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: PLAN_KEY })
    },
  })
}
