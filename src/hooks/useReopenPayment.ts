import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useDebtsByDebtor } from './debts/useDebtsByDebtor'
import { remainingCents } from '../lib/installmentTag'
import type { PaymentTarget } from '../lib/paymentTarget'

/**
 * The payment sheet's links ("João ›" and the debt's description) leave the
 * page. Before leaving, the sheet's target goes into the CURRENT history entry;
 * coming back (the app's "‹ Voltar" or the browser's back) finds it there and
 * opens the sheet again — only if the installment is still open.
 */
const KEY = 'reopenPayment'

export function withReopenPayment(state: unknown, target: PaymentTarget): Record<string, unknown> {
  return { ...(state && typeof state === 'object' ? state : {}), [KEY]: target }
}

function readReopenPayment(state: unknown): PaymentTarget | null {
  const v = state && typeof state === 'object' ? (state as Record<string, unknown>)[KEY] : null
  return v && typeof v === 'object' ? (v as PaymentTarget) : null
}

export function useReopenPayment(open: (t: PaymentTarget) => void) {
  const location = useLocation()
  const navigate = useNavigate()
  const saved = readReopenPayment(location.state)
  // Fresh numbers: it may have been paid on the profile meanwhile (wait for the refetch).
  const { data, isFetching } = useDebtsByDebtor(saved ? saved.debtor.id : '')
  useEffect(() => {
    if (!saved || !data || isFetching) return
    // Once: a reload or the next visit to this entry does not open it again.
    navigate({ pathname: location.pathname, search: location.search, hash: location.hash }, { replace: true, state: null })
    const fresh = data.flatMap((d) => d.installments).find((i) => i.id === saved.installment.id)
    if (fresh && remainingCents(fresh) > 0) open({ ...saved, installment: { ...saved.installment, ...fresh } })
  }, [saved?.installment.id, data, isFetching]) // eslint-disable-line react-hooks/exhaustive-deps
}
