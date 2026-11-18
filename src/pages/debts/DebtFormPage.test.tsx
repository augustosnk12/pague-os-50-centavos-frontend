import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderApp } from '../../test/renderApp'
import { fakeGet, fixtures } from '../../test/fakeApi'
import { api } from '../../lib/axios'

vi.mock('../../lib/axios', () => ({ api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() } }))
const get = vi.mocked(api.get)
const post = vi.mocked(api.post)

const person = (id: string, name: string, createdAt: string) => ({ ...fixtures.debtors[0], id, name, createdAt, archivedAt: null })
// Today: Friday 2026-11-13.
const DEBTORS = [
  person('d1', 'João Araújo', '2026-01-01'),
  person('d2', 'Ana Souza', '2026-03-01'),
  person('d3', 'Bruno Lima', '2026-05-01'),
  person('d4', 'Carla Dias', '2026-07-01'),
  person('d5', 'Davi Melo', '2026-09-01'),
]
const OWES = [{ id: 'x', description: 'Fone', type: 'PIX', totalAmount: '0', debtorId: 'd1', createdAt: '2026-01-01',
  installments: [{ id: 'i1', number: 1, amount: '80.00', paidAmount: '0.00', dueDate: '2026-11-01T00:00:00.000Z', paidAt: null, status: 'PENDING', debtId: 'x', payments: [] }] }]

const footer = () => document.querySelector('.lt-nd-foot') as HTMLElement
const createBtn = () => within(footer()).getByRole('button', { name: /^Criar dívida/ })

describe('Nova dívida (S8)', () => {
  beforeEach(() => {
    vi.setSystemTime(new Date('2026-11-13T12:00:00-03:00'))
    localStorage.clear()
    get.mockReset()
    post.mockReset()
    get.mockImplementation((url: string) => {
      if (url === '/debtors') return Promise.resolve({ data: DEBTORS })
      if (url === '/settings') return Promise.resolve({ data: { defaultCardDueDay: 10, defaultPixInstallmentDueDay: null, pixKey: null, pixKeyType: null } })
      if (url === '/debtors/d1/debts') return Promise.resolve({ data: OWES })
      return Promise.resolve({ data: fakeGet(url) })
    })
  })

  it('nothing preselected; the 4 newest as chips; the footer says what is missing and the button focuses it', async () => {
    const user = userEvent.setup()
    renderApp('/debts/new')
    const chips = await screen.findByRole('group', { name: /Para quem\?/ })
    await waitFor(() => expect(within(chips).getAllByRole('button')).toHaveLength(5))
    expect(within(chips).getAllByRole('button').map((b) => b.getAttribute('aria-label') ?? b.textContent?.trim())).toEqual(['Buscar devedor', 'Escolher Davi Melo', 'Escolher Carla Dias', 'Escolher Bruno Lima', 'Escolher Ana Souza'])
    expect(within(footer()).getByRole('status')).toHaveTextContent('Escolha para quem é a dívida')
    expect(createBtn()).toHaveAttribute('aria-disabled', 'true')
    await user.click(createBtn())
    expect(within(chips).getByRole('button', { name: 'Buscar devedor' })).toHaveFocus()
    expect(post).not.toHaveBeenCalled()

    await user.click(within(chips).getByRole('button', { name: 'Escolher Ana Souza' }))
    expect(within(footer()).getByRole('status')).toHaveTextContent('Informe o valor')
  })

  it('search (no accents needed) → card with the balance; card type uses its default day; preview like the API; creates and opens the profile', async () => {
    const user = userEvent.setup()
    post.mockResolvedValue({ data: { debt: { id: 'nd1' }, installments: [{}, {}, {}] } })
    renderApp('/debts/new')
    await user.click(await screen.findByRole('button', { name: 'Buscar devedor' }))
    const sheet = await screen.findByRole('dialog', { name: 'Para quem é a dívida?' })
    await user.type(within(sheet).getByRole('textbox', { name: 'Buscar devedor pelo nome' }), 'joao')
    await user.click(within(sheet).getByRole('button', { name: /João Araújo/ }))
    const card = await screen.findByRole('button', { name: 'Trocar devedor (João Araújo)' })
    await waitFor(() => expect(card).toHaveTextContent(/Já deve R\$\s80,00 · 1 em atraso/))

    expect(screen.getByRole('button', { name: /Pix parcelado\s*Parcelado/ })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Cartão de crédito/ }))
    expect(screen.getByRole('textbox', { name: /Primeiro vencimento/ })).toHaveValue('10/12/2026')
    expect(screen.getByText('Padrão do cartão: dia 10')).toBeInTheDocument()

    await user.type(screen.getByRole('textbox', { name: /Valor total/ }), '20000')
    await user.type(screen.getByRole('textbox', { name: 'Parcelas' }), '3')
    const pv = screen.getByRole('region', { name: 'Prévia das parcelas' })
    expect(pv).toHaveTextContent(/3× de até R\$\s66,67/)
    expect(pv.querySelectorAll('.lt-nd-pv-row b')[0]).toHaveTextContent(/66,66/)

    await user.click(createBtn())
    expect(post).toHaveBeenCalledWith('/debts', {
      debtorId: 'd1', type: 'CREDIT_CARD', totalAmount: '200.00', numberOfInstallments: 3,
      firstDueDate: '2026-12-10T00:00:00.000Z', description: null,
    })
    expect(await screen.findByRole('heading', { level: 1, name: /João Araújo/ })).toBeInTheDocument()
    expect(JSON.parse(localStorage.getItem('lt-recent-debtors') ?? '[]')).toEqual(['d1'])
  })

  it('"Repetir todo mês" (Pix): value per month, how it ends, next charges; sends the recurrence', async () => {
    const user = userEvent.setup()
    post.mockResolvedValue({ data: { debt: { id: 'nd2' }, installments: [{}] } })
    renderApp('/debts/new?debtorId=d2')
    await screen.findByRole('button', { name: 'Trocar devedor (Ana Souza)' })
    expect(screen.getByText(/Pix é cobrança à vista \(1 parcela\)/)).toBeInTheDocument()
    await user.click(screen.getByRole('switch', { name: /Repetir todo mês/ }))
    await user.type(screen.getByRole('textbox', { name: /Valor por mês/ }), '15000')
    expect(screen.getByText('Depois, todo dia 1')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Após' }))
    expect(within(footer()).getByRole('status')).toHaveTextContent('Informe por quantos meses')
    await user.click(createBtn())
    expect(post).not.toHaveBeenCalled()
    await user.type(document.querySelector('#nd-recn input') as HTMLElement, '6')
    const pv = screen.getByRole('region', { name: 'Prévia das cobranças' })
    expect(pv).toHaveTextContent('6 cobranças no total')
    expect(within(footer()).getByRole('button', { name: 'Criar dívida recorrente p/ Ana' })).toBeInTheDocument()
    await user.click(createBtn())
    expect(post).toHaveBeenCalledWith('/debts', {
      debtorId: 'd2', type: 'PIX', totalAmount: '150.00', numberOfInstallments: 1, firstDueDate: '2026-12-01T00:00:00.000Z', description: null,
      recurrence: { type: 'MONTHLY', occurrences: 6, endsAt: null }, today: '2026-11-13',
    })
  })

  it('"Cadastrar “nome”" opens the new debtor form with the name typed', async () => {
    const user = userEvent.setup()
    renderApp('/debts/new')
    await user.click(await screen.findByRole('button', { name: 'Buscar devedor' }))
    const sheet = await screen.findByRole('dialog', { name: 'Para quem é a dívida?' })
    await user.type(within(sheet).getByRole('textbox', { name: 'Buscar devedor pelo nome' }), 'Zé Novo')
    expect(within(sheet).queryAllByRole('button', { name: /Araújo|Souza/ })).toHaveLength(0)
    await user.click(within(sheet).getByRole('button', { name: 'Cadastrar “Zé Novo”' }))
    const form = await screen.findByRole('dialog', { name: 'Novo devedor' })
    expect(within(form).getByRole('textbox', { name: /Nome/ })).toHaveValue('Zé Novo')
  })
})
