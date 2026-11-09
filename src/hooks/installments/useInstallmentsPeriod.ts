import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { installmentsApi } from '../../api/installments.api'
import type { Period } from '../../lib/installmentsView'

/**
 * Parcelas (S3): the period plus every overdue installment from before it
 * (improvement 13), in one call. The previous period stays on screen while
 * the next one loads, so the list does not flash when using the arrows.
 */
export function useInstallmentsPeriod({ period, date, today }: { period: Period; date: string; today: string }) {
  return useQuery({
    queryKey: ['installments', 'v2', period, date, today],
    queryFn: () => installmentsApi.list({ period, date, today, includeOverdueBefore: true }).then((r) => r.data),
    placeholderData: keepPreviousData,
  })
}
