import { api } from '../lib/axios'

/** GET /me/summary (API B12): how much the account has. */
export interface AccountSummary {
  debtors: number
  debts: number
  installments: number
  payments: number
}

export const meApi = {
  summary: () => api.get<AccountSummary>('/me/summary'),
}
