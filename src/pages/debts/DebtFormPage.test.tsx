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
    await user.click(screen.getByRole('radio', { name: 'Após' }))
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

  it('item 66: split — who (everyone listed to tick, tokens), parts at the end (equal / different, installments), "Criar 3 dívidas" with Desfazer', async () => {
    const user = userEvent.setup()
    const del = vi.mocked(api.delete)
    del.mockReset().mockResolvedValue({ data: { deleted: 3 } })
    post.mockResolvedValue({ data: { splitId: 's1', debts: ['d1', 'd2', 'd3'].map((id) => ({ debt: { id: `n-${id}`, debtorId: id }, installments: [] })) } })
    renderApp('/debts/new?debtorId=d1')
    await screen.findByRole('button', { name: 'Trocar devedor (João Araújo)' })
    await user.click(screen.getByRole('switch', { name: /Dividir com mais pessoas/ }))
    expect(within(footer()).getByRole('status')).toHaveTextContent('Escolha com quem dividir')

    // Everyone is listed to tick (no name to remember): the newest first, without João (the main person); few people, no filter.
    const all = screen.getByRole('list', { name: 'Seus devedores' })
    expect(within(all).getAllByRole('checkbox').map((b) => b.textContent?.replace(/^[A-Z]{2}/, ''))).toEqual(['Davi Melo', 'Carla Dias', 'Bruno Lima', 'Ana Souza'])
    expect(screen.queryByRole('textbox', { name: 'Filtrar devedores pelo nome' })).toBeNull()
    await user.click(within(all).getByRole('checkbox', { name: /Ana Souza/ }))
    await user.click(within(all).getByRole('checkbox', { name: /Davi Melo/ }))
    expect(within(all).getByRole('checkbox', { name: /Davi Melo/ })).toHaveAttribute('aria-checked', 'true')
    // Unticking (or × on the token) takes the person out; the order of the list does not move.
    await user.click(within(all).getByRole('checkbox', { name: /Davi Melo/ }))
    await user.click(within(all).getByRole('checkbox', { name: /Bruno Lima/ }))
    expect(within(all).getAllByRole('checkbox').map((b) => b.getAttribute('aria-checked'))).toEqual(['false', 'false', 'true', 'true'])
    const toks = screen.getByRole('list', { name: 'Quem divide' })
    expect(within(toks).getAllByRole('listitem').map((li) => li.textContent?.trim().replace(/^[A-Z]{1,2}(?=[A-ZÀ-Ú])/, ''))).toEqual(['Joãoprincipal', 'Ana', 'Bruno', 'Você'])
    expect(screen.getByText('4 pessoas')).toBeInTheDocument()

    // Cartão in 3×: R$ 320,00 ÷ 4 = R$ 80,00 each, "R$ 26,66 + 2× R$ 26,67"; the total preview is gone.
    await user.click(screen.getByRole('button', { name: /Cartão de crédito/ }))
    await user.type(screen.getByRole('textbox', { name: /Valor total da conta/ }), '32000')
    await user.type(screen.getByRole('textbox', { name: 'Parcelas' }), '3')
    expect(screen.queryByRole('region', { name: 'Prévia das parcelas' })).toBeNull()
    const parts = screen.getByRole('list', { name: 'Parte de cada pessoa' })
    expect(within(parts).getAllByRole('listitem')[0]).toHaveTextContent(/João\s*R\$\s80,00\s*R\$\s26,66 \+ 2× R\$\s26,67/)
    expect(within(parts).getAllByRole('listitem')[3]).toHaveTextContent(/Você\s*R\$\s80,00/)

    // Valores diferentes: starts from the equal parts; over the total is refused.
    await user.click(screen.getByRole('radio', { name: 'Valores diferentes' }))
    const ana = screen.getByRole('textbox', { name: 'Parte de Ana Souza' })
    expect(ana).toHaveValue('80,00')
    await user.clear(ana)
    await user.type(ana, '20000')
    expect(within(footer()).getByRole('status')).toHaveTextContent('Confira a parte de cada pessoa')
    expect(screen.getByText(/A soma \(R\$\s360,00\) passou do total\./)).toBeInTheDocument()
    await user.clear(ana)
    await user.type(ana, '10000')
    expect(screen.getByText(/Soma R\$\s260,00 de R\$\s320,00 · sua parte: R\$\s60,00/)).toBeInTheDocument()

    await user.click(within(footer()).getByRole('button', { name: 'Criar 3 dívidas' }))
    expect(post).toHaveBeenCalledWith('/debts/split', {
      type: 'CREDIT_CARD', description: undefined, numberOfInstallments: 3, firstDueDate: '2026-12-10T00:00:00.000Z', recurrence: null, today: '2026-11-13',
      shares: [{ debtorId: 'd1', amount: 80 }, { debtorId: 'd2', amount: 100 }, { debtorId: 'd3', amount: 80 }],
    })
    const toast = await screen.findByText('3 dívidas criadas · João, Ana, Bruno')
    await user.click(within(toast.closest('[role="status"], .lt-toast') as HTMLElement ?? document.body).getByRole('button', { name: 'Desfazer' }))
    expect(del).toHaveBeenCalledWith('/debts/split/s1')
  })

  it('item 66: a part smaller than 1 cent per installment is refused, with the name', async () => {
    const user = userEvent.setup()
    renderApp('/debts/new?debtorId=d1')
    await screen.findByRole('button', { name: 'Trocar devedor (João Araújo)' })
    await user.click(screen.getByRole('switch', { name: /Dividir com mais pessoas/ }))
    await user.click(screen.getByRole('checkbox', { name: /Ana Souza/ }))
    await user.click(screen.getByRole('switch', { name: /Eu também participo/ }))
    await user.click(screen.getByRole('button', { name: /Pix parcelado/ }))
    await user.type(screen.getByRole('textbox', { name: /Valor total da conta/ }), '5')
    await user.type(screen.getByRole('textbox', { name: 'Parcelas' }), '3')
    expect(screen.getByText(/A parte de Ana \(R\$\s0,02\) é pequena demais para 3 parcelas\./)).toBeInTheDocument()
    await user.click(within(footer()).getByRole('button', { name: 'Criar 2 dívidas' }))
    expect(post).not.toHaveBeenCalled()
  })

  it('item 66: many people — 8 shown, "Mostrar todos", a filter (no accents) with ×, and "Cadastrar" with what was typed', async () => {
    const many = Array.from({ length: 11 }, (_, k) => person(`m${k}`, `Pessoa ${String.fromCharCode(65 + k)} Silva`, `2026-0${(k % 9) + 1}-01`))
    get.mockImplementation((url: string) => {
      if (url === '/debtors') return Promise.resolve({ data: [...DEBTORS, ...many, person('m99', 'Érica Côrtes', '2025-01-01')] })
      if (url === '/settings') return Promise.resolve({ data: { defaultCardDueDay: 10, defaultPixInstallmentDueDay: null, pixKey: null, pixKeyType: null } })
      return Promise.resolve({ data: fakeGet(url) })
    })
    const user = userEvent.setup()
    renderApp('/debts/new?debtorId=d1')
    await screen.findByRole('button', { name: 'Trocar devedor (João Araújo)' })
    await user.click(screen.getByRole('switch', { name: /Dividir com mais pessoas/ }))
    const all = screen.getByRole('list', { name: 'Seus devedores' })
    expect(within(all).getAllByRole('checkbox')).toHaveLength(8)
    await user.click(screen.getByRole('button', { name: 'Mostrar todos (16)' }))
    expect(within(all).getAllByRole('checkbox')).toHaveLength(16)
    await user.click(screen.getByRole('button', { name: 'Mostrar menos' }))
    const filter = screen.getByRole('textbox', { name: 'Filtrar devedores pelo nome' })
    await user.type(filter, 'erica cortes')
    expect(within(all).getAllByRole('checkbox').map((b) => b.textContent?.replace(/^[A-ZÉ]{2}/, ''))).toEqual(['Érica Côrtes'])
    await user.click(within(all).getByRole('checkbox', { name: /Érica Côrtes/ }))
    await user.click(screen.getByRole('button', { name: 'Limpar filtro' }))
    expect(filter).toHaveValue('')
    await user.type(filter, 'Zé Novo')
    expect(screen.getByText('Ninguém com “Zé Novo”.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Cadastrar “Zé Novo”' }))
    const form = await screen.findByRole('dialog', { name: 'Novo devedor' })
    expect(within(form).getByRole('textbox', { name: /Nome/ })).toHaveValue('Zé Novo')
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

  it('nothing typed (the person preset by the profile does not count): the tab just goes', async () => {
    const user = userEvent.setup()
    renderApp('/debts/new?debtorId=d1')
    await screen.findByRole('button', { name: 'Trocar devedor (João Araújo)' })
    await user.click(within(screen.getByRole('navigation', { name: 'Abas' })).getByRole('link', { name: /^Parcelas/ }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Parcelas' })).toBeInTheDocument()
    expect(screen.queryByRole('dialog', { name: 'Sair sem criar a dívida?' })).toBeNull()
  })

  it('something typed: leaving asks first (a tab, Cancelar); Continuar editando keeps it, Sair e descartar leaves', async () => {
    const user = userEvent.setup()
    renderApp('/debts/new?debtorId=d1')
    await screen.findByRole('button', { name: 'Trocar devedor (João Araújo)' })
    await user.type(screen.getByRole('textbox', { name: /Valor total/ }), '5000')
    await user.click(within(screen.getByRole('navigation', { name: 'Abas' })).getByRole('link', { name: /^Parcelas/ }))
    const ask = await screen.findByRole('dialog', { name: 'Sair sem criar a dívida?' })
    expect(ask).toHaveTextContent('O que você preencheu nesta dívida vai ser perdido.')
    await user.click(within(ask).getByRole('button', { name: 'Continuar editando' }))
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Sair sem criar a dívida?' })).toBeNull())
    expect(screen.getByRole('heading', { level: 1, name: 'Nova dívida' })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: /Valor total/ })).toHaveValue('50,00')

    await user.click(within(footer()).getByRole('button', { name: 'Cancelar' }))
    await user.click(within(await screen.findByRole('dialog', { name: 'Sair sem criar a dívida?' })).getByRole('button', { name: 'Sair e descartar' }))
    await waitFor(() => expect(screen.queryByRole('heading', { level: 1, name: 'Nova dívida' })).toBeNull())
  })

  it('"Cadastrar" sits right under the field (seen with the phone keyboard open); Enter registers, or picks the exact name', async () => {
    const user = userEvent.setup()
    renderApp('/debts/new')
    await user.click(await screen.findByRole('button', { name: 'Buscar devedor' }))
    const sheet = await screen.findByRole('dialog', { name: 'Para quem é a dívida?' })
    const field = within(sheet).getByRole('textbox', { name: 'Buscar devedor pelo nome' })
    await user.type(field, 'Ana')
    // Partial match: "Ana Souza" listed, and "Cadastrar “Ana”" comes first, right after the field.
    const create = within(sheet).getByRole('button', { name: 'Cadastrar “Ana”' })
    expect(field.closest('.lt-search-field')?.nextElementSibling).toBe(create)
    await user.clear(field)
    // The exact name (no accents needed): no "Cadastrar", Enter picks the person.
    await user.type(field, 'ana souza{Enter}')
    expect(within(sheet).queryByRole('button', { name: /^Cadastrar/ })).toBeNull()
    expect(await screen.findByRole('button', { name: 'Trocar devedor (Ana Souza)' })).toBeInTheDocument()
    // A new name: Enter opens the form with it.
    await user.click(screen.getByRole('button', { name: 'Trocar devedor (Ana Souza)' }))
    const again = await screen.findByRole('dialog', { name: 'Para quem é a dívida?' })
    await user.type(within(again).getByRole('textbox', { name: 'Buscar devedor pelo nome' }), 'Zé Novo{Enter}')
    expect(within(await screen.findByRole('dialog', { name: 'Novo devedor' })).getByRole('textbox', { name: /Nome/ })).toHaveValue('Zé Novo')
  })
})
