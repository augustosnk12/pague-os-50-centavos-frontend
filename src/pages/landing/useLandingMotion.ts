import { useEffect, useState, type RefObject } from 'react'

/*
 * Landing motion. Rules: transform/scale only — never from opacity 0 (project
 * rule: frozen invisible content in background tabs) — and nothing moves with
 * "reduce motion". Without IntersectionObserver (old browsers, tests) the page
 * is simply static, in its final state.
 */
const reduced = () => typeof window === 'undefined' || !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/**
 * Turns motion on for the landing root (`data-motion`) and marks every
 * `[data-reveal]` element with `data-in` when it scrolls into view.
 */
export function useLandingMotion(root: RefObject<HTMLElement | null>): boolean {
  const [on, setOn] = useState(false)
  useEffect(() => {
    const el = root.current
    if (!el || reduced() || typeof IntersectionObserver === 'undefined') return
    setOn(true)
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue
          e.target.setAttribute('data-in', '')
          io.unobserve(e.target)
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.12 },
    )
    el.querySelectorAll('[data-reveal]').forEach((n) => io.observe(n))
    return () => io.disconnect()
  }, [root])
  return on
}

/** True once the element has been on screen (or right away without motion). */
export function useSeen(ref: RefObject<HTMLElement | null>, motion: boolean): boolean {
  const [seen, setSeen] = useState(!motion)
  useEffect(() => {
    if (!motion) return setSeen(true)
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') return setSeen(true)
    setSeen(false)
    const io = new IntersectionObserver(([e]) => e.isIntersecting && (setSeen(true), io.disconnect()), { threshold: 0.35 })
    io.observe(el)
    return () => io.disconnect()
  }, [ref, motion])
  return seen
}
