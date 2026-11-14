import { api } from '../lib/axios'
import type { Debt, DebtType } from '../types/debt'
import type { Installment } from '../types/installment'

export interface CreateDebtPayload {
  debtorId: string
  type: DebtType
  totalAmount: string
  numberOfInstallments?: number
  firstDueDate: string
  description?: string | null
  /** Monthly recurrence (API B6, CASH or PIX): totalAmount is then the amount per month. */
  recurrence?: { type: 'MONTHLY'; occurrences: number | null; endsAt: string | null } | null
  /** The user's day (YYYY-MM-DD), so the first monthly charge is generated on the right day. */
  today?: string
}

export interface UpdateDebtPayload {
  description?: string | null
  type?: DebtType
}

export interface CreateDebtResponse {
  debt: Debt
  installments: Installment[]
}

export const debtsApi = {
  get: (id: string) =>
    api.get<Debt>(`/debts/${id}`),

  create: (data: CreateDebtPayload) =>
    api.post<CreateDebtResponse>('/debts', data),

  update: (id: string, data: UpdateDebtPayload) =>
    api.put<Debt>(`/debts/${id}`, data),

  delete: (id: string) =>
    api.delete<{ message: string }>(`/debts/${id}`),

  /** Encerrar / retomar a recorrência (API B6). */
  setRecurrence: (id: string, active: boolean) => api.patch<Debt>(`/debts/${id}/recurrence`, { active }),

  /** Alterar término: after N charges in total, until a date, or never (both null). */
  setRecurrenceEnd: (id: string, body: { occurrences: number | null; endsAt: string | null; today: string }) =>
    api.patch<Debt>(`/debts/${id}/recurrence/end`, body),
}
