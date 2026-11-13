import { useEffect, useState } from 'react'

function readUntil(storageKey?: string): number {
  if (!storageKey) return 0
  try {
    return Number(localStorage.getItem(storageKey)) || 0
  } catch {
    return 0
  }
}

/**
 * A countdown ("Reenviar em 0:42") that survives a page refresh: the end
 * time is kept in localStorage (pass a unique `storageKey`).
 *
 * The seconds left are derived from the end time, and a 1 s clock runs
 * whenever there is time left. (It used to keep its own timer, which a
 * remount — React StrictMode in development — stopped for good: the
 * countdown froze at 1:00.)
 */
export function useCooldown(seconds = 60, storageKey?: string) {
  const [until, setUntil] = useState(() => readUntil(storageKey))
  const [now, setNow] = useState(() => Date.now())
  const cooldown = Math.max(0, Math.ceil((until - now) / 1000))
  const running = cooldown > 0

  useEffect(() => {
    if (!running) return
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [running])

  useEffect(() => {
    if (running || !until || !storageKey) return
    try {
      localStorage.removeItem(storageKey)
    } catch {
      // storage unavailable
    }
  }, [running, until, storageKey])

  /** Starts the countdown; false when one is already running. */
  const start = () => {
    const t = Date.now()
    if (Math.max(until, readUntil(storageKey)) > t) return false
    const end = t + seconds * 1000
    if (storageKey) {
      try {
        localStorage.setItem(storageKey, String(end))
      } catch {
        // storage unavailable: still counts down in this page
      }
    }
    setUntil(end)
    setNow(t)
    return true
  }

  return { cooldown, start }
}
