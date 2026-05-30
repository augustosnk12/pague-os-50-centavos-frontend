import { api } from '../lib/axios'
import type { Installment, InstallmentEnriched } from '../types/installment'

export type InstallmentPeriod = 'day' | 'week' | 'month'

export interface GetInstallmentsParams {
  period: InstallmentPeriod
  date: string
  debtorId?: string
}

export const installmentsApi = {
  list: (params: GetInstallmentsParams) =>
    api.get<InstallmentEnriched[]>('/installments', { params }),

  markAsPaid: (id: string) =>
    api.put<Installment>(`/installments/${id}`),
}
