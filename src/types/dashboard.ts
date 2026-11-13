import type { InstallmentEnriched } from './installment'


/** GET /dashboard/overview (API B4): the Painel in one call. Money as "0.00". */
export interface DashboardOverview {
  today: string
  month: { key: string; expected: string; received: string; remaining: string; receivedPct: number }
  overdue: { amount: string; count: number; fromPreviousMonths: { amount: string; count: number } }
  attention: { overdue: InstallmentEnriched[]; today: InstallmentEnriched[]; next7: InstallmentEnriched[] }
  counts: { overdue: number; today: number; next7: number }
}
