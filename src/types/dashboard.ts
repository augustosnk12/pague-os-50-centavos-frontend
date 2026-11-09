import type { InstallmentEnriched } from './installment'
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


/** GET /dashboard/overview (API B4): the Painel in one call. Money as "0.00". */
export interface DashboardOverview {
  today: string
  month: { key: string; expected: string; received: string; remaining: string; receivedPct: number }
  overdue: { amount: string; count: number; fromPreviousMonths: { amount: string; count: number } }
  attention: { overdue: InstallmentEnriched[]; today: InstallmentEnriched[]; next7: InstallmentEnriched[] }
  counts: { overdue: number; today: number; next7: number }
}
