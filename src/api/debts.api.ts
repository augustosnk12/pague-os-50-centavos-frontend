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
}
