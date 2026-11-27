import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useLocation, useNavigate } from 'react-router-dom'
import { setApiKind } from '../lib/apiSide'
import { kindOf, readSide, sideText, storeSide, type Side } from '../lib/side'

interface SideValue {
  side: Side
  setSide: (side: Side) => void
  /** A text as this side says it ("Devedores" → "Credores" on "Eu devo"). */
  t: (text: string) => string
}

// Outside the app (tests of one component, public pages): always "Me devem".
const SideContext = createContext<SideValue>({ side: 'in', setSide: () => {}, t: (s) => s })

/** Queries that do not depend on the side (kept when switching). */
const SIDELESS = new Set(['settings', 'admin', 'me', 'plan'])

/**
 * Item 75: which side the app shows, for the whole app (the signed-in area).
 * Kept on this device; the API calls follow it (lib/axios), the colour turns
 * blue on "Eu devo" (html[data-side="out"]) and the cache is refetched when it
 * changes, so nothing of one side shows on the other.
 */
export function SideProvider({ children }: { children: ReactNode }) {
  const [side, setSideState] = useState<Side>(readSide)
  const qc = useQueryClient()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  // Before the first queries of this render run (they start in effects).
  setApiKind(kindOf(side))

  useEffect(() => {
    const html = document.documentElement
    if (side === 'out') html.setAttribute('data-side', 'out')
    else html.removeAttribute('data-side')
  }, [side])

  // Leaving the signed-in area: back to the API's default and the usual colour.
  useEffect(
    () => () => {
      setApiKind('DEBTOR')
      document.documentElement.removeAttribute('data-side')
    },
    [],
  )

  const setSide = useCallback(
    (next: Side) => {
      if (next === side) return
      storeSide(next)
      setApiKind(kindOf(next))
      setSideState(next)
      const sided = (q: { queryKey: readonly unknown[] }) => !SIDELESS.has(String(q.queryKey[0])) && !(q.queryKey[0] === 'debtors' && q.queryKey[1] === 'me-plan')
      void qc.cancelQueries({ predicate: sided })
      void qc.resetQueries({ predicate: sided })
      // A person of the other side has no page here.
      if (/^\/debtors\/[^/]+/.test(pathname)) navigate('/debtors', { replace: true })
    },
    [side, qc, navigate, pathname],
  )

  const value = useMemo(() => ({ side, setSide, t: (s: string) => sideText(s, side) }), [side, setSide])
  return <SideContext.Provider value={value}>{children}</SideContext.Provider>
}

export const useSide = () => useContext(SideContext)
