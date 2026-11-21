import { useQuery } from '@tanstack/react-query'
import { api } from '../../lib/axios'
import type { Debt } from '../../types/debt'
import type { Installment } from '../../types/installment'

export interface DebtWithInstallments extends Debt {
  installments: Installment[]
}

/** GET /debtors/:id/debts — debts with their installments (also used to prefetch a profile). */
export const debtsByDebtorQuery = (debtorId: string) => ({
  queryKey: ['debts', debtorId],
  queryFn: async () => (await api.get<DebtWithInstallments[]>(`/debtors/${debtorId}/debts`)).data,
})

export function useDebtsByDebtor(debtorId: string) {
  return useQuery({ ...debtsByDebtorQuery(debtorId), enabled: !!debtorId })
}
