import { useMutation, useQueryClient } from '@tanstack/react-query'
import { installmentsApi } from '../../api/installments.api'

export function useDeletePayment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ installmentId, paymentId }: { installmentId: string; paymentId: string }) =>
      installmentsApi.deletePayment(installmentId, paymentId).then((r) => r.data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['installments'] })
      void qc.invalidateQueries({ queryKey: ['debts'] })
      void qc.invalidateQueries({ queryKey: ['dashboard'] })
      void qc.invalidateQueries({ queryKey: ['debtors'] })
    },
  })
}
