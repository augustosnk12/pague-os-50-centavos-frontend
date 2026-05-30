export type DebtType = 'CASH' | 'CREDIT_CARD' | 'PIX' | 'PIX_INSTALLMENT'

export interface Debt {
  id: string
  description: string | null
  type: DebtType
  totalAmount: string
  debtorId: string
  createdAt: string
}
