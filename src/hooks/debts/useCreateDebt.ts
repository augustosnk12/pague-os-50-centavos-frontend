import { useMutation, useQueryClient } from '@tanstack/react-query'
import { debtsApi, type CreateDebtPayload } from '../../api/debts.api'

export function useCreateDebt() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateDebtPayload) => debtsApi.create(data).then((r) => r.data),
    onSuccess: (_data, variables) => {
      void qc.invalidateQueries({ queryKey: ['debtors'] })
      void qc.invalidateQueries({ queryKey: ['debts', variables.debtorId] })
      void qc.invalidateQueries({ queryKey: ['dashboard'] })
      void qc.invalidateQueries({ queryKey: ['installments'] })
    },
  })
}
