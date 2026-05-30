import { useState, useRef, useEffect } from 'react'

function getRemaining(storageKey?: string): number {
  if (!storageKey) return 0
  const expiry = localStorage.getItem(storageKey)
  if (!expiry) return 0
  const remaining = Math.ceil((Number(expiry) - Date.now()) / 1000)
  return remaining > 0 ? remaining : 0
}

export function useCooldown(seconds = 60, storageKey?: string) {
  const [cooldown, setCooldown] = useState(() => getRemaining(storageKey))
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const tick = (key?: string) => {
    timerRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!)
          timerRef.current = null
          if (key) localStorage.removeItem(key)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  // Resume countdown if there's remaining time from a previous session
  useEffect(() => {
    if (cooldown > 0) tick(storageKey)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const start = () => {
    if (getRemaining(storageKey) > 0 || cooldown > 0) return false
    if (storageKey) localStorage.setItem(storageKey, String(Date.now() + seconds * 1000))
    setCooldown(seconds)
    tick(storageKey)
    return true
  }

  return { cooldown, start }
}
