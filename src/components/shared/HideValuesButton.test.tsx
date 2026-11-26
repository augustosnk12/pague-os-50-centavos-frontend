import { describe, it, expect, vi, afterEach } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderApp } from '../../test/renderApp'
import { fakeGet } from '../../test/fakeApi'

vi.mock('../../lib/axios', () => ({
  api: {
    get: vi.fn((url: string) => Promise.resolve({ data: fakeGet(url) })),
    post: vi.fn(() => Promise.resolve({ data: {} })),
    put: vi.fn(() => Promise.resolve({ data: {} })),
    delete: vi.fn(() => Promise.resolve({ data: {} })),
  },
}))

afterEach(() => document.documentElement.removeAttribute('data-hide-values'))

describe('Esconder valores (improvement 71)', () => {
  it('the eye in the Painel hides every amount, says so, and is remembered on the device', async () => {
    const user = userEvent.setup()
    renderApp('/dashboard')
    const hero = await screen.findByRole('region', { name: /A receber em/ })
    const eye = within(hero).getByRole('button', { name: 'Esconder valores' })
    expect(eye).toHaveAttribute('aria-pressed', 'false')
    expect(screen.queryAllByText('valor oculto')).toHaveLength(0)

    await user.click(eye)

    expect(eye).toHaveAttribute('aria-pressed', 'true')
    expect(document.documentElement).toHaveAttribute('data-hide-values')
    // Screen readers hear "valor oculto" instead of each amount; the amount itself is aria-hidden.
    expect(screen.getAllByText('valor oculto').length).toBeGreaterThan(1)
    for (const amt of document.querySelectorAll('.lt-amt')) {
      expect(amt.firstElementChild).toHaveAttribute('aria-hidden', 'true')
    }
    expect(await screen.findAllByText('Valores escondidos')).not.toHaveLength(0)
    expect(JSON.parse(localStorage.getItem('pague50_prefs') ?? '{}')).toMatchObject({ hideValues: true })

    await user.click(eye)
    expect(document.documentElement).not.toHaveAttribute('data-hide-values')
    expect(screen.queryAllByText('valor oculto')).toHaveLength(0)
  })

  it('starts hidden when the device remembers it', async () => {
    localStorage.setItem('pague50_prefs', JSON.stringify({ hideValues: true }))
    renderApp('/dashboard')
    const hero = await screen.findByRole('region', { name: /A receber em/ })
    expect(within(hero).getByRole('button', { name: 'Esconder valores' })).toHaveAttribute('aria-pressed', 'true')
    expect(document.documentElement).toHaveAttribute('data-hide-values')
  })
})
