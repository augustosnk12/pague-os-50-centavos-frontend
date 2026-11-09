import { api } from '../lib/axios'
import type { DashboardData, DashboardOverview } from '../types/dashboard'

export const dashboardApi = {
  get: (month: string) =>
    api.get<DashboardData>('/dashboard', { params: { month } }),
  /** All overdue (any month), today and next 7 days; `today` is the local date. */
  overview: (today: string) =>
    api.get<DashboardOverview>('/dashboard/overview', { params: { today } }),
}
