import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { setLeaveGate } from './useGuardedNavigate'

/**
 * Asks before leaving a page with something typed in it (Nova dívida).
 *
 * The app uses <BrowserRouter> (no data router, so no `useBlocker`); this
 * covers the real ways out:
 * - links of the app (tabs, header, logo…): intercepted on click;
 * - the page's own "Voltar"/"Cancelar": call `confirm(go)`;
 * - the browser's back (and Android's back gesture): one extra history entry
 *   on top of this page takes the first "back", and the question shows;
 * - reload / closing the tab: the browser's own "Leave site?".
 *
 * `leave(go)` leaves without asking (after saving, or when the person
 * confirms), first removing the extra entry so history stays as before.
 */
export function useLeaveGuard(dirty: boolean) {
  const navigate = useNavigate()
  const [pending, setPending] = useState<(() => void) | null>(null)
  const dirtyRef = useRef(dirty)
  dirtyRef.current = dirty
  // Whether our extra entry is the current one.
  const guarding = useRef(false)
  const leaving = useRef(false)

  /** Leaves now: drops the extra entry first (one "back"), then goes. */
  const leave = useCallback((go: () => void) => {
    leaving.current = true
    setPending(null)
    if (!guarding.current) return go()
    guarding.current = false
    const after = () => {
      window.removeEventListener('popstate', after)
      go()
    }
    window.addEventListener('popstate', after)
    window.history.back()
  }, [])

  /** Asks first when something was typed; otherwise goes right away. */
  const confirm = useCallback((go: () => void) => (dirtyRef.current ? setPending(() => go) : go()), [])

  // Navigations made by code elsewhere (account sheet, header search…) ask here too.
  useEffect(() => {
    setLeaveGate((go) => (dirtyRef.current ? setPending(() => () => leave(go)) : leave(go)))
    return () => setLeaveGate(null)
  }, [leave])

  // The extra history entry, added once something is typed.
  useEffect(() => {
    if (!dirty || guarding.current || leaving.current) return
    window.history.pushState(window.history.state, '', window.location.href)
    guarding.current = true
  }, [dirty])

  // Browser back: the extra entry goes away; ask (and put it back), or keep going back.
  useEffect(() => {
    const onPop = () => {
      if (!guarding.current || leaving.current) return
      guarding.current = false
      if (dirtyRef.current) {
        window.history.pushState(window.history.state, '', window.location.href)
        guarding.current = true
        setPending(() => () => leave(() => window.history.back()))
      } else {
        window.history.back()
      }
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [leave])

  // Links of the app.
  useEffect(() => {
    if (!dirty) return
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const a = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null
      if (!a || (a.target && a.target !== '_self') || a.hasAttribute('download')) return
      const url = new URL(a.href, window.location.href)
      if (url.origin !== window.location.origin) return
      const to = url.pathname + url.search + url.hash
      if (to === window.location.pathname + window.location.search + window.location.hash) return
      e.preventDefault()
      e.stopPropagation()
      setPending(() => () => leave(() => navigate(to)))
    }
    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [dirty, navigate, leave])

  // Reload or close the tab.
  useEffect(() => {
    if (!dirty) return
    const onUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', onUnload)
    return () => window.removeEventListener('beforeunload', onUnload)
  }, [dirty])

  return {
    confirm,
    leave,
    /** The question is open. */
    asking: pending !== null,
    stay: () => setPending(null),
    go: () => {
      const go = pending
      setPending(null)
      go?.()
    },
  }
}
