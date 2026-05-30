import { useMutation, useQueryClient } from '@tanstack/react-query'
import { debtsApi, type UpdateDebtPayload } from '../../api/debts.api'

export function useUpdateDebt(debtorId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateDebtPayload }) =>
      debtsApi.update(id, data).then((r) => r.data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['debts', debtorId] })
    },
  })
}
