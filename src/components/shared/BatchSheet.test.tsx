import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderApp } from '../../test/renderApp'
import { fakeGet, fixtures } from '../../test/fakeApi'
import { api } from '../../lib/axios'

vi.mock('../../lib/axios', () => ({ api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() } }))
const get = vi.mocked(api.get)
const post = vi.mocked(api.post)
const del = vi.mocked(api.delete)

const inst = (id: string, number: number, due: string, amount = '100.00') => ({
  id, number, amount, paidAmount: '0.00', dueDate: `${due}T00:00:00.000Z`, paidAt: null, status: 'PENDING', debtId: 'x', payments: [],
})
const debt = (id: string, description: string, installments: ReturnType<typeof inst>[], type = 'PIX_INSTALLMENT') => ({
  id, description, type, totalAmount: '0', debtorId: 'd1', createdAt: '2026-01-01', installments,
})

// Today: Thursday 2026-11-12. This month: Notebook 2/4 (late) and Mercado; later: Notebook 3/4 and 4/4.
const DEBTS = [
  debt('nb', 'Notebook', [inst('n2', 2, '2026-11-05'), inst('n3', 3, '2026-12-05'), inst('n4', 4, '2027-01-05'), { ...inst('n1', 1, '2026-10-05'), paidAmount: '100.00' }]),
  debt('mk', 'Mercado', [inst('m1', 1, '2026-11-20', '30.00')], 'PIX'),
]

const sheet = () => screen.findByRole('dialog', { name: /Receber várias parcelas de João Araújo/ })
const box = (name: RegExp) => screen.getByRole('checkbox', { name })

describe('Receber várias de uma vez (S7)', () => {
  beforeEach(() => {
    vi.setSystemTime(new Date('2026-11-12T12:00:00-03:00'))
    for (const m of [get, post, del]) m.mockReset()
    get.mockImplementation((url: string) => {
      if (url === '/debtors/d1') return Promise.resolve({ data: { ...fixtures.debtors[0], archivedAt: null } })
      if (url === '/debtors/d1/debts') return Promise.resolve({ data: DEBTS })
      return Promise.resolve({ data: fakeGet(url) })
    })
  })

  it('opens from the profile with this month selected; the amount follows the selection', async () => {
    const user = userEvent.setup()
    renderApp('/debtors/d1')
    await user.click(await screen.findByRole('button', { name: /Receber várias de uma vez/ }))
    const s = await sheet()
    expect(box(/^Notebook · 2\/4, venceu/)).toHaveAttribute('aria-checked', 'true')
    expect(box(/^Mercado/)).toHaveAttribute('aria-checked', 'true')
    expect(within(s).queryByRole('checkbox', { name: /Notebook · 3\/4/ })).toBeNull()
    expect(within(s).getByRole('textbox', { name: 'Valor recebido' })).toHaveValue('130,00')
    expect(within(s).getByRole('status')).toHaveTextContent('Quita 2 parcelas')
    expect(screen.getByRole('button', { name: /^Registrar R\$\s130,00 em 2 parcelas$/ })).toBeEnabled()

    await user.click(within(s).getByRole('button', { name: /Mais adiante · 2/ }))
    await user.click(box(/^Notebook · 3\/4/))
    expect(within(s).getByRole('textbox', { name: 'Valor recebido' })).toHaveValue('230,00')
    await user.click(box(/^Mercado/))
    expect(screen.getByRole('button', { name: /^Registrar R\$\s200,00 em 2 parcelas$/ })).toBeEnabled()
  })

  it('"Marcar todas" / "Desmarcar todas" in each group', async () => {
    const user = userEvent.setup()
    renderApp('/debtors/d1')
    await user.click(await screen.findByRole('button', { name: /Receber várias de uma vez/ }))
    const s = await sheet()
    const amount = within(s).getByRole('textbox', { name: 'Valor recebido' })
    await user.click(within(s).getByRole('button', { name: 'Desmarcar todas até o fim de novembro' }))
    expect(box(/^Mercado/)).toHaveAttribute('aria-checked', 'false')
    expect(within(s).getByRole('status')).toHaveTextContent('Marque as parcelas que esse pagamento cobre')
    await user.click(within(s).getByRole('button', { name: 'Marcar todas até o fim de novembro' }))
    expect(amount).toHaveValue('130,00')

    await user.click(within(s).getByRole('button', { name: /Mais adiante · 2/ }))
    await user.click(within(s).getByRole('button', { name: 'Marcar todas mais adiante' }))
    expect(amount).toHaveValue('330,00')
    expect(within(s).getByRole('button', { name: /Mais adiante · 2\s*\(2 marcadas\)/ })).toBeInTheDocument()
    await user.click(within(s).getByRole('button', { name: 'Desmarcar todas mais adiante' }))
    expect(amount).toHaveValue('130,00')
  })

  it('a smaller amount pays the oldest first and leaves the last one partial; one BATCH; Desfazer undoes it', async () => {
    const user = userEvent.setup()
    post.mockResolvedValue({ data: { batchId: 'B1', kind: 'BATCH', installments: [], payments: [{ id: 'q1', installmentId: 'n2' }] } })
    del.mockResolvedValue({ data: { installments: [] } })
    renderApp('/debtors/d1')
    await user.click(await screen.findByRole('button', { name: /Receber várias de uma vez/ }))
    const s = await sheet()
    const amount = within(s).getByRole('textbox', { name: 'Valor recebido' })
    await user.clear(amount)
    await user.type(amount, '11000')
    expect(within(s).getByRole('status')).toHaveTextContent('Quita 1 · Mercado fica parcial (restam R$ 20,00)')
    expect(within(s).getByRole('button', { name: /Usar o total das marcadas/ })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /^Registrar R\$\s110,00 em 2 parcelas$/ }))
    expect(post).toHaveBeenCalledWith('/payments/batch', {
      debtorId: 'd1', kind: 'BATCH', paidAt: '2026-11-12',
      allocations: [{ installmentId: 'n2', amount: 100 }, { installmentId: 'm1', amount: 10 }],
    })
    expect(await screen.findByText(/R\$\s110,00 registrados em 2 parcelas/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Comprovante' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Desfazer' }))
    expect(del).toHaveBeenCalledWith('/payments/batch/B1')
  })

  it('more than the selected ones blocks; "Usar o total das marcadas" goes back', async () => {
    const user = userEvent.setup()
    renderApp('/debtors/d1')
    await user.click(await screen.findByRole('button', { name: /Receber várias de uma vez/ }))
    const s = await sheet()
    const amount = within(s).getByRole('textbox', { name: 'Valor recebido' })
    await user.clear(amount)
    await user.type(amount, '20000')
    expect(within(s).getByRole('status')).toHaveTextContent('R$ 70,00 a mais do que as marcadas · marque mais parcelas')
    expect(within(s).getByRole('button', { name: /^Registrar/ })).toBeDisabled()
    await user.click(within(s).getByRole('button', { name: /Usar o total das marcadas R\$\s130,00/ }))
    expect(amount).toHaveValue('130,00')
    expect(post).not.toHaveBeenCalled()
  })

  it('"Pagou mais de uma parcela?" in the payment sheet opens it with that installment selected', async () => {
    const user = userEvent.setup()
    renderApp('/debtors/d1')
    await user.click(await screen.findByRole('button', { name: 'Ver todas as 4 parcelas' }))
    const nb = screen.getByRole('region', { name: 'Notebook' })
    await user.click(within(nb).getByRole('button', { name: /parcela 4 de 4.*Registrar pagamento/ }))
    await user.click(await screen.findByRole('button', { name: /Pagou mais de uma parcela\?/ }))
    await sheet()
    expect(box(/^Notebook · 4\/4/)).toHaveAttribute('aria-checked', 'true')
    expect(box(/^Notebook · 3\/4/)).toHaveAttribute('aria-checked', 'false')
    expect(screen.getByRole('button', { name: /^Registrar R\$\s230,00 em 3 parcelas$/ })).toBeEnabled()
  })
})
