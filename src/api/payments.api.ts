import { api } from '../lib/axios'
import type { Installment } from '../types/installment'
import type { Payment } from '../types/payment'

/** POST /payments/batch (API B7): all-or-nothing in one transaction. */
export interface BatchBody {
  debtorId: string
  /** BATCH: any installments of one debtor. PAYOFF: every open installment of one debt, each for what is left. */
  kind: 'BATCH' | 'PAYOFF'
  paidAt: string
  allocations: { installmentId: string; amount: number }[]
}

export interface BatchResponse {
  batchId: string
  kind: 'BATCH' | 'PAYOFF'
  installments: Installment[]
  payments: (Payment & { installmentId: string })[]
}

/** One received payment (GET /payments, API B9), newest first. */
export interface ReportPayment {
  id: string
  amount: string
  paidAt: string
  batchId: string | null
  batchKind: 'BATCH' | 'PAYOFF' | null
  installmentId: string
  installmentNumber: number
  installmentsCount: number
  debtId: string
  debtDescription: string | null
  /** Newer API only: 'MONTHLY' for a recurring charge. */
  debtRecurrence?: 'MONTHLY' | null
  debtorId: string
  debtorName: string
}

/** GET /payments/summary: totals and one bar per month (empty months included). */
export interface PaymentsSummary {
  from: string | null
  to: string | null
  total: string
  count: number
  averagePerMonth: string
  months: { month: string; total: string; count: number }[]
}

export interface ReportPeriodParams {
  /** YYYY-MM-DD inclusive; omitted = since the first payment. */
  from?: string
  /** YYYY-MM-DD inclusive. */
  to?: string
}

export const paymentsApi = {
  list: (params: ReportPeriodParams & { limit?: number; cursor?: string }) =>
    api.get<ReportPayment[]>('/payments', { params }),
  summary: (params: ReportPeriodParams & { today: string }) => api.get<PaymentsSummary>('/payments/summary', { params }),
  batch: (body: BatchBody) => api.post<BatchResponse>('/payments/batch', body),
  /** Undoes a whole batch ("Desfazer"). */
  undoBatch: (batchId: string) => api.delete<{ installments: Installment[] }>(`/payments/batch/${batchId}`),
}
