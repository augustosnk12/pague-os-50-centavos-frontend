const KEY = 'pague50_return_to'

/**
 * Where to go back after logging in again (session expired, improvement 47).
 * Stored in localStorage because the magic link opens a NEW tab.
 * Only same-site paths are kept, so this can never redirect elsewhere.
 */
export function isSafeReturnPath(path: unknown): path is string {
  return (
    typeof path === 'string' &&
    path.startsWith('/') &&
    !path.startsWith('//') &&
    !path.includes('\\') &&
    !/^\/(login|register|auth)\b/.test(path)
  )
}

export function rememberReturnPath(path: string): void {
  try {
    if (isSafeReturnPath(path)) localStorage.setItem(KEY, JSON.stringify({ path, at: Date.now() }))
  } catch {
    // storage unavailable: just go to the dashboard after login
  }
}

/** Returns the stored path (if recent and safe) and forgets it. */
export function takeReturnPath(maxAgeMs = 24 * 60 * 60 * 1000): string | null {
  try {
    const raw = localStorage.getItem(KEY)
    localStorage.removeItem(KEY)
    if (!raw) return null
    const { path, at } = JSON.parse(raw) as { path?: unknown; at?: number }
    return isSafeReturnPath(path) && typeof at === 'number' && Date.now() - at < maxAgeMs ? path : null
  } catch {
    return null
  }
}
