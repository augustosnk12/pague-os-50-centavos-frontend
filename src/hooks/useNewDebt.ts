import { useCallback } from 'react'
import { useGuardedNavigate } from './useGuardedNavigate'

/**
 * "Nova dívida" from anywhere ("+", the top button, Alt+N). Already on Nova
 * dívida, it does not navigate (nothing would change and history would get a
 * useless entry): the open form decides ("Começar outra dívida?" when
 * something is typed; otherwise back to the top).
 */
let onAgain: (() => void) | null = null
export const setNewDebtAgain = (fn: typeof onAgain) => {
  onAgain = fn
}

export function useNewDebt() {
  const navigate = useGuardedNavigate()
  return useCallback(() => {
    if (window.location.pathname === '/debts/new' && onAgain) return onAgain()
    navigate('/debts/new')
  }, [navigate])
}
