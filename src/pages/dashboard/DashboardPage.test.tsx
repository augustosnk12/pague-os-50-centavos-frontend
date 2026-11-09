import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderApp } from '../../test/renderApp'
import { fakeGet, fixtures } from '../../test/fakeApi'

let get: (url: string) => unknown = fakeGet
vi.mock('../../lib/axios', () => ({
  api: {
    get: vi.fn((url: string) => {
      try {
        return Promise.resolve({ data: get(url) })
      } catch (e) {
        return Promise.reject(e)
      }
    }),
    post: vi.fn(() => Promise.resolve({ data: {} })),
    put: vi.fn(() => Promise.resolve({ data: {} })),
    delete: vi.fn(() => Promise.resolve({ data: {} })),
  },
}))

const EMPTY_OVERVIEW = {
  ...fixtures.overview,
  month: { key: '2026-11', expected: '0.00', received: '0.00', remaining: '0.00', receivedPct: 0 },
  overdue: { amount: '0.00', count: 0, fromPreviousMonths: { amount: '0.00', count: 0 } },
  attention: { overdue: [], today: [], next7: [] },
  counts: { overdue: 0, today: 0, next7: 0 },
}

/** Answers like fakeGet, with some URLs replaced. */
const withOverrides = (o: Record<string, unknown>) => (url: string) => (url in o ? o[url] : fakeGet(url))

describe('Painel (S1)', () => {
  beforeEach(() => {
    vi.setSystemTime(new Date('2026-11-05T12:00:00-03:00'))
    get = fakeGet
    localStorage.removeItem('pague50_prefs')
  })

  it('hero: what is left this month, the month bar and one overdue pill (all months)', async () => {
    renderApp('/dashboard')
    const hero = await screen.findByRole('region', { name: 'A receber em novembro' })
    expect(hero).toHaveTextContent(/R\$\s*250,00/)
    const month = within(hero).getByRole('link', { name: /R\$\s250,00 recebido de|recebido de R\$\s250,00/ })
    expect(month).toHaveAttribute('href', '/installments?period=month')
    const pill = within(hero).getByRole('link', { name: /R\$\s180,00 em atraso · 1 de meses anteriores/ })
    expect(pill).toHaveAttribute('href', '/installments?status=overdue')
    // The old blocks are gone (improvements 2 and 3).
    expect(screen.queryByText('Total a receber agora')).toBeNull()
    expect(screen.queryByRole('button', { name: /mês anterior/i })).toBeNull()
  })

  it('agenda is grouped by due date, with counts, and each row says what it is', async () => {
    renderApp('/dashboard')
    expect(await screen.findByRole('heading', { level: 2, name: 'Em atraso · 2' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Próximos 7 dias · 1' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 2, name: /^Hoje/ })).toBeNull()

    const overdue = screen.getByRole('list', { name: 'Em atraso' })
    const rows = within(overdue).getAllByRole('listitem')
    expect(rows).toHaveLength(2)
    // Oldest first; "1/1" from installmentCount; days counted from the server's today (11-05).
    expect(within(rows[0]).getByRole('button')).toHaveAccessibleName(
      /^João Araújo, Empréstimo, parcela 1 de 1, R\$\s90,00, 16 dias de atraso\. Registrar pagamento$/,
    )
    expect(rows[0]).toHaveTextContent('16d atraso')
    expect(rows[1]).toHaveTextContent('Mercado · 3/6')
    // Older API without the count: "parcela 2".
    expect(screen.getByRole('list', { name: 'Próximos 7 dias' })).toHaveTextContent('Notebook · parcela 2')
    expect(screen.getByRole('list', { name: 'Próximos 7 dias' })).toHaveTextContent('10 nov')
  })

  it('a row opens the payment sheet for that installment; the avatar opens the debtor', async () => {
    const user = userEvent.setup()
    renderApp('/dashboard')
    const overdue = await screen.findByRole('list', { name: 'Em atraso' })
    expect(within(overdue).getAllByRole('link', { name: 'Abrir João Araújo' })[0]).toHaveAttribute('href', '/debtors/d1')
    await user.click(within(overdue).getAllByRole('button')[0])
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
  })

  it('shows at most 4 overdue rows and links to the rest', async () => {
    const many = Array.from({ length: 6 }, (_, k) => ({ ...fixtures.overview.attention.overdue[1], id: `m${k}` }))
    get = withOverrides({
      '/dashboard/overview': { ...fixtures.overview, attention: { ...fixtures.overview.attention, overdue: many }, counts: { overdue: 6, today: 0, next7: 0 } },
    })
    renderApp('/dashboard')
    const list = await screen.findByRole('list', { name: 'Em atraso' })
    expect(within(list).getAllByRole('listitem')).toHaveLength(4)
    expect(screen.getByRole('link', { name: '+ 2 atrasadas' })).toHaveAttribute('href', '/installments?status=overdue')
  })

  it('"Enxuta" folds the next 7 days behind a button', async () => {
    localStorage.setItem('pague50_prefs', JSON.stringify({ detail: 'lean' }))
    const user = userEvent.setup()
    renderApp('/dashboard')
    const more = await screen.findByRole('button', { name: /Próximos 7 dias · 1/ })
    expect(more).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('list', { name: 'Próximos 7 dias' })).toBeNull()
    await user.click(more)
    expect(screen.getByRole('list', { name: 'Próximos 7 dias' })).toBeInTheDocument()
  })

  it('nothing due: "Tudo em dia!" (the account has debts)', async () => {
    get = withOverrides({ '/dashboard/overview': EMPTY_OVERVIEW })
    renderApp('/dashboard')
    expect(await screen.findByText('Tudo em dia!')).toBeInTheDocument()
    expect(screen.queryByText('Comece em 2 passos')).toBeNull()
  })

  it('first use, no debtor: step 2 stays locked and says why', async () => {
    get = withOverrides({
      '/dashboard/overview': EMPTY_OVERVIEW,
      '/me/summary': { debtors: 0, debts: 0, installments: 0, payments: 0 },
      '/debtors': [],
    })
    renderApp('/dashboard')
    const card = await screen.findByRole('region', { name: 'Comece em 2 passos' })
    expect(screen.getByText('Vamos começar?')).toBeInTheDocument()
    expect(within(card).getByRole('button', { name: 'Adicionar' })).toBeInTheDocument()
    const locked = within(card).getByRole('button', { name: 'Nova dívida' })
    expect(locked).toHaveAttribute('aria-disabled', 'true')
    expect(locked).toHaveAccessibleDescription('Liberado depois do passo 1.')
  })

  it('first use, one debtor: step 1 is done and step 2 goes to the new debt with that person', async () => {
    const user = userEvent.setup()
    get = withOverrides({
      '/dashboard/overview': EMPTY_OVERVIEW,
      '/me/summary': { debtors: 1, debts: 0, installments: 0, payments: 0 },
    })
    renderApp('/dashboard')
    expect(await screen.findByText('✓ João cadastrado')).toBeInTheDocument()
    const step2 = within(screen.getByRole('region', { name: 'Comece em 2 passos' })).getByRole('button', { name: 'Nova dívida' })
    expect(step2).not.toHaveAttribute('aria-disabled')
    await user.click(step2)
    expect(await screen.findByPlaceholderText('Empréstimo de junho')).toBeInTheDocument()
    expect(screen.queryByText('Comece em 2 passos')).toBeNull()
  })

  it('load failure is not "no data": error card with retry', async () => {
    get = (url) => {
      if (url === '/dashboard/overview') throw Object.assign(new Error('down'), { response: { status: 503 } })
      return fakeGet(url)
    }
    renderApp('/dashboard')
    expect(await screen.findByRole('alert')).toHaveTextContent(/Não foi possível carregar/)
    expect(screen.queryByText('Tudo em dia!')).toBeNull()
  })
})
