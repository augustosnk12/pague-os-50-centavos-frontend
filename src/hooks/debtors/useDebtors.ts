import { useQuery } from '@tanstack/react-query'
import { debtorsApi } from '../../api/debtors.api'

export function useDebtors() {
  return useQuery({
    queryKey: ['debtors'],
    queryFn: () => debtorsApi.list().then((r) => r.data),
  })
}
