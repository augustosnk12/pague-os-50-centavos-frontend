export interface Payment {
  id: string
  amount: string
  paidAt: string
  /** UI v2 (API B7): payments registered together share a batch. */
  batchId?: string | null
  batchKind?: 'BATCH' | 'PAYOFF' | null
}
