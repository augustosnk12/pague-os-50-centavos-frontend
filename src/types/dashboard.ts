export interface DashboardData {
  month: string
  totalExpected: string
  totalReceived: string
  totalPending: string
  totalOverdue: string
  counts: {
    paid: number
    pending: number
    overdue: number
    total: number
  }
}
