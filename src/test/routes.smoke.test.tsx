import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import { renderApp } from './renderApp'
import { fakeGet } from './fakeApi'
import { axeViolations } from './axe'

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

  it('"/" shows the landing to visitors, with real links to Criar conta and Entrar', async () => {
    renderApp('/', { loggedIn: false })
    expect(await screen.findByRole('heading', { level: 1, name: /emprestou\? anota/i })).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: 'Criar minha conta' }).every((a) => a.getAttribute('href') === '/register')).toBe(true)
    expect(screen.getByRole('link', { name: 'Entrar' })).toHaveAttribute('href', '/login')
    // The WhatsApp example is the app's own message, with a Pix BR Code.
    expect(screen.getByText(/Moto \(3\/10\) — R\$\s250,00 · venceu 04 nov/)).toBeInTheDocument()
    expect(screen.getByText(/^00020126/)).toBeInTheDocument()
  })

  it('landing: the theme button switches light/dark and remembers it', async () => {
    const { default: userEvent } = await import('@testing-library/user-event')
    const user = userEvent.setup()
    renderApp('/', { loggedIn: false })
    const btn = await screen.findByRole('button', { name: 'Tema escuro' })
    expect(btn).toHaveAttribute('aria-pressed', 'false')
    await user.click(btn)
    expect(btn).toHaveAttribute('aria-pressed', 'true')
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
    expect(localStorage.getItem('lt-theme')).toBe('dark')
    await user.click(btn)
    expect(document.documentElement).toHaveAttribute('data-theme', 'light')
  })

  it('landing: "Fale comigo" form — errors in the fields, then sends to the API (no e-mail on the page)', async () => {
    const { default: userEvent } = await import('@testing-library/user-event')
    const { api } = await import('../lib/axios')
    // The form waits the anti-bot 3 s after its token before sending: simulated clock.
    vi.useRealTimers()
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderApp('/', { loggedIn: false })
    await screen.findByRole('heading', { level: 2, name: 'Fale comigo' })
    await vi.waitFor(() => expect(vi.mocked(api.get)).toHaveBeenCalledWith('/contact/token'))
    expect(screen.queryByText(/@gmail\.com/)).toBeNull()
    expect(screen.getByRole('link', { name: 'Contato' })).toHaveAttribute('href', '#contato')

    await user.click(screen.getByRole('button', { name: 'Enviar mensagem' }))
    expect(screen.getByLabelText('Seu e-mail')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByText('Informe seu e-mail para eu poder responder.')).toBeInTheDocument()
    expect(screen.getByText('Escreva pelo menos 10 caracteres.')).toBeInTheDocument()
    expect(vi.mocked(api.post)).not.toHaveBeenCalledWith('/contact', expect.anything())

    await user.type(screen.getByLabelText(/Nome/), 'Rita')
    await user.type(screen.getByLabelText('Seu e-mail'), 'rita@exemplo.com')
    await user.type(screen.getByLabelText('Mensagem'), 'Adorei o app, uma sugestão!')
    await user.click(screen.getByRole('button', { name: 'Enviar mensagem' }))
    expect(screen.getByRole('button', { name: /Enviando/ })).toBeDisabled()
    await vi.advanceTimersByTimeAsync(4000)
    expect(vi.mocked(api.post)).toHaveBeenCalledWith('/contact', { name: 'Rita', email: 'rita@exemplo.com', message: 'Adorei o app, uma sugestão!', website: '', token: 'form-token' })
    expect(await screen.findByRole('heading', { name: 'Mensagem enviada!' })).toBeInTheDocument()
    // The confirmation shows no e-mail address at all.
    expect(screen.getByRole('heading', { name: 'Mensagem enviada!' }).closest('[role="status"]')).not.toHaveTextContent('@')
    vi.useRealTimers()
  })

  it('"/" takes signed-in people to the Painel', async () => {
    renderApp('/')
    expect(await screen.findByRole('heading', { level: 1, name: /olá, augusto/i })).toBeInTheDocument()
  })

  it('unknown routes show "Página não encontrada" (the server answers 404), with a way back to the Painel', async () => {
    renderApp('/nao-existe')
    expect(await screen.findByRole('heading', { level: 1, name: 'Página não encontrada' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ir para o Painel' })).toHaveAttribute('href', '/dashboard')
  })

  it('/calculadora-de-parcelas is open without signing in: splits like the app, with optional interest', async () => {
    const { fireEvent } = await import('@testing-library/react')
    renderApp('/calculadora-de-parcelas', { loggedIn: false })
    expect(await screen.findByRole('heading', { level: 1, name: 'Calculadora de parcelas' })).toBeInTheDocument()
    expect(document.title).toMatch(/^Calculadora de parcelas/)
    fireEvent.change(screen.getByLabelText('Valor total'), { target: { value: '100,00' } })
    fireEvent.change(screen.getByLabelText('Número de parcelas'), { target: { value: '3' } })
    expect(screen.getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      expect.stringMatching(/R\$\s33,34$/),
      expect.stringMatching(/R\$\s33,33$/),
      expect.stringMatching(/R\$\s33,33$/),
    ])
    fireEvent.change(screen.getByLabelText(/juros ao mês/i), { target: { value: '2' } })
    expect(screen.getByText(/juros/i, { selector: 'span' })).toHaveTextContent(/^Juros R\$\s4,04$/)
    expect(screen.getByRole('link', { name: 'Criar conta grátis' })).toHaveAttribute('href', '/register')
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

  it('pointing at a person prefetches the profile and its debts (improvement 43)', async () => {
    const { api } = await import('../lib/axios')
    const { fireEvent } = await import('@testing-library/react')
    renderApp('/debtors')
    const link = await screen.findByRole('link', { name: /^João Araújo/ })
    vi.mocked(api.get).mockClear()
    fireEvent.pointerEnter(link)
    await vi.waitFor(() => {
      const urls = vi.mocked(api.get).mock.calls.map((c) => c[0])
      expect(urls).toContain('/debtors/d1')
      expect(urls).toContain('/debtors/d1/debts')
    })
  })

  it('recebimentos shows the total, the bars and the payments', async () => {
    renderApp('/payments')
    expect(await screen.findByRole('heading', { level: 1, name: 'Recebimentos' })).toBeInTheDocument()
    expect(await screen.findByRole('list', { name: 'Recebido por mês' })).toBeInTheDocument()
    // The amount is its own element (<Amount>, improvement 71).
    expect(screen.getByText(/média de/).closest('div')).toHaveTextContent(/média de R\$\s41,67 por mês/)
    expect(screen.getByRole('button', { name: /comprovante: joão araújo, notebook/i })).toBeInTheDocument()
  })

  it('new debt form renders', async () => {
    renderApp('/debts/new')
    expect((await screen.findAllByText(/nova (dívida|cobrança)/i)).length).toBeGreaterThan(0)
  })
})

describe('axe on every screen (improvement 43: axe in the unit tests)', () => {
  beforeEach(() => {
    vi.setSystemTime(new Date('2026-11-05T12:00:00-03:00'))
  })

  const SCREENS: [string, RegExp | string, boolean?][] = [
    ['/', /emprestou\? anota/i, false],
    ['/calculadora-de-parcelas', 'Calculadora de parcelas', false],
    ['/nao-existe', 'Página não encontrada', false],
    ['/login', 'Entrar', false],
    ['/dashboard', /olá, augusto/i],
    ['/debtors', 'Devedores'],
    ['/installments', 'Parcelas'],
    ['/debts/new', 'Nova dívida'],
    ['/payments', 'Recebimentos'],
    ['/settings', 'Configurações'],
  ]
  for (const [path, h1, loggedIn = true] of SCREENS) {
    it(`${path} has no axe violations`, async () => {
      renderApp(path, { loggedIn })
      await screen.findByRole('heading', { level: 1, name: h1 })
      // Let the queries settle so the list rows are checked too.
      await new Promise((r) => setTimeout(r, 50))
      expect(await axeViolations()).toEqual([])
    })
  }

  it('/debtors/:id has no axe violations', async () => {
    renderApp('/debtors/d1')
    await screen.findAllByText('João Araújo')
    await new Promise((r) => setTimeout(r, 50))
    expect(await axeViolations()).toEqual([])
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
