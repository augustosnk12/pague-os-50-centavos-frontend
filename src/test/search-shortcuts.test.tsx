import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, within, waitFor, fireEvent, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderApp } from './renderApp'
import { fakeGet, fixtures } from './fakeApi'
import { api } from '../lib/axios'
import type { Debtor } from '../types/debtor'

vi.mock('../lib/axios', () => ({
  api: { get: vi.fn(), post: vi.fn(() => Promise.resolve({ data: {} })), put: vi.fn(), delete: vi.fn() },
}))
const get = vi.mocked(api.get)
let debtors: Debtor[]

describe('S10 · busca e atalhos', () => {
  beforeEach(() => {
    vi.setSystemTime(new Date('2026-11-05T12:00:00-03:00'))
    debtors = fixtures.debtors
    get.mockReset()
    get.mockImplementation((url: string) => Promise.resolve({ data: url === '/debtors' ? debtors : fakeGet(url) }))
  })

  it('header search: debtors and debts from GET /search, arrows + Enter open the result', async () => {
    const user = userEvent.setup()
    renderApp('/dashboard')
    await screen.findByRole('heading', { level: 1, name: /olá/i })
    await user.click(screen.getByRole('button', { name: 'Buscar devedor ou dívida (Ctrl K ou /)' }))
    const box = screen.getByRole('combobox', { name: 'Buscar devedor ou dívida' })
    expect(box).toHaveFocus()
    await user.type(box, 'note')
    const list = await screen.findByRole('listbox', { name: 'Resultados da busca' })
    await waitFor(() => expect(get).toHaveBeenCalledWith('/search', { params: { q: 'note', limit: 8 } }))
    expect(within(list).getByRole('group', { name: 'Devedores' })).toHaveTextContent(/João Araújodeve R\$\s250,00/)
    expect(within(list).getByRole('group', { name: 'Dívidas' })).toHaveTextContent(/NotebookJoão Araújo · restam R\$\s250,00/)
    await user.keyboard('{ArrowDown}')
    expect(box).toHaveAttribute('aria-activedescendant', 'sr-x-debt1')
    await user.keyboard('{Enter}')
    // The debt opens its debtor.
    expect(await screen.findByRole('heading', { level: 1, name: 'João Araújo' })).toBeInTheDocument()
  })

  it('Esc closes the search and returns focus to the magnifier', async () => {
    const user = userEvent.setup()
    renderApp('/dashboard')
    await screen.findByRole('heading', { level: 1, name: /olá/i })
    await user.click(screen.getByRole('button', { name: /^Buscar devedor ou dívida/ }))
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('combobox')).toBeNull()
    await waitFor(() => expect(screen.getByRole('button', { name: /^Buscar devedor ou dívida/ })).toHaveFocus())
  })

  it('Alt+N opens a new debt; Alt+R opens "Registrar pagamento"; both are announced on the buttons', async () => {
    const user = userEvent.setup()
    renderApp('/dashboard')
    await screen.findByRole('heading', { level: 1, name: /olá/i })
    expect(screen.getByRole('button', { name: 'Registrar pagamento (Alt+R)' })).toHaveAttribute('aria-keyshortcuts', 'Alt+R')
    expect(screen.getAllByRole('button', { name: 'Nova dívida' }).some((b) => b.getAttribute('aria-keyshortcuts') === 'Alt+N')).toBe(true)
    fireEvent.keyDown(window, { key: 'r', code: 'KeyR', altKey: true })
    const picker = await screen.findByRole('dialog', { name: 'Registrar pagamento' })
    expect(await within(picker).findByRole('list', { name: 'Parcelas em aberto' })).toHaveTextContent('João Araújo')
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    fireEvent.keyDown(window, { key: 'n', code: 'KeyN', altKey: true })
    expect((await screen.findAllByText(/nova dívida/i)).length).toBeGreaterThan(0)
    expect(await screen.findByPlaceholderText('Empréstimo de junho')).toBeInTheDocument()
  })

  it('"/" does nothing while typing; on a phone it opens the Devedores search', async () => {
    renderApp('/dashboard')
    await screen.findByRole('heading', { level: 1, name: /olá/i })
    fireEvent.keyDown(window, { key: '/' })
    // matchMedia is false in tests (phone): goes to Devedores with the field focused.
    const field = await screen.findByRole('searchbox', { name: 'Buscar devedor ou dívida' })
    await waitFor(() => expect(field).toHaveFocus())
    fireEvent.keyDown(field, { key: '/' })
    expect(screen.getByRole('heading', { level: 1, name: 'Devedores' })).toBeInTheDocument()
  })

  it('"+" held opens "O que você quer fazer?" with both actions; a tap still opens a new debt', async () => {
    renderApp('/dashboard')
    await screen.findByRole('heading', { level: 1, name: /olá/i })
    const fab = screen.getAllByRole('button', { name: 'Nova dívida' }).find((b) => b.getAttribute('aria-describedby') === 'fab-hint')!
    expect(fab).toHaveAccessibleDescription('Segure para registrar um pagamento')
    fireEvent.pointerDown(fab)
    await act(() => new Promise((ok) => setTimeout(ok, 520)))
    fireEvent.pointerUp(fab)
    fireEvent.click(fab)
    const menu = await screen.findByRole('dialog', { name: 'O que você quer fazer?' })
    fireEvent.click(within(menu).getByRole('button', { name: /Registrar pagamento/ }))
    expect(await screen.findByRole('dialog', { name: 'Registrar pagamento' })).toBeInTheDocument()
  })

  it('Devedores: the search also lists debts; a debt opens its debtor', async () => {
    const user = userEvent.setup()
    renderApp('/debtors')
    const field = await screen.findByRole('searchbox', { name: 'Buscar devedor ou dívida' })
    await user.type(field, 'note')
    const debts = await screen.findByRole('list', { name: 'Dívidas encontradas' })
    expect(within(debts).getByRole('link')).toHaveAttribute('href', '/debtors/d1?divida=debt1')
  })

  it('Devedores with more than 15 people: letter headings, and typing a letter jumps to it', async () => {
    const names = ['Ana', 'Bruno', 'Carla', 'Diego', 'Edu', 'Fábio', 'Gabi', 'Hugo', 'Iara', 'Júlia', 'Lia', 'Marta', 'Nina', 'Otto', 'Paulo', 'Rui', 'Sara']
    debtors = names.map((n, k) => ({ ...fixtures.debtors[0], id: `p${k}`, name: `${n} Silva` }))
    renderApp('/debtors')
    expect(await screen.findByRole('heading', { level: 2, name: 'A' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'F' })).toBeInTheDocument()
    fireEvent.keyDown(document.body, { key: 'q' }) // no Q → next letter that exists (R)
    const r = screen.getByRole('region', { name: 'R' })
    await waitFor(() => expect(within(r).getByRole('link')).toHaveFocus())
    expect(screen.getByText('Letra R, 1 pessoas')).toBeInTheDocument()
  })
})
