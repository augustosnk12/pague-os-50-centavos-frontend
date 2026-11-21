import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { paymentsApi, type ReportPayment } from '../../api/payments.api'
import type { Bounds } from '../../lib/receivables'

/*
 * Recebimentos (S12). Keyed under ['dashboard'] so registering, undoing or
 * deleting a payment (which invalidate ['dashboard']) refreshes the report.
 */

export function usePaymentsSummary(bounds: Bounds | null, today: string, { enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: ['dashboard', 'payments-summary', bounds?.from ?? null, bounds?.to ?? null, today],
    queryFn: () => paymentsApi.summary({ ...bounds, today }).then((r) => r.data),
    enabled: enabled && !!bounds,
    placeholderData: keepPreviousData,
  })
}

/** The newest `limit` payments of the period (the list under the bars). */
export function useRecentPayments(bounds: Bounds | null, limit: number) {
  return useQuery({
    queryKey: ['dashboard', 'payments-list', bounds?.from ?? null, bounds?.to ?? null, limit],
    queryFn: () => paymentsApi.list({ ...bounds, limit }).then((r) => r.data),
    enabled: !!bounds,
    placeholderData: keepPreviousData,
  })
}

/** Every payment of the period, page after page (for the CSV). */
export async function fetchAllPayments(bounds: Bounds): Promise<ReportPayment[]> {
  const out: ReportPayment[] = []
  let cursor: string | undefined
  for (let guard = 0; guard < 200; guard++) {
    const r = await paymentsApi.list({ ...bounds, limit: 500, cursor })
    out.push(...r.data)
    cursor = (r.headers?.['x-next-cursor'] as string | undefined) || undefined
    if (!cursor) break
  }
  return out
}
