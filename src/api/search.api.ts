import { api } from '../lib/axios'

/** GET /search (API B8): accent/case-insensitive, at least 2 characters. Money as "0.00". */
export interface SearchResult {
  debtors: { id: string; name: string; avatarHue: number | null; avatarEmoji: string | null; outstanding: string; archived: boolean }[]
  debts: { id: string; description: string | null; debtorId: string; debtorName: string; remaining: string; recurring: boolean }[]
}

export const searchApi = {
  search: (q: string, limit = 8) => api.get<SearchResult>('/search', { params: { q, limit } }),
}
