import { useQuery } from '@tanstack/react-query'
import { installmentsApi, type GetInstallmentsParams } from '../../api/installments.api'

export function useInstallmentsByPeriod(params: GetInstallmentsParams) {
  return useQuery({
    queryKey: ['installments', params.period, params.date, params.debtorId ?? null],
    queryFn: () => installmentsApi.list(params).then((r) => r.data),
  })
}
