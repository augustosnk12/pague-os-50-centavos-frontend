import { api } from '../lib/axios'

/** One limit of the account (melhoria 62). `limit` null = no limit. */
export interface UsageItem {
  used: number
  limit: number | null
  full: boolean
}

/** GET /me/plan */
export interface MyPlan {
  plan: { id: string; name: string; isDefault: boolean; showUsage: boolean } | null
  /** Debtors registered now (archived ones count; deleting frees). */
  debtors: UsageItem
  /** Debts ever created (paid or deleted ones still count). */
  debts: UsageItem
  limitRequestedAt: string | null
  /** false = the API does not block (PLAN_LIMITS_ENABLED off): the app shows nothing. */
  enforced: boolean
  isAdmin: boolean
}

export interface Plan {
  id: string
  name: string
  maxDebtors: number
  maxDebts: number
  isDefault: boolean
  showUsage: boolean
  createdAt: string
  updatedAt: string
}

export interface AdminPlan extends Plan {
  lenders: number
}

export interface AdminLender {
  id: string
  email: string
  name: string | null
  createdAt: string
  planId: string | null
  maxDebtors: number | null
  maxDebts: number | null
  limitRequestedAt: string | null
  plan: MyPlan['plan']
  debtors: UsageItem
  debts: UsageItem
}

/** full = at a limit; near = 80%+ of one; requested = asked for more; adjusted = own limit. */
export type LenderStatus = 'full' | 'near' | 'requested' | 'adjusted'

export interface LenderPage {
  items: AdminLender[]
  total: number
  page: number
  pageSize: number
}

export interface LenderStats {
  lenders: number
  full: number
  near: number
  requested: number
}

export interface LenderQuery {
  q?: string
  planId?: string
  status?: LenderStatus
  page?: number
  pageSize?: number
}

export interface PlanPayload {
  name: string
  maxDebtors: number
  maxDebts: number
  showUsage?: boolean
  isDefault?: boolean
}

export interface LenderPlanPayload {
  planId?: string | null
  maxDebtors?: number | null
  maxDebts?: number | null
}

export const planApi = {
  mine: () => api.get<MyPlan>('/me/plan'),
  /** Standard "more limit" e-mail to the admin (once every 24 h). */
  requestLimit: () => api.post<{ message: string; limitRequestedAt: string }>('/me/limit-request'),
}

/** Administração (melhoria 63): only the ADMIN_EMAIL account gets answers; others get 404. */
export const adminApi = {
  plans: () => api.get<AdminPlan[]>('/admin/plans'),
  createPlan: (data: PlanPayload) => api.post<Plan>('/admin/plans', data),
  updatePlan: (id: string, data: Partial<PlanPayload>) => api.patch<Plan>(`/admin/plans/${id}`, data),
  deletePlan: (id: string) => api.delete(`/admin/plans/${id}`),
  /** One page: requests first, then at/near the limit, then newest. */
  lenders: (params: LenderQuery) => api.get<LenderPage>('/admin/lenders', { params }),
  stats: () => api.get<LenderStats>('/admin/stats'),
  updateLender: (id: string, data: LenderPlanPayload) => api.patch<AdminLender>(`/admin/lenders/${id}`, data),
}
