import { useMutation, useQueryClient } from '@tanstack/react-query'
import { debtorsApi, type UpdateDebtorPayload } from '../../api/debtors.api'

export function useUpdateDebtor(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: UpdateDebtorPayload) => debtorsApi.update(id, data).then((r) => r.data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['debtors'] })
    },
  })
}
