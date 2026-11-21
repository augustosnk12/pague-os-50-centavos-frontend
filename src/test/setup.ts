import '@testing-library/jest-dom/vitest'
import { afterEach, vi } from 'vitest'
import { cleanup, configure } from '@testing-library/react'

// findBy*/waitFor wait up to 3 s (default 1 s): with the whole suite running in
// parallel (and axe checks), a busy machine or a 2-core CI runner made a few
// screens miss the 1 s window intermittently. Passing tests are not slower.
configure({ asyncUtilTimeout: 3000 })

afterEach(() => {
  cleanup()
  localStorage.clear()
  document.cookie.split(';').forEach((c) => {
    document.cookie = c.replace(/=.*/, '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/')
  })
})

// jsdom does not implement these browser APIs used by the app.
if (!window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
}
window.scrollTo = vi.fn() as unknown as typeof window.scrollTo
Element.prototype.scrollIntoView = vi.fn()
// No canvas in jsdom: axe probes it (icon/colour checks) and the receipt image
// uses it; answering "no context" keeps the output quiet (those paths are E2E).
HTMLCanvasElement.prototype.getContext = (() => null) as unknown as typeof HTMLCanvasElement.prototype.getContext
