import type { MouseEvent } from 'react'

/** Tapping the tab/link of the screen you are on scrolls back to the top (improvement 42). */
export function scrollTopIfActive(active: boolean) {
  return (e: MouseEvent) => {
    if (!active) return
    e.preventDefault()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}
