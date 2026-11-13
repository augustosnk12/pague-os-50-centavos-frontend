export type DebtType = 'CASH' | 'CREDIT_CARD' | 'PIX' | 'PIX_INSTALLMENT'

export interface Debt {
  id: string
  description: string | null
  type: DebtType
  totalAmount: string
  debtorId: string
  createdAt: string
  /** UI v2: monthly recurrence (API B6). */
  recurrence?: 'MONTHLY' | null
  recurrenceDay?: number | null
  recurrenceActive?: boolean
}
