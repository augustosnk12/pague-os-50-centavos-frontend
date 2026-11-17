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
  /** Seus dados (API B12): a .zip with one CSV per subject, or the full JSON. */
  export: (format: 'zip' | 'json') => api.get<Blob>('/me/export', { params: { format }, responseType: 'blob' }),
  /** E-mails a code to confirm the deletion. */
  deleteCode: () => api.post<{ message: string }>('/me/delete-code'),
  /** Deletes the account and everything in it (needs the e-mailed code). */
  deleteAccount: (code: string) => api.delete<{ message: string }>('/me', { data: { code } }),
}
