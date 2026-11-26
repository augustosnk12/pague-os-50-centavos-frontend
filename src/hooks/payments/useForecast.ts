import { useQueries } from '@tanstack/react-query'
import { installmentsApi } from '../../api/installments.api'
import { debtsByDebtorQuery } from '../debts/useDebtsByDebtor'
import { useDashboardOverview } from '../dashboard/useDashboardOverview'
import { buildForecast, forecastMonths, type Forecast } from '../../lib/forecast'

/**
 * Previsão (improvement 69), front only: the installments of each of the next 6
 * months (same endpoint as Parcelas, under ['installments'] so payments refresh
 * it), the overdue total of the Painel, and — only for people with a monthly
 * recurring debt in the window — their debts, to project the months not yet created.
 */
export function useForecast(today: string, enabled = true) {
  const months = forecastMonths(today)
  const monthQs = useQueries({
    queries: months.map((m) => ({
      queryKey: ['installments', 'forecast', m, today],
      queryFn: () => installmentsApi.list({ period: 'month', date: `${m}-01`, today }).then((r) => r.data),
      enabled,
    })),
  })
  const overview = useDashboardOverview(today)
  const installments = monthQs.flatMap((q) => q.data ?? [])
  const recurringDebtors = [...new Set(installments.filter((i) => i.debt?.recurrence === 'MONTHLY').map((i) => i.debt.debtorId))].sort()
  const debtQs = useQueries({
    queries: recurringDebtors.map((id) => ({ ...debtsByDebtorQuery(id), enabled })),
  })

  const all = [...monthQs, ...debtQs]
  const loading = all.some((q) => q.isPending) || (overview.isPending && !overview.data)
  const failed = all.some((q) => q.isError && !q.data) || (overview.isError && !overview.data)
  const data: Forecast | undefined = loading
    ? undefined
    : buildForecast({
        today,
        installments,
        recurringDebts: debtQs.flatMap((q) => q.data ?? []).filter((d) => d.recurrence === 'MONTHLY'),
      })
  const overdue = overview.data ? { cents: Math.round(Number(overview.data.overdue.amount) * 100), count: overview.data.overdue.count } : undefined

  return {
    data,
    overdue,
    failed,
    retry: () => {
      for (const q of all) void q.refetch()
      void overview.refetch()
    },
    retrying: all.some((q) => q.isFetching) || overview.isFetching,
  }
}
