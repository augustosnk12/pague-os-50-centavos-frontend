import { api } from '../lib/axios'
import type { DashboardData } from '../types/dashboard'

export const dashboardApi = {
  get: (month: string) =>
    api.get<DashboardData>('/dashboard', { params: { month } }),
}
