import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { MyPlan } from '../api/plan.api'
import { PLAN_KEY, usePlan } from '../hooks/plan/usePlan'
import { getApiError } from '../lib/api'
import { isFull, LIMIT_ERRORS, type LimitKind } from '../lib/planLimits'
import { LimitSheet } from '../components/shared/LimitSheet'

interface PlanLimits {
  plan: MyPlan | undefined
  isFull: (kind: LimitKind) => boolean
  /** Opens the "Limite atingido" sheet. */
  openLimit: (kind: LimitKind) => void
  /** Call before opening a "new debtor/debt" flow: true = blocked (the sheet opened). */
  blocked: (kind: LimitKind) => boolean
  /** In onError: true when the API refused for a limit (the sheet opened). */
  handleLimitError: (e: unknown) => boolean
}

const noop: PlanLimits = {
  plan: undefined,
  isFull: () => false,
  openLimit: () => {},
  blocked: () => false,
  handleLimitError: () => false,
}

const Ctx = createContext<PlanLimits>(noop)

/** Plan limits for the signed-in app (melhoria 62); mounted in AppLayout. */
export function PlanLimitsProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient()
  const { data: plan } = usePlan()
  const [kind, setKind] = useState<LimitKind | null>(null)

  const openLimit = useCallback((k: LimitKind) => setKind(k), [])
  const value = useMemo<PlanLimits>(() => ({
    plan,
    isFull: (k) => isFull(plan, k),
    openLimit,
    blocked: (k) => {
      if (!isFull(plan, k)) return false
      setKind(k)
      return true
    },
    handleLimitError: (e) => {
      const k = LIMIT_ERRORS[getApiError(e) ?? '']
      if (!k) return false
      void qc.invalidateQueries({ queryKey: PLAN_KEY })
      setKind(k)
      return true
    },
  }), [plan, openLimit, qc])

  return (
    <Ctx.Provider value={value}>
      {children}
      <LimitSheet open={kind !== null} onClose={() => setKind(null)} kind={kind ?? 'debtors'} plan={plan} />
    </Ctx.Provider>
  )
}

export const usePlanLimits = () => useContext(Ctx)
