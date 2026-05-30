import { useMutation, useQueryClient } from '@tanstack/react-query'
import { debtsApi } from '../../api/debts.api'

export function useDeleteDebt(debtorId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => debtsApi.delete(id).then((r) => r.data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['debts', debtorId] })
      void qc.invalidateQueries({ queryKey: ['dashboard'] })
      void qc.invalidateQueries({ queryKey: ['installments'] })
    },
  })
}
