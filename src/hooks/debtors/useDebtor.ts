import { useQuery } from '@tanstack/react-query'
import { debtorsApi } from '../../api/debtors.api'

export function useDebtor(id: string) {
  return useQuery({
    queryKey: ['debtors', id],
    queryFn: () => debtorsApi.get(id).then((r) => r.data),
    enabled: !!id,
  })
}
