/**
 * Core Web Vitals from real use (improvement 43): LCP, INP, CLS, FCP and TTFB
 * measured by the `web-vitals` library and sent to POST /vitals with
 * navigator.sendBeacon when the page is hidden. Production builds only.
 *
 * Privacy: only metric names/values, the route PATTERN ("/debtors/:id", never
 * an id or query string) and the app version leave the browser.
 */
export interface VitalMetric {
  name: 'LCP' | 'INP' | 'CLS' | 'FCP' | 'TTFB'
  value: number
  rating: 'good' | 'needs-improvement' | 'poor'
}

/** "/debtors/cm3x…?divida=…" → "/debtors/:id" (anything that looks like an id). */
export function routePattern(pathname: string): string {
  const parts = pathname.split(/[?#]/)[0].split('/').map((seg) => (seg && /\d/.test(seg) && seg.length >= 6 ? ':id' : seg.toLowerCase()))
  const path = parts.join('/').replace(/[^a-z0-9/:_-]/gi, '').slice(0, 60)
  return path.startsWith('/') ? path : `/${path}`
}

/** The JSON the API expects (one beacon per page visit). */
export function vitalsPayload(pathname: string, metrics: VitalMetric[], version: string): string {
  return JSON.stringify({
    path: routePattern(pathname),
    version: version.slice(0, 20),
    // Last value per metric; CLS keeps 4 decimals, the others whole milliseconds.
    metrics: Object.values(Object.fromEntries(metrics.map((m) => [m.name, m]))).map((m) => ({
      name: m.name,
      value: m.name === 'CLS' ? Math.round(m.value * 10_000) / 10_000 : Math.round(m.value),
      rating: m.rating,
    })),
  })
}

export function startVitals(apiUrl: string | undefined, version: string): void {
  if (!apiUrl || typeof navigator.sendBeacon !== 'function') return
  const url = `${apiUrl.replace(/\/$/, '')}/vitals`
  let queue: VitalMetric[] = []
  const flush = () => {
    if (!queue.length) return
    // A string body is sent as text/plain: no CORS preflight for the beacon.
    navigator.sendBeacon(url, vitalsPayload(window.location.pathname, queue, version))
    queue = []
  }
  const add = (m: { name: string; value: number; rating: string }) => queue.push(m as VitalMetric)
  addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && flush())
  addEventListener('pagehide', flush)
  // Loaded after the first screen, in its own chunk: never in the initial bundle.
  void import('web-vitals').then(({ onLCP, onINP, onCLS, onFCP, onTTFB }) => {
    onLCP(add)
    onINP(add)
    onCLS(add)
    onFCP(add)
    onTTFB(add)
  })
}
