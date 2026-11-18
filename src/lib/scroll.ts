import type { MouseEvent } from 'react'

/** "smooth", unless the person asked the system to reduce motion (WCAG 2.3.3). */
export const scrollBehavior = (): ScrollBehavior =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'

/** Tapping the tab/link of the screen you are on scrolls back to the top (improvement 42). */
export function scrollTopIfActive(active: boolean) {
  return (e: MouseEvent) => {
    if (!active) return
    e.preventDefault()
    window.scrollTo({ top: 0, behavior: scrollBehavior() })
  }
}
