import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import { renderApp } from './renderApp'
import { fakeGet } from './fakeApi'

// Every page talks to the backend through the shared axios instance.
vi.mock('../lib/axios', () => ({
  api: {
    get: vi.fn((url: string) => Promise.resolve({ data: fakeGet(url) })),
    post: vi.fn(() => Promise.resolve({ data: {} })),
    put: vi.fn(() => Promise.resolve({ data: {} })),
    delete: vi.fn(() => Promise.resolve({ data: {} })),
  },
}))

/**
 * Regression net for the current app: each route renders its main heading
 * with realistic API data. These tests must keep passing while the UI v2 is
 * built (texts are updated alongside the screens they cover).
 */
describe('routes (smoke)', () => {
  beforeEach(() => {
    vi.setSystemTime(new Date('2026-11-05T12:00:00-03:00'))
  })

  it('logged out: /dashboard redirects to the login page', async () => {
    renderApp('/dashboard', { loggedIn: false })
    expect(await screen.findByRole('heading', { level: 1, name: 'Entrar' })).toBeInTheDocument()
    expect(screen.getByPlaceholderText('voce@email.com')).toBeInTheDocument()
  })

  it('unknown routes redirect to the dashboard', async () => {
    renderApp('/nao-existe')
    expect(await screen.findByRole('heading', { level: 1, name: /olá, augusto/i })).toBeInTheDocument()
  })

  it('dashboard greets the lender', async () => {
    renderApp('/dashboard')
    expect(await screen.findByRole('heading', { level: 1, name: /olá, augusto/i })).toBeInTheDocument()
  })

  it('debtors lists the debtors from the API', async () => {
    renderApp('/debtors')
    expect(await screen.findByRole('heading', { level: 1, name: 'Devedores' })).toBeInTheDocument()
    expect(await screen.findByText('João Araújo')).toBeInTheDocument()
  })

  it('installments shows the period installments', async () => {
    renderApp('/installments')
    expect(await screen.findByRole('heading', { level: 1, name: 'Parcelas' })).toBeInTheDocument()
    expect(await screen.findByText(/notebook/i)).toBeInTheDocument()
  })

  it('debtor detail renders the debtor', async () => {
    renderApp('/debtors/d1')
    expect((await screen.findAllByText('João Araújo')).length).toBeGreaterThan(0)
  })

  it('new debt form renders', async () => {
    renderApp('/debts/new')
    expect((await screen.findAllByText(/nova (dívida|cobrança)/i)).length).toBeGreaterThan(0)
  })
})

describe('layout and navigation (F3)', () => {
  beforeEach(() => {
    vi.setSystemTime(new Date('2026-11-05T12:00:00-03:00'))
  })

  it('skip link goes to the content', async () => {
    renderApp('/dashboard')
    const skip = await screen.findByRole('link', { name: 'Pular para o conteúdo' })
    expect(skip).toHaveAttribute('href', '#conteudo')
    expect(document.getElementById('conteudo')).not.toBeNull()
  })

  it('overdue badge comes from /dashboard/overview (every month) and is read with the tab name', async () => {
    renderApp('/dashboard')
    // Fixture: 2 overdue. The old badge counted status === "OVERDUE" (never stored) → always 0.
    expect(await screen.findByRole('link', { name: 'Parcelas, 2 atrasadas' })).toBeInTheDocument()
  })

  it('the current screen is marked with aria-current in both navigations', async () => {
    renderApp('/debtors')
    await screen.findByRole('heading', { level: 1, name: 'Devedores' })
    const current = screen.getAllByRole('link', { current: 'page' })
    expect(current.length).toBeGreaterThanOrEqual(1)
    expect(current.every((l) => l.getAttribute('href') === '/debtors')).toBe(true)
  })

  it('changing screen updates the tab title and moves focus to the page heading', async () => {
    const { default: userEvent } = await import('@testing-library/user-event')
    const user = userEvent.setup()
    renderApp('/dashboard')
    await screen.findByRole('heading', { level: 1, name: /olá/i })
    await user.click(screen.getAllByRole('link', { name: 'Devedores' })[0])
    const h1 = await screen.findByRole('heading', { level: 1, name: 'Devedores' })
    await vi.waitFor(() => expect(h1).toHaveFocus())
    expect(document.title).toBe('Devedores · Pague os 50 centavos')
  })
})
