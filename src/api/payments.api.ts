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

export const paymentsApi = {
  batch: (body: BatchBody) => api.post<BatchResponse>('/payments/batch', body),
  /** Undoes a whole batch ("Desfazer"). */
  undoBatch: (batchId: string) => api.delete<{ installments: Installment[] }>(`/payments/batch/${batchId}`),
}
