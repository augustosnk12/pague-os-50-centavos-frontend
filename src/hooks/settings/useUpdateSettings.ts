import { useMutation, useQueryClient } from '@tanstack/react-query'
import { settingsApi, type LenderSettings } from '../../api/settings.api'

/** PUT /settings: only the fields sent change; the answer replaces the cached settings. */
export function useUpdateSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<LenderSettings>) => settingsApi.update(data).then((r) => r.data),
    onSuccess: (s) => qc.setQueryData(['settings'], s),
  })
}
