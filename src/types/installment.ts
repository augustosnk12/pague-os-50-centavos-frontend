import type { Payment } from './payment'

export type InstallmentStatus = 'PENDING' | 'PAID' | 'OVERDUE' | 'PARTIALLY_PAID'

export interface Installment {
  id: string
  number: number
  amount: string
  paidAmount: string
  dueDate: string
  paidAt: string | null
  status: InstallmentStatus
  debtId: string
  payments?: Payment[]
}

// Enriched form returned by GET /installments — backend joins debt+debtor for display
export interface InstallmentEnriched extends Installment {
  debt: {
    id: string
    description: string | null
    type: string
    debtorId: string
    debtor?: {
      id: string
      name: string
    }
  }
}
