import { useMutation, useQueryClient } from '@tanstack/react-query'
import { installmentsApi } from '../../api/installments.api'

export function useMarkAsPaid() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => installmentsApi.markAsPaid(id).then((r) => r.data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['installments'] })
      void qc.invalidateQueries({ queryKey: ['debts'] })
      void qc.invalidateQueries({ queryKey: ['dashboard'] })
      void qc.invalidateQueries({ queryKey: ['debtors'] })
    },
  })
}
