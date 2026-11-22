import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { adminApi, type LenderPlanPayload, type PlanPayload } from '../../api/plan.api'
import { PLAN_KEY } from '../plan/usePlan'

// Administração (melhoria 63). Only reached by the ADMIN_EMAIL account.

export function useAdminPlans(enabled: boolean) {
  return useQuery({ queryKey: ['admin', 'plans'], queryFn: () => adminApi.plans().then((r) => r.data), enabled })
}

export function useAdminLenders(enabled: boolean) {
  return useQuery({ queryKey: ['admin', 'lenders'], queryFn: () => adminApi.lenders({}).then((r) => r.data), enabled })
}

function useAdminInvalidate() {
  const qc = useQueryClient()
  return () => {
    void qc.invalidateQueries({ queryKey: ['admin'] })
    // The admin's own account may be the one that changed.
    void qc.invalidateQueries({ queryKey: PLAN_KEY })
  }
}

export function useSavePlan() {
  const done = useAdminInvalidate()
  return useMutation({
    mutationFn: ({ id, data }: { id?: string; data: PlanPayload }) =>
      (id ? adminApi.updatePlan(id, data) : adminApi.createPlan(data)).then((r) => r.data),
    onSuccess: done,
  })
}

export function useDeletePlan() {
  const done = useAdminInvalidate()
  return useMutation({ mutationFn: (id: string) => adminApi.deletePlan(id), onSuccess: done })
}

export function useUpdateLenderPlan() {
  const done = useAdminInvalidate()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: LenderPlanPayload }) => adminApi.updateLender(id, data).then((r) => r.data),
    onSuccess: done,
  })
}
