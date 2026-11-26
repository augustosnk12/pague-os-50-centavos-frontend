import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { debtsApi, type CreateSplitPayload } from '../../api/debts.api'

/** A split touches several debtors: refresh every list and their debts. */
function refresh(qc: QueryClient) {
  void qc.invalidateQueries({ queryKey: ['debtors'] })
  void qc.invalidateQueries({ queryKey: ['debts'] })
  void qc.invalidateQueries({ queryKey: ['dashboard'] })
  void qc.invalidateQueries({ queryKey: ['installments'] })
}

/** POST /debts/split (item 66): one debt per person, all or nothing. */
export function useSplitDebt() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateSplitPayload) => debtsApi.split(data).then((r) => r.data),
    onSuccess: () => refresh(qc),
  })
}

/** "Desfazer" of a split: removes all its debts (422 when any has a payment). */
export function useDeleteSplit() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (splitId: string) => debtsApi.deleteSplit(splitId).then((r) => r.data),
    onSuccess: () => refresh(qc),
  })
}
