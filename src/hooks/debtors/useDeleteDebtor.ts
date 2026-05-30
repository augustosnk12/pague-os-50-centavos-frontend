import { useMutation, useQueryClient } from '@tanstack/react-query'
import { debtorsApi } from '../../api/debtors.api'

export function useDeleteDebtor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => debtorsApi.delete(id).then((r) => r.data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['debtors'] })
      void qc.invalidateQueries({ queryKey: ['dashboard'] })
      void qc.invalidateQueries({ queryKey: ['installments'] })
    },
  })
}
