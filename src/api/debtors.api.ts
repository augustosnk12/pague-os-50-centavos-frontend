import { api } from '../lib/axios'
import type { Debtor } from '../types/debtor'

export interface AddressPayload {
  zip?: string | null
  street?: string | null
  number?: string | null
  complement?: string | null
  neighborhood?: string | null
  city?: string | null
  state?: string | null
}

export interface CreateDebtorPayload {
  name: string
  email?: string | null
  phone?: string | null
  notes?: string | null
  address?: AddressPayload | null
}

export interface UpdateDebtorPayload {
  name?: string
  email?: string | null
  phone?: string | null
  notes?: string | null
  address?: AddressPayload | null
}

export const debtorsApi = {
  list: () =>
    api.get<Debtor[]>('/debtors'),

  get: (id: string) =>
    api.get<Debtor>(`/debtors/${id}`),

  create: (data: CreateDebtorPayload) =>
    api.post<Debtor>('/debtors', data),

  update: (id: string, data: UpdateDebtorPayload) =>
    api.put<Debtor>(`/debtors/${id}`, data),

  delete: (id: string) =>
    api.delete<{ message: string }>(`/debtors/${id}`),
}
