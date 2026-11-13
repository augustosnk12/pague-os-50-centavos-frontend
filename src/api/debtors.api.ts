import { api } from '../lib/axios'
import type { Debtor, DebtorReliability } from '../types/debtor'

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
  reliability?: DebtorReliability | null
  avatarHue?: number | null
  avatarEmoji?: string | null
  address?: AddressPayload | null
}

export interface UpdateDebtorPayload {
  name?: string
  email?: string | null
  phone?: string | null
  notes?: string | null
  reliability?: DebtorReliability | null
  avatarHue?: number | null
  avatarEmoji?: string | null
  address?: AddressPayload | null
}

export const debtorsApi = {
  list: (reliability?: DebtorReliability, archived?: 'true' | 'all') =>
    api.get<Debtor[]>('/debtors', { params: reliability || archived ? { reliability, archived } : undefined }),

  get: (id: string) =>
    api.get<Debtor>(`/debtors/${id}`),

  create: (data: CreateDebtorPayload) =>
    api.post<Debtor>('/debtors', data),

  update: (id: string, data: UpdateDebtorPayload) =>
    api.put<Debtor>(`/debtors/${id}`, data),

  delete: (id: string) =>
    api.delete<{ message: string }>(`/debtors/${id}`),

  /** Improvement 41 (API B10): out of every list and total; the search still finds them. */
  archive: (id: string) => api.patch<Debtor>(`/debtors/${id}/archive`),
  unarchive: (id: string) => api.patch<Debtor>(`/debtors/${id}/unarchive`),
}
