import { useCallback } from 'react'
import { useNavigate, type NavigateOptions, type To } from 'react-router-dom'

/**
 * The page that may ask before leaving (Nova dívida, useLeaveGuard) sets a
 * gate here while it is open. Navigations made by code outside that page
 * (account sheet and menu, header search…) go through it.
 */
let gate: ((go: () => void) => void) | null = null
export const setLeaveGate = (g: typeof gate) => {
  gate = g
}

/** `useNavigate`, but asking the open page first (when it wants to). */
export function useGuardedNavigate() {
  const navigate = useNavigate()
  return useCallback(
    (to: To, options?: NavigateOptions) => {
      const go = () => navigate(to, options)
      const here = window.location.pathname + window.location.search
      if (!gate || to === here) return go()
      gate(go)
    },
    [navigate],
  )
}
