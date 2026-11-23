import { describe, it, expect, afterEach, vi } from 'vitest'
import { act } from 'react'
import { hydrateRoot, type Root } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { App } from '../App'
import { render } from '../prerender'
import { PRERENDERED } from '../router/routes'
import { fakeGet } from './fakeApi'

vi.mock('../lib/axios', () => ({
  api: { get: vi.fn((url: string) => Promise.resolve({ data: fakeGet(url) })), post: vi.fn(() => Promise.resolve({ data: {} })) },
}))

/**
 * The public pages come as ready HTML made at build time (src/prerender.tsx)
 * and main.tsx hydrates it. If what the browser renders differs from that
 * HTML (a value read from the browser during render, a node only the browser
 * adds), React throws the HTML away and draws the page again: nothing looks
 * broken, but the landing's Lighthouse LCP goes from ~1.7 s to ~4.8 s.
 * Saved theme, today's date and the session are browser-only on purpose here.
 */
const PATHS = { landing: '/', calculator: '/calculadora-de-parcelas', notFound: '/nao-existe' } as const

describe('public pages hydrate the build HTML', () => {
  let root: Root | undefined
  afterEach(() => {
    act(() => root?.unmount())
    root = undefined
    document.body.innerHTML = ''
    localStorage.clear()
  })

  for (const page of PRERENDERED) {
    it(`${page}: no mismatch, even with the dark theme saved`, async () => {
      const html = await render(page, PATHS[page])
      localStorage.setItem('lt-theme', 'dark')
      window.history.replaceState(null, '', PATHS[page])
      const container = document.createElement('div')
      container.innerHTML = html
      document.body.appendChild(container)
      const h1 = container.querySelector('h1')

      const errors: unknown[] = []
      await act(async () => {
        root = hydrateRoot(container, <App router={(tree) => <BrowserRouter>{tree}</BrowserRouter>} />, {
          onRecoverableError: (e) => errors.push(e),
        })
      })

      expect(errors).toEqual([])
      // Same node: kept, not redrawn.
      expect(container.querySelector('h1')).toBe(h1)
      // And then the browser's values: the saved theme on the toggle.
      expect(container.querySelector('button[aria-label="Tema escuro"]')).toHaveAttribute('aria-pressed', 'true')
    })
  }
})
