import { useMutation, useQueryClient } from '@tanstack/react-query'
import { installmentsApi, type RegisterPaymentBody } from '../../api/installments.api'

export function useRegisterPayment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: RegisterPaymentBody }) =>
      installmentsApi.registerPayment(id, body).then((r) => r.data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['installments'] })
      void qc.invalidateQueries({ queryKey: ['debts'] })
      void qc.invalidateQueries({ queryKey: ['dashboard'] })
      void qc.invalidateQueries({ queryKey: ['debtors'] })
    },
  })
}
