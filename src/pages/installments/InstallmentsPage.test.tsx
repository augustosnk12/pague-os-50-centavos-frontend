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

  it('top: "Parcelas", a "Mês" chip and "Todos"; frame with the month and "A receber" always in sight; 3 tabs, count only on Atrasadas', async () => {
    renderApp('/installments')
    expect(await screen.findByText('Novembro 2026')).toBeInTheDocument()
    expect(screen.getByText('Este mês')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ver por: Mês' })).toHaveAttribute('aria-haspopup', 'menu')
    expect(screen.getByRole('button', { name: 'Filtrar por devedor: todos os devedores' })).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: /^A receber/ })).toHaveTextContent(/A receber\s*R\$\s300,00/)
    const tabs = screen.getByRole('tablist', { name: 'Situação' })
    expect(within(tabs).getAllByRole('tab').map((t) => t.textContent)).toEqual(['A receber', 'Atrasadas2', 'Pagas'])
    expect(within(tabs).getByRole('tab', { name: /A receber/ })).toHaveAttribute('aria-selected', 'true')
    // Left the screen: the fixed Dia/Semana/Mês, "Todas" and the earlier-overdue strip.
    expect(screen.queryByRole('radio', { name: 'Mês' })).toBeNull()
    expect(screen.queryByRole('tab', { name: /Todas/ })).toBeNull()
    expect(screen.queryByRole('button', { name: /de antes deste período/ })).toBeNull()
  })

  it('"Mês ▾" menu: Dia · Semana · Mês with ✓ on the chosen one; picking changes the period', async () => {
    const user = userEvent.setup()
    renderApp('/installments')
    await user.click(await screen.findByRole('button', { name: 'Ver por: Mês' }))
    const menu = screen.getByRole('menu', { name: 'Ver por' })
    expect(within(menu).getAllByRole('menuitemradio').map((i) => [i.textContent, i.getAttribute('aria-checked')])).toEqual([['Dia', 'false'], ['Semana', 'false'], ['Mês', 'true']])
    await waitFor(() => expect(within(menu).getByRole('menuitemradio', { name: 'Mês' })).toHaveFocus())
    await user.keyboard('{ArrowUp}{Enter}')
    expect(await screen.findByText('2 – 8 nov')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ver por: Semana' })).toHaveFocus()
  })

  it('list by day: the header has only the date; lean rows (no avatar, no "Receber"); the tag only when overdue', async () => {
    renderApp('/installments')
    const panel = await screen.findByRole('tabpanel')
    const today = await within(panel).findByRole('heading', { level: 2, name: /^Hoje, quinta, 5 de novembro$/ })
    expect(today).not.toHaveTextContent(/R\$/)
    expect(within(panel).getByText('Atrasada')).toBeInTheDocument()
    expect(within(panel).getByText('3d atraso')).toBeInTheDocument()
    // The "Receber" pill is gone (the swipe hint behind each row stays).
    expect(panel.querySelector('.lt-recv')).toBeNull()
    expect(within(panel).queryByRole('link', { name: /^Abrir / })).toBeNull()
    // A receber does not list the paid one nor the overdue from October.
    expect(within(panel).queryByText('Paga hoje')).toBeNull()
    expect(within(panel).queryByText('Antigo')).toBeNull()
  })

  it('Atrasadas lists every overdue one, earlier months first; state comes from the URL', async () => {
    renderApp('/installments?aba=atrasadas')
    const panel = await screen.findByRole('tabpanel')
    await within(panel).findByRole('heading', { level: 2, name: /^terça, 20 de outubro/ })
    expect(screen.getByRole('tab', { name: /Atrasadas/ })).toHaveAttribute('aria-selected', 'true')
    expect(within(panel).getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual([expect.stringMatching(/^ter, 20 out/), expect.stringMatching(/^seg, 02 nov/)])
  })

  it('Pagas: the paid ones of the period', async () => {
    renderApp('/installments?aba=pagas')
    const panel = await screen.findByRole('tabpanel')
    expect(await within(panel).findByText('Paga hoje')).toBeInTheDocument()
    expect(within(panel).queryByText('Futura')).toBeNull()
  })

  it('old links still work (?status=overdue, ?period=week, ?aba=todas)', async () => {
    renderApp('/installments?period=week&status=overdue')
    expect(await screen.findByText('2 – 8 nov')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /Atrasadas/ })).toHaveAttribute('aria-selected', 'true')
  })

  it('tabs: arrow keys move and select', async () => {
    const user = userEvent.setup()
    renderApp('/installments')
    const open = await screen.findByRole('tab', { name: /A receber/ })
    open.focus()
    await user.keyboard('{ArrowRight}')
    await waitFor(() => expect(screen.getByRole('tab', { name: /Atrasadas/ })).toHaveFocus())
    expect(screen.getByRole('tab', { name: /Atrasadas/ })).toHaveAttribute('aria-selected', 'true')
  })

  it('arrows change the period; outside the current one, "Voltar para hoje"', async () => {
    const user = userEvent.setup()
    renderApp('/installments')
    await screen.findByText('Novembro 2026')
    await user.click(screen.getAllByRole('button', { name: 'Período anterior' })[0])
    expect(screen.getByText('Outubro 2026')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Voltar para hoje' }))
    expect(screen.getByText('Novembro 2026')).toBeInTheDocument()
    expect(screen.getByText('Este mês')).toBeInTheDocument()
  })

  it('day mode: week strip inside the frame; tapping a day shows it', async () => {
    const user = userEvent.setup()
    renderApp('/installments?periodo=dia')
    const frame = await screen.findByRole('region', { name: 'Período e total' })
    const strip = await within(frame).findByRole('group', { name: 'Dias da semana' })
    const today = await within(strip).findByRole('button', { name: 'quinta, 5 de novembro, 2 parcelas' })
    expect(today).toHaveAttribute('aria-pressed', 'true')
    expect(today).toHaveAttribute('aria-current', 'date')
    await user.click(within(strip).getByRole('button', { name: 'segunda, 2 de novembro, 1 parcela' }))
    expect(await screen.findByRole('heading', { level: 2, name: /^segunda, 2 de novembro/ })).toBeInTheDocument()
  })

  it('debtor filter: label tells who; list and totals follow', async () => {
    const user = userEvent.setup()
    renderApp('/installments')
    await screen.findByRole('tab', { name: /A receber/ })
    await user.click(screen.getByRole('button', { name: 'Filtrar por devedor: todos os devedores' }))
    const sheet = await screen.findByRole('dialog', { name: 'Filtrar por devedor' })
    await user.click(within(sheet).getByRole('button', { name: /Paula Prado/ }))
    await user.click(within(sheet).getByRole('button', { name: 'Ver 1 devedor' }))
    expect(await screen.findByRole('button', { name: 'Filtrar por devedor: Paula Prado' })).toHaveTextContent('Paula')
    expect(screen.getByRole('button', { name: /^A receber/ })).toHaveTextContent(/R\$\s100,00/)
    expect(screen.getByRole('tab', { name: /Atrasadas/ })).toHaveTextContent('Atrasadas0')
  })

  it('the arrow of "A receber": 3-colour breakdown and % received; ?resumo=1 (from the Painel) opens it; remembered', async () => {
    const user = userEvent.setup()
    renderApp('/installments?resumo=1')
    const total = await screen.findByRole('button', { name: /^A receber/ })
    expect(total).toHaveAttribute('aria-expanded', 'true')
    // Only the arrow: no "Detalhes" / "Ocultar" text.
    expect(total).not.toHaveTextContent(/Detalhes|Ocultar/)
    expect(screen.getByText(/R\$\s400,00 previsto neste mês · 25% recebido/)).toBeInTheDocument()
    expect(screen.getByText('Recebido').closest('div')).toHaveTextContent(/R\$\s100,00/)
    await user.click(total)
    expect(total).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByText(/previsto neste mês/)).toBeNull()
    expect(localStorage.getItem('pague50_parcelas_resumo')).toBe('0')
  })

  it('a row opens the payment sheet', async () => {
    const user = userEvent.setup()
    renderApp('/installments')
    await user.click(await screen.findByRole('button', { name: /^João Araújo, De hoje/ }))
    expect(await screen.findByRole('dialog', { name: 'Registrar pagamento de João Araújo' })).toBeInTheDocument()
  })
})
