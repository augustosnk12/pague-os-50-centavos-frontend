import { useQuery } from '@tanstack/react-query'
import { meApi } from '../../api/me.api'

/**
 * Counts of the account (first use, improvement 48). Keyed under ['dashboard']
 * so creating a debt (which invalidates ['dashboard']) refreshes it.
 */
export function useAccountSummary({ enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: ['dashboard', 'account-summary'],
    queryFn: () => meApi.summary().then((r) => r.data),
    enabled,
  })
}
