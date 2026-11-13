import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderApp } from '../../test/renderApp'
import { fakeGet, fixtures } from '../../test/fakeApi'
import { api } from '../../lib/axios'

vi.mock('../../lib/axios', () => ({ api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() } }))
const get = vi.mocked(api.get)
const post = vi.mocked(api.post)
const patch = vi.mocked(api.patch)
const del = vi.mocked(api.delete)

const pay = (id: string, amount: string, on: string) => ({ id, amount, paidAt: `${on}T12:00:00.000Z`, batchId: null })
const inst = (id: string, number: number, due: string, amount = '100.00', paid = '0.00', payments: ReturnType<typeof pay>[] = []) => ({
  id, number, amount, paidAmount: paid, dueDate: `${due}T00:00:00.000Z`, paidAt: null, status: 'PENDING', debtId: 'x', payments,
})
const debt = (id: string, description: string, installments: ReturnType<typeof inst>[], extra = {}) => ({
  id, description, type: 'PIX_INSTALLMENT', totalAmount: '0', debtorId: 'd1', createdAt: '2026-01-01', installments, ...extra,
})

// Today: Thursday 2026-11-12.
const NOTEBOOK = debt('nb', 'Notebook', [
  inst('n1', 1, '2026-10-05', '100.00', '100.00', [pay('p1', '100.00', '2026-10-05')]),
  inst('n2', 2, '2026-11-05'), // overdue
  inst('n3', 3, '2026-12-05'),
  inst('n4', 4, '2027-01-05'),
  inst('n5', 5, '2027-02-05'),
])
const MERCADO = debt('mk', 'Mercado', [inst('m1', 1, '2026-11-20', '30.00')], { type: 'PIX' })
const CELULAR = debt('cel', 'Celular', [inst('c1', 1, '2026-09-01', '50.00', '50.00', [pay('p3', '50.00', '2026-09-04')])], { type: 'PIX' })

let debts: unknown[]
let debtor: Record<string, unknown>

describe('Perfil do devedor (S4)', () => {
  beforeEach(() => {
    vi.setSystemTime(new Date('2026-11-12T12:00:00-03:00'))
    debts = [MERCADO, NOTEBOOK, CELULAR]
    debtor = { ...fixtures.debtors[0], notes: 'Paga sempre no dia 10', archivedAt: null }
    for (const m of [get, post, patch, del]) m.mockReset()
    get.mockImplementation((url: string) => {
      if (url === '/debtors/d1') return Promise.resolve({ data: debtor })
      if (url === '/debtors/d1/debts') return Promise.resolve({ data: debts })
      return Promise.resolve({ data: fakeGet(url) })
    })
  })

  it('2-line header with what is owed and late; Cobrar and Nova dívida; 3 tabs with counts', async () => {
    renderApp('/debtors/d1')
    expect(await screen.findByRole('heading', { level: 1, name: /João Araújo/ })).toBeInTheDocument()
    await waitFor(() => expect(document.querySelector('.lt-prof-sum')).toHaveTextContent(/Deve R\$\s430,00 · R\$\s100,00 em atraso/))
    const acts = document.querySelector('.lt-prof-acts') as HTMLElement
    expect(within(acts).getByRole('button', { name: /Cobrar/ })).toBeEnabled()
    expect(within(acts).getByRole('button', { name: /Nova dívida/ })).toBeEnabled()
    const tabs = screen.getByRole('tablist', { name: 'Dívidas' })
    expect(within(tabs).getAllByRole('tab').map((t) => t.textContent)).toEqual(['Em aberto2', 'Quitadas1', 'Pagamentos2'])
  })

  it('open debts as cards, overdue first; next 3 installments; "Ver todas"; Quitar only with 2+ open', async () => {
    const user = userEvent.setup()
    renderApp('/debtors/d1')
    const cards = await screen.findAllByRole('region', { name: /^(Notebook|Mercado)$/ })
    expect(cards.map((c) => c.getAttribute('aria-labelledby'))).toEqual(['divida-h-nb', 'divida-h-mk'])
    const nb = cards[0]
    expect(within(nb).getByRole('list', { name: 'Parcelas de Notebook' }).children).toHaveLength(3)
    expect(nb).toHaveTextContent('Parcela 2/5')
    expect(within(nb).getByRole('button', { name: /^Quitar Notebook, R\$\s400,00$/ })).toBeInTheDocument()
    expect(within(cards[1]).queryByRole('button', { name: /Quitar/ })).toBeNull()
    await user.click(within(nb).getByRole('button', { name: 'Ver todas as 5 parcelas' }))
    expect(within(nb).getByRole('list', { name: 'Parcelas de Notebook' }).children).toHaveLength(5)
  })

  it('Quitar: one PAYOFF batch with what is left of each open installment; "Desfazer" undoes the batch', async () => {
    const user = userEvent.setup()
    post.mockResolvedValue({ data: { batchId: 'B1', kind: 'PAYOFF', installments: [], payments: [{ id: 'q1' }] } })
    del.mockResolvedValue({ data: { installments: [] } })
    renderApp('/debtors/d1')
    await user.click(await screen.findByRole('button', { name: /^Quitar Notebook/ }))
    const sheet = await screen.findByRole('dialog', { name: 'Quitar Notebook' })
    expect(sheet).toHaveTextContent('4 parcelas em aberto de João Araújo serão marcadas como pagas')
    await user.click(within(sheet).getByRole('button', { name: 'Ontem' }))
    await user.click(within(sheet).getByRole('button', { name: /^Quitar dívida · R\$\s400,00$/ }))
    expect(post).toHaveBeenCalledWith('/payments/batch', {
      debtorId: 'd1', kind: 'PAYOFF', paidAt: '2026-11-11',
      allocations: [{ installmentId: 'n2', amount: 100 }, { installmentId: 'n3', amount: 100 }, { installmentId: 'n4', amount: 100 }, { installmentId: 'n5', amount: 100 }],
    })
    expect(await screen.findByText('Notebook quitada')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Comprovante' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Desfazer' }))
    expect(del).toHaveBeenCalledWith('/payments/batch/B1')
  })

  it('Arquivar is blocked (with the reason) while something is owed', async () => {
    const user = userEvent.setup()
    renderApp('/debtors/d1')
    await user.click(await screen.findByRole('button', { name: 'Mais ações' }))
    const menu = await screen.findByRole('dialog', { name: 'João Araújo' })
    const archive = within(menu).getByRole('button', { name: /Arquivar João/ })
    expect(archive).toHaveAttribute('aria-disabled', 'true')
    expect(archive).toHaveTextContent(/Quite os R\$\s430,00 em aberto para arquivar/)
    // Not a touch screen: copy the phone instead of calling.
    expect(within(menu).getByRole('button', { name: /Copiar telefone/ })).toBeInTheDocument()
    await user.click(archive)
    expect(patch).not.toHaveBeenCalled()
  })

  it('all paid off: Arquivar works, shows the banner, "Reativar" brings back', async () => {
    const user = userEvent.setup()
    debts = [CELULAR]
    patch.mockImplementation((url: string) => {
      debtor = { ...debtor, archivedAt: url.endsWith('/archive') ? '2026-11-12T15:00:00.000Z' : null }
      return Promise.resolve({ data: debtor })
    })
    renderApp('/debtors/d1')
    expect(await screen.findByText('Nada em aberto')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Mais ações' }))
    await user.click(within(await screen.findByRole('dialog', { name: 'João Araújo' })).getByRole('button', { name: /Arquivar João/ }))
    expect(patch).toHaveBeenCalledWith('/debtors/d1/archive')
    expect(await screen.findByText('Arquivado · fora das listas e dos totais')).toBeInTheDocument()
    expect(within(document.querySelector('.lt-prof-acts') as HTMLElement).getByRole('button', { name: /Nova dívida/ })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Reativar' }))
    expect(patch).toHaveBeenCalledWith('/debtors/d1/unarchive')
  })

  it('tapping the name opens "Contato e anotações" with the indicators', async () => {
    const user = userEvent.setup()
    renderApp('/debtors/d1')
    await user.click(await screen.findByRole('button', { name: 'Ver contato e anotações de João Araújo' }))
    const sheet = await screen.findByRole('dialog', { name: 'Contato e anotações' })
    expect(sheet).toHaveTextContent('“Paga sempre no dia 10”')
    expect(sheet).toHaveTextContent(/Já recebidoR\$\s150,00/)
    expect(sheet).toHaveTextContent('Pontualidade50%')
    expect(sheet).toHaveTextContent('Parcelas pagas2/7')
  })

  it('Pagamentos: timeline newest first; each one opens its receipt', async () => {
    const user = userEvent.setup()
    renderApp('/debtors/d1')
    await user.click(await screen.findByRole('tab', { name: /Pagamentos/ }))
    const list = screen.getByRole('list', { name: 'Pagamentos' })
    const rows = within(list).getAllByRole('button')
    expect(rows[0]).toHaveAccessibleName(/^Comprovante: Notebook, parcela 1 de 5/)
    expect(list).toHaveTextContent('3d após o vencimento')
    await user.click(rows[0])
    expect(await screen.findByRole('dialog', { name: 'Comprovante' })).toBeInTheDocument()
  })

  it('a paid-off debt picked in the search opens in Quitadas, expanded', async () => {
    renderApp('/debtors/d1?divida=cel')
    await waitFor(() => expect(screen.getByRole('tab', { name: /Quitadas/ })).toHaveAttribute('aria-selected', 'true'))
    expect(await screen.findByRole('list', { name: 'Parcelas de Celular' })).toBeInTheDocument()
  })
})
