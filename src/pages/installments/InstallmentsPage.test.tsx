import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderApp } from '../../test/renderApp'
import { fakeGet, fixtures } from '../../test/fakeApi'
import { api } from '../../lib/axios'
import type { InstallmentEnriched } from '../../types/installment'

vi.mock('../../lib/axios', () => ({
  api: { get: vi.fn(), post: vi.fn(() => Promise.resolve({ data: {} })), put: vi.fn(), delete: vi.fn() },
}))
const get = vi.mocked(api.get)

let seq = 0
const inst = (due: string, o: { amount?: string; paid?: string; debtor?: [string, string]; desc?: string } = {}): InstallmentEnriched => {
  const [id, name] = o.debtor ?? ['d1', 'João Araújo']
  return {
    id: `t${++seq}`, number: 1, amount: o.amount ?? '100.00', paidAmount: o.paid ?? '0.00', dueDate: `${due}T00:00:00.000Z`,
    paidAt: null, status: 'PENDING', debtId: `debt${seq}`, payments: [],
    debt: { id: `debt${seq}`, description: o.desc ?? 'Notebook', type: 'PIX', debtorId: id, installmentCount: 3, recurrence: null, debtor: { id, name, avatarHue: 200, avatarEmoji: null } },
  }
}

// Today is Thursday 2026-11-05.
const ROWS = [
  inst('2026-10-20', { desc: 'Antigo' }), // overdue from before November
  inst('2026-11-02', { desc: 'Atrasada' }),
  inst('2026-11-05', { desc: 'De hoje' }),
  inst('2026-11-05', { desc: 'Paga hoje', paid: '100.00' }),
  inst('2026-11-20', { desc: 'Futura', debtor: ['d2', 'Paula Prado'] }),
]

describe('Parcelas (S3)', () => {
  beforeEach(() => {
    vi.setSystemTime(new Date('2026-11-05T12:00:00-03:00'))
    localStorage.clear()
    get.mockReset()
    get.mockImplementation((url: string) => {
      if (url === '/installments') return Promise.resolve({ data: ROWS })
      if (url === '/debtors') return Promise.resolve({ data: [...fixtures.debtors, { ...fixtures.debtors[0], id: 'd2', name: 'Paula Prado' }] })
      return Promise.resolve({ data: fakeGet(url) })
    })
  })

  it('asks the API for the period plus earlier overdue, with the local today', async () => {
    renderApp('/installments')
    await screen.findByRole('heading', { level: 1, name: 'Parcelas' })
    await waitFor(() =>
      expect(get).toHaveBeenCalledWith('/installments', { params: { period: 'month', date: '2026-11-05', today: '2026-11-05', includeOverdueBefore: true } }),
    )
  })

  it('period card, 4 tabs with counts (Atrasadas includes earlier months)', async () => {
    renderApp('/installments')
    expect(await screen.findByText('Novembro 2026')).toBeInTheDocument()
    expect(screen.getByText('Este mês')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Mês' })).toHaveAttribute('aria-pressed', 'true')
    const tabs = screen.getByRole('tablist', { name: 'Situação' })
    await within(tabs).findByRole('tab', { name: /Todas\s*4/ })
    expect(within(tabs).getAllByRole('tab').map((t) => t.textContent)).toEqual(['Todas4', 'Em aberto3', 'Atrasadas2', 'Pagas1'])
    expect(within(tabs).getByRole('tab', { name: /Todas/ })).toHaveAttribute('aria-selected', 'true')
  })

  it('list by day: headers with what is left, paid folded in Todas, earlier overdue folded on top', async () => {
    const user = userEvent.setup()
    renderApp('/installments')
    const panel = await screen.findByRole('tabpanel')
    expect(await within(panel).findByRole('heading', { level: 2, name: /^Hoje, quinta, 5 de novembro, 2 parcelas/ })).toHaveTextContent(/R\$\s100,00 a receber · 1 paga/)
    expect(within(panel).getByRole('heading', { level: 2, name: /^segunda, 2 de novembro/ })).toBeInTheDocument()
    // Paid row of today is folded into one line.
    expect(within(panel).queryByText('Paga hoje')).toBeNull()
    await user.click(within(panel).getByRole('button', { name: /^1 paga, R\$\s100,00\. Mostrar$/ }))
    expect(within(panel).getByText(/Paga hoje/)).toBeInTheDocument()
    // Earlier overdue: one folded line.
    const prev = within(panel).getByRole('button', { name: /1 atrasada de antes deste período/ })
    expect(prev).toHaveAttribute('aria-expanded', 'false')
    await user.click(prev)
    expect(within(panel).getByRole('list', { name: 'Atrasadas de antes deste período' })).toHaveTextContent('Antigo')
  })

  it('Atrasadas shows the earlier ones inside the list; state comes from the URL', async () => {
    renderApp('/installments?aba=atrasadas')
    const panel = await screen.findByRole('tabpanel')
    await within(panel).findByRole('heading', { level: 2, name: /^terça, 20 de outubro/ })
    expect(screen.getByRole('tab', { name: /Atrasadas/ })).toHaveAttribute('aria-selected', 'true')
    expect(within(panel).getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual([expect.stringMatching(/^ter, 20 out/), expect.stringMatching(/^seg, 02 nov/)])
    expect(within(panel).queryByRole('button', { name: /de antes deste período/ })).toBeNull()
  })

  it('old links still work (?status=overdue, ?period=week)', async () => {
    renderApp('/installments?period=week&status=overdue')
    expect(await screen.findByText('2 – 8 nov')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /Atrasadas/ })).toHaveAttribute('aria-selected', 'true')
  })

  it('tabs: arrow keys move and select', async () => {
    const user = userEvent.setup()
    renderApp('/installments')
    const all = await screen.findByRole('tab', { name: /Todas\s*4/ })
    all.focus()
    await user.keyboard('{ArrowRight}')
    await waitFor(() => expect(screen.getByRole('tab', { name: /Em aberto/ })).toHaveFocus())
    expect(screen.getByRole('tab', { name: /Em aberto/ })).toHaveAttribute('aria-selected', 'true')
  })

  it('arrows change the period; "Hoje" comes back', async () => {
    const user = userEvent.setup()
    renderApp('/installments')
    await screen.findByText('Novembro 2026')
    await user.click(screen.getAllByRole('button', { name: 'Período anterior' })[0])
    expect(screen.getByText('Outubro 2026')).toBeInTheDocument()
    expect(screen.getByText(/^Mês passado/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Ir para o período atual' }))
    expect(screen.getByText('Novembro 2026')).toBeInTheDocument()
  })

  it('day mode: week strip with dots; tapping a day shows it', async () => {
    const user = userEvent.setup()
    renderApp('/installments?periodo=dia')
    const strip = await screen.findByRole('group', { name: 'Dias da semana' })
    const today = await within(strip).findByRole('button', { name: 'quinta, 5 de novembro, 2 parcelas' })
    expect(today).toHaveAttribute('aria-pressed', 'true')
    expect(today).toHaveAttribute('aria-current', 'date')
    await user.click(within(strip).getByRole('button', { name: 'segunda, 2 de novembro, 1 parcela' }))
    expect(await screen.findByRole('heading', { level: 2, name: /^segunda, 2 de novembro/ })).toBeInTheDocument()
  })

  it('debtor filter: label tells who; list and counts follow', async () => {
    const user = userEvent.setup()
    renderApp('/installments')
    await screen.findByRole('tab', { name: /Todas\s*4/ })
    await user.click(screen.getByRole('button', { name: 'Filtrar por devedor: todos os devedores' }))
    const sheet = await screen.findByRole('dialog', { name: 'Filtrar por devedor' })
    await user.click(within(sheet).getByRole('button', { name: /Paula Prado/ }))
    await user.click(within(sheet).getByRole('button', { name: 'Ver 1 devedor' }))
    expect(await screen.findByRole('button', { name: 'Filtrar por devedor: Paula Prado' })).toHaveTextContent('Paula')
    expect(screen.getByRole('tab', { name: /Todas/ })).toHaveTextContent('Todas1')
  })

  it('totals: one folded line; ?resumo=1 (from the Painel) opens it; legend filters', async () => {
    const user = userEvent.setup()
    renderApp('/installments?resumo=1')
    await screen.findByRole('tab', { name: /Todas\s*4/ })
    const line = screen.getByRole('button', { name: /a receber/ })
    expect(line).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText(/R\$\s400,00 previsto neste mês · 25% recebido/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Atrasado/ }))
    expect(screen.getByRole('tab', { name: /Atrasadas/ })).toHaveAttribute('aria-selected', 'true')
  })

  it('a row opens the payment sheet', async () => {
    const user = userEvent.setup()
    renderApp('/installments')
    await user.click(await screen.findByRole('button', { name: /^João Araújo, De hoje/ }))
    expect(await screen.findByRole('dialog', { name: 'Registrar pagamento de João Araújo' })).toBeInTheDocument()
  })
})
