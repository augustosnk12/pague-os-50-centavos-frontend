import { api } from '../lib/axios'
import type { Installment, InstallmentEnriched } from '../types/installment'
import type { Payment } from '../types/payment'

export type InstallmentPeriod = 'day' | 'week' | 'month'

export interface GetInstallmentsParams {
  period: InstallmentPeriod
  date: string
  debtorId?: string
}

export interface RegisterPaymentBody {
  amount: number
  paidAt: string
}

export interface RegisterPaymentResponse {
  installment: Installment
  payment: Payment
}

export const installmentsApi = {
  list: (params: GetInstallmentsParams) =>
    api.get<InstallmentEnriched[]>('/installments', { params }),

  markAsPaid: (id: string) =>
    api.put<Installment>(`/installments/${id}`),

  registerPayment: (id: string, body: RegisterPaymentBody) =>
    api.post<RegisterPaymentResponse>(`/installments/${id}/payments`, body),

  deletePayment: (installmentId: string, paymentId: string) =>
    api.delete<Installment>(`/installments/${installmentId}/payments/${paymentId}`),
}
