import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderApp } from './renderApp'
import { fakeGet, fixtures } from './fakeApi'
import { api } from '../lib/axios'
import { getApiKind, setApiKind } from '../lib/apiSide'

vi.mock('../lib/axios', () => ({ api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() } }))
const get = vi.mocked(api.get)

describe('"Eu devo" (item 75) across the app', () => {
  beforeEach(() => {
    vi.setSystemTime(new Date('2026-11-16T12:00:00-03:00'))
    localStorage.clear()
    setApiKind('DEBTOR')
    document.documentElement.removeAttribute('data-side')
    get.mockReset()
    get.mockImplementation((url: string) => Promise.resolve({ data: fakeGet(url) }))
  })

  it('opens on the last side used: "Credores", blue, no reliability filter; the pill switches back and calls the API by side', async () => {
    localStorage.setItem('pague50_side', 'out')
    const user = userEvent.setup()
    renderApp('/debtors')
    expect(await screen.findByRole('heading', { level: 1, name: 'Credores' })).toBeInTheDocument()
    expect(getApiKind()).toBe('CREDITOR')
    expect(document.documentElement.dataset.side).toBe('out')
    expect(screen.getByRole('searchbox', { name: 'Buscar credor ou dívida' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Bom pagador/ })).toBeNull()
    // Tabs say "Credores" too.
    expect(within(screen.getByRole('navigation', { name: 'Abas' })).getByRole('link', { name: 'Credores' })).toBeInTheDocument()

    // Phone pill → "Ver qual lado?" (no amounts) → Me devem.
    await user.click(screen.getByRole('button', { name: 'Lado: Eu devo. Trocar' }))
    const sheet = await screen.findByRole('dialog', { name: 'Ver qual lado?' })
    expect(within(sheet).getByRole('radio', { name: /Eu devo/ })).toHaveAttribute('aria-checked', 'true')
    expect(sheet).not.toHaveTextContent('R$')
    get.mockClear()
    await user.click(within(sheet).getByRole('radio', { name: /Me devem/ }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Devedores' })).toBeInTheDocument()
    expect(getApiKind()).toBe('DEBTOR')
    expect(document.documentElement.dataset.side).toBeUndefined()
    expect(localStorage.getItem('pague50_side')).toBeNull()
    // The lists were asked again for this side.
    await waitFor(() => expect(get).toHaveBeenCalledWith('/debtors', expect.anything()))
    expect(screen.getAllByRole('button', { name: /Bom pagador/ }).length).toBeGreaterThan(0)
  })

  it('profile of a creditor: no "Cobrar" nor reliability; Nova dívida stays; desktop tabs in the top bar switch too', async () => {
    localStorage.setItem('pague50_side', 'out')
    const user = userEvent.setup()
    renderApp(`/debtors/${fixtures.debtors[0].id}`)
    expect(await screen.findByRole('heading', { level: 1, name: new RegExp(fixtures.debtors[0].name) })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Cobrar/ })).toBeNull()
    expect(document.querySelector('.lt-prof-acts')).toHaveTextContent('Nova dívida')

    // Switching while on a person of the other side goes to the list.
    const top = screen.getAllByRole('radiogroup', { name: 'Qual lado ver' })[0]
    await user.click(within(top).getByRole('radio', { name: 'Me devem' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Devedores' })).toBeInTheDocument()
  })

  it('Nova dívida: the side is a field at the top; on "Eu devo" no split and "Para quem você deve?"', async () => {
    localStorage.setItem('pague50_side', 'out')
    renderApp(`/debts/new?debtorId=${fixtures.debtors[0].id}`)
    expect(await screen.findByText('Para quem você deve?')).toBeInTheDocument()
    expect(screen.getByText('Registre quanto você deve e gere as parcelas.')).toBeInTheDocument()
    expect(screen.queryByRole('switch', { name: /Dividir com mais pessoas/ })).toBeNull()
  })

  it('creditor form: optional Pix key with type, mask and live check; an incomplete key blocks saving; a valid one goes to the API', async () => {
    localStorage.setItem('pague50_side', 'out')
    const post = vi.mocked(api.post)
    post.mockReset()
    post.mockResolvedValue({ data: { ...fixtures.debtors[0], id: 'c9', name: 'Mãe', kind: 'CREDITOR' } })
    const user = userEvent.setup()
    renderApp('/debtors')
    await screen.findByRole('heading', { level: 1, name: 'Credores' })
    await user.click(screen.getAllByRole('button', { name: /Adicionar/ })[0])
    const form = await screen.findByRole('dialog', { name: 'Novo credor' })
    await user.type(within(form).getByRole('textbox', { name: /Nome/ }), 'Mãe')
    await user.click(within(form).getByRole('button', { name: 'Celular' }))
    const key = within(form).getByRole('textbox', { name: /Chave Celular/ })
    await user.type(key, '119988')
    expect(key).toHaveValue('(11) 9988')
    expect(form).toHaveTextContent('Formato incompleto')
    await user.click(within(form).getByRole('button', { name: /Salvar credor/ }))
    expect(form).toHaveTextContent('Chave incompleta · complete ou apague')
    expect(post).not.toHaveBeenCalled()
    await user.type(key, '87766')
    expect(form).toHaveTextContent('✓ Chave válida')
    await user.click(within(form).getByRole('button', { name: /Salvar credor/ }))
    await waitFor(() => expect(post).toHaveBeenCalledWith('/debtors', expect.objectContaining({ name: 'Mãe', pixKey: '(11) 99888-7766', pixKeyType: 'PHONE' })))
  })

  it('"Pagar com Pix": Atrasado · Próxima · Tudo, the key, the QR and copia e cola; "Já paguei" registers exactly those; no key = "Adicionar chave Pix"', async () => {
    localStorage.setItem('pague50_side', 'out')
    const inst = (id: string, number: number, due: string) => ({ id, number, amount: '200.00', paidAmount: '0.00', dueDate: `${due}T00:00:00.000Z`, paidAt: null, status: 'PENDING', debtId: 'car', payments: [] })
    const creditor = { ...fixtures.debtors[0], id: 'c1', name: 'Mãe', reliability: null, kind: 'CREDITOR', pixKey: 'mae@email.com', pixKeyType: 'EMAIL' }
    const debts = [{ id: 'car', description: 'Carro', type: 'PIX', totalAmount: '600.00', debtorId: 'c1', createdAt: '2026-09-01T00:00:00.000Z', recurrence: null,
      installments: [inst('a1', 1, '2026-10-10'), inst('a2', 2, '2026-12-10'), inst('a3', 3, '2027-01-10')] }]
    let withKey = true
    get.mockImplementation((url: string) => Promise.resolve({ data:
      url === '/debtors/c1' ? (withKey ? creditor : { ...creditor, pixKey: null, pixKeyType: null }) : url === '/debtors/c1/debts' ? debts : fakeGet(url) }))
    const user = userEvent.setup()
    const { unmount } = renderApp('/debtors/c1')
    await screen.findByRole('heading', { level: 1, name: /Mãe/ })
    await user.click(screen.getByRole('button', { name: /Pagar com Pix/ }))
    const sheet = await screen.findByRole('dialog', { name: 'Pagar Mãe' })
    const amounts = within(sheet).getByRole('radiogroup', { name: 'Quanto pagar' })
    expect(within(amounts).getAllByRole('radio').map((r) => r.getAttribute('aria-label')?.replace(/\s/g, ' '))).toEqual(['Atrasado, R$ 200,00', 'Próxima, R$ 200,00', 'Tudo, R$ 600,00'])
    expect(within(amounts).getByRole('radio', { name: /Atrasado/ })).toHaveAttribute('aria-checked', 'true')
    expect(sheet).toHaveTextContent('mae@email.com')
    expect(within(sheet).getByRole('img', { name: /^QR Code Pix de R\$\s200,00 para Mãe$/ })).toBeInTheDocument()
    expect(within(sheet).getByRole('button', { name: /Copiar código Pix/ })).toBeInTheDocument()

    await user.click(within(amounts).getByRole('radio', { name: /Tudo/ }))
    expect(within(sheet).getByRole('img', { name: /^QR Code Pix de R\$\s600,00 para Mãe$/ })).toBeInTheDocument()
    await user.click(within(sheet).getByRole('button', { name: /^Já paguei · registrar R\$\s600,00$/ }))
    // Several installments: "várias de uma vez" with exactly them (the later months open too).
    const batch = await screen.findByRole('dialog', { name: /Pagar várias parcelas de Mãe/ })
    expect(await within(batch).findByRole('button', { name: /^Registrar R\$\s600,00 em 3 parcelas$/ })).toBeInTheDocument()
    unmount()

    // No key yet: the sheet says so and opens the form.
    withKey = false
    renderApp('/debtors/c1')
    await screen.findByRole('heading', { level: 1, name: /Mãe/ })
    await user.click(screen.getByRole('button', { name: /Pagar com Pix/ }))
    const none = await screen.findByRole('dialog', { name: 'Pagar Mãe' })
    expect(none).toHaveTextContent('Mãe ainda não tem chave Pix cadastrada.')
    expect(within(none).queryByRole('img', { name: /QR Code/ })).toBeNull()
    await user.click(within(none).getByRole('button', { name: 'Adicionar chave Pix' }))
    const form = await screen.findByRole('dialog', { name: 'Editar cadastro' })
    expect(within(form).getByRole('group', { name: 'Tipo de chave Pix' })).toBeInTheDocument()
  })
})
