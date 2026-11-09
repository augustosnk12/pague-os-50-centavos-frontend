import { useEffect, useRef } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'

export const APP_NAME = 'Pague os 50 centavos'

/**
 * Scroll to y once the page is tall enough (its list may still be rendering);
 * gives up after ~2 s and goes as far as possible.
 */
function restoreScroll(y: number) {
  let tries = 0
  const tick = () => {
    const fits = document.documentElement.scrollHeight - window.innerHeight >= y
    if (fits || ++tries >= 120) return window.scrollTo(0, y)
    requestAnimationFrame(tick)
  }
  tick()
}

/** Wait (a few frames) for the page's h1 — pages render it after their data loads. */
function whenHeading(cb: (h1: HTMLElement) => void): () => void {
  let frame = 0
  let tries = 0
  const tick = () => {
    const h1 = document.querySelector<HTMLElement>('main h1')
    if (h1 && h1.textContent?.trim()) return cb(h1)
    if (++tries < 120) frame = requestAnimationFrame(tick) // ~2 s
  }
  frame = requestAnimationFrame(tick)
  return () => cancelAnimationFrame(frame)
}

/**
 * Route changes for keyboard and screen-reader users (improvements 20, 24):
 * - document.title = "<page h1> · Pague os 50 centavos"
 * - focus moves to the page's h1 (announced by screen readers), not on the
 *   first load
 * - new navigations start at the top; Back/Forward restore the scroll
 *   position of that entry
 */
export function useRouteAnnouncer() {
  const location = useLocation()
  const navType = useNavigationType()
  const positions = useRef(new Map<string, number>())
  // The entry the app was opened on. Compared by key (not a "first run" flag):
  // StrictMode runs effects twice, and a flag would treat the 2nd run as a navigation.
  const initialKey = useRef(location.key)
  const navigated = useRef(false)

  // Remember where each history entry was scrolled to — only from scroll
  // events while it is the current entry. (Reading scrollY when leaving would
  // see the NEXT page, already rendered and possibly shorter, i.e. clamped.)
  useEffect(() => {
    const key = location.key
    const save = () => positions.current.set(key, window.scrollY)
    window.addEventListener('scroll', save, { passive: true })
    return () => window.removeEventListener('scroll', save)
  }, [location.key])

  useEffect(() => {
    if (typeof history !== 'undefined' && 'scrollRestoration' in history) history.scrollRestoration = 'manual'
    if (location.key !== initialKey.current) navigated.current = true
    // Coming BACK to the entry the app was opened on is a navigation too.
    const isFirst = location.key === initialKey.current && !navigated.current
    const restoreTo = navType === 'POP' ? positions.current.get(location.key) : undefined
    if (!isFirst) window.scrollTo(0, restoreTo ?? 0)

    return whenHeading((h1) => {
      document.title = `${h1.textContent!.trim()} · ${APP_NAME}`
      if (isFirst) return
      if (!h1.hasAttribute('tabindex')) h1.setAttribute('tabindex', '-1')
      h1.focus({ preventScroll: true })
      if (restoreTo !== undefined) restoreScroll(restoreTo)
    })
  }, [location.key]) // eslint-disable-line react-hooks/exhaustive-deps
}
