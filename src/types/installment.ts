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
    /** Since API 1.3 (S1); absent on older APIs. */
    installmentCount?: number | null
    recurrence?: 'MONTHLY' | null
    debtor?: {
      id: string
      name: string
      avatarHue: number | null
      avatarEmoji: string | null
    }
  }
}
