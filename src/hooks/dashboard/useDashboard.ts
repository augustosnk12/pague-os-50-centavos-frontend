import { useQuery } from '@tanstack/react-query'
import { dashboardApi } from '../../api/dashboard.api'

export function useDashboard(month: string) {
  return useQuery({
    queryKey: ['dashboard', month],
    queryFn: () => dashboardApi.get(month).then((r) => r.data),
    enabled: !!month,
  })
}
