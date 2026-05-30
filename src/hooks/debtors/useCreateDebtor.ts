import { useMutation, useQueryClient } from '@tanstack/react-query'
import { debtorsApi, type CreateDebtorPayload } from '../../api/debtors.api'

export function useCreateDebtor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateDebtorPayload) => debtorsApi.create(data).then((r) => r.data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['debtors'] })
    },
  })
}
