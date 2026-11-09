import { useQuery } from '@tanstack/react-query'
import { dashboardApi } from '../../api/dashboard.api'
import { localToday } from '../../lib/date'

/**
 * Painel data (improvements 1–5). Keyed under ['dashboard'] so every payment
 * / debt mutation (which invalidates ['dashboard']) refreshes it.
 */
export function useDashboardOverview(today: string = localToday()) {
  return useQuery({
    queryKey: ['dashboard', 'overview', today],
    queryFn: () => dashboardApi.overview(today).then((r) => r.data),
  })
}
