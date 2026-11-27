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
})
