import { useQuery } from '@tanstack/react-query'
import { api } from '../../lib/axios'
import type { Debt } from '../../types/debt'
import type { Installment } from '../../types/installment'

export interface DebtWithInstallments extends Debt {
  installments: Installment[]
}

// GET /debtors/:id/debts — returns debts with their installments
export function useDebtsByDebtor(debtorId: string) {
  return useQuery({
    queryKey: ['debts', debtorId],
    queryFn: async () => {
      const res = await api.get<DebtWithInstallments[]>(`/debtors/${debtorId}/debts`)
      return res.data
    },
    enabled: !!debtorId,
  })
}
