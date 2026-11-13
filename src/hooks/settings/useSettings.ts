import { useQuery } from '@tanstack/react-query'
import { settingsApi } from '../../api/settings.api'

export function useSettings({ enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsApi.get().then((r) => r.data),
    staleTime: 5 * 60_000,
    enabled,
  })
}
