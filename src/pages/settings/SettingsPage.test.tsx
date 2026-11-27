import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderApp } from '../../test/renderApp'
import { fakeGet } from '../../test/fakeApi'
import { api } from '../../lib/axios'

vi.mock('../../lib/axios', () => ({ api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() } }))
const get = vi.mocked(api.get)
const put = vi.mocked(api.put)
const post = vi.mocked(api.post)
const del = vi.mocked(api.delete)

let settings: Record<string, unknown>

describe('Configurações (S11)', () => {
  beforeEach(() => {
    vi.setSystemTime(new Date('2026-11-16T12:00:00-03:00'))
    localStorage.clear()
    settings = { defaultCardDueDay: null, defaultPixInstallmentDueDay: 5, pixKey: null, pixKeyType: null }
    for (const m of [get, put, post, del]) m.mockReset()
    get.mockImplementation((url: string) => {
      if (url === '/settings') return Promise.resolve({ data: settings })
      if (url === '/me/summary') return Promise.resolve({ data: { debtors: 3, debts: 4, installments: 12, payments: 7 } })
      return Promise.resolve({ data: fakeGet(url) })
    })
    put.mockImplementation((_url: string, body?: unknown) => {
      settings = { ...settings, ...(body as Record<string, unknown>) }
      return Promise.resolve({ data: settings })
    })
  })

  it('the "Conta" tab opens its sheet (Configurações, tema, Apoie…); default due day saves on choosing', async () => {
    const user = userEvent.setup()
    renderApp('/settings')
    expect(await screen.findByRole('heading', { level: 1, name: 'Configurações' })).toBeInTheDocument()
    await user.click(within(screen.getByRole('navigation', { name: 'Abas' })).getByRole('button', { name: 'Conta' }))
    const sheet = await screen.findByRole('dialog', { name: /^Conta/ })
    for (const name of ['Recebimentos', 'Configurações', /^Tema (claro|escuro)$/, 'Calculadora', 'Sair']) expect(within(sheet).getByRole('button', { name })).toBeInTheDocument()
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(await screen.findByText(/Próximo: sáb, 05 dez/i, undefined, { timeout: 3000 })).toBeInTheDocument()
    await user.selectOptions(screen.getByRole('combobox', { name: 'Dia padrão para Cartão de crédito' }), '10')
    expect(put).toHaveBeenCalledWith('/settings', { defaultCardDueDay: 10 })
    // The toast and its screen-reader announcement may both be on screen.
    expect((await screen.findAllByText('Salvo', undefined, { timeout: 3000 })).length).toBeGreaterThan(0)
    expect(await screen.findByText(/Próximo: qui, 10 dez/i, undefined, { timeout: 3000 })).toBeInTheDocument()
  })

  it('Pix key: mask by type, live check, saves on leaving only when valid; "Limpar" removes with Desfazer', async () => {
    const user = userEvent.setup()
    renderApp('/settings')
    const field = await screen.findByRole('textbox', { name: 'Chave CPF' })
    await user.type(field, '52998224726')
    expect(field).toHaveValue('529.982.247-26')
    expect(screen.getByText('Chave inválida · confira os números')).toBeInTheDocument()
    await user.tab()
    expect(put).not.toHaveBeenCalled()

    await user.clear(field)
    await user.type(field, '52998224725')
    expect(screen.getByText('✓ Chave válida')).toBeInTheDocument()
    await user.tab()
    expect(put).toHaveBeenCalledWith('/settings', { pixKeyType: 'CPF', pixKey: '529.982.247-25' })
    expect((await screen.findAllByText('Chave Pix salva')).length).toBeGreaterThan(0)

    await user.click(screen.getByRole('button', { name: 'Limpar chave Pix' }))
    expect(put).toHaveBeenLastCalledWith('/settings', { pixKeyType: null, pixKey: null })
    await user.click(await screen.findByRole('button', { name: 'Desfazer' }))
    expect(put).toHaveBeenLastCalledWith('/settings', { pixKeyType: 'CPF', pixKey: '529.982.247-25' })
  })

  it('item 68: Direta saves; Minha starts with a text, variables go at the cursor, saves on leaving; empty is refused', async () => {
    settings = { ...settings, chargeTone: null, chargeTemplate: null }
    const user = userEvent.setup()
    renderApp('/settings')
    const group = await screen.findByRole('radiogroup', { name: 'Modelo da mensagem' })
    expect(within(group).getByRole('radio', { name: 'Amigável' })).toHaveAttribute('aria-checked', 'true')
    expect(await screen.findByLabelText(/^Prévia da mensagem para/)).toHaveTextContent(/Tudo bem\?/)

    await user.click(within(group).getByRole('radio', { name: 'Direta' }))
    expect(put).toHaveBeenLastCalledWith('/settings', { chargeTone: 'DIRECT' })
    await waitFor(() => expect(screen.getByLabelText(/^Prévia da mensagem para/)).toHaveTextContent(/Seguem os valores em aberto/))
    expect(screen.queryByRole('textbox', { name: 'Seu texto' })).toBeNull()

    await user.click(within(group).getByRole('radio', { name: 'Minha' }))
    expect(put).toHaveBeenLastCalledWith('/settings', { chargeTone: 'CUSTOM', chargeTemplate: expect.stringContaining('{itens}') })
    const field = (await screen.findByRole('textbox', { name: 'Seu texto' })) as HTMLTextAreaElement
    await user.clear(field)
    await user.type(field, 'Oi , tudo certo?')
    field.setSelectionRange(3, 3)
    await user.click(screen.getByRole('button', { name: 'Inserir Nome ({nome})' }))
    expect(field.value).toBe('Oi {nome}, tudo certo?')
    await waitFor(() => expect(field).toHaveFocus())
    await user.tab()
    expect(put).toHaveBeenLastCalledWith('/settings', { chargeTemplate: 'Oi {nome}, tudo certo?' })
    expect(screen.getByLabelText(/^Prévia da mensagem para/).textContent).toMatch(/^Oi \S+, tudo certo\?/)

    const calls = put.mock.calls.length
    await user.clear(field)
    await user.tab()
    expect(await screen.findByRole('alert')).toHaveTextContent('Escreva sua mensagem ou escolha outro modelo.')
    expect(put.mock.calls.length).toBe(calls)
  })

  it('item 68: "Minha" never passes 1.000 characters (a huge paste is cut and says so; variables refused when full)', async () => {
    settings = { ...settings, chargeTone: 'CUSTOM', chargeTemplate: 'Oi {nome}' }
    const user = userEvent.setup()
    renderApp('/settings')
    const field = (await screen.findByRole('textbox', { name: 'Seu texto' })) as HTMLTextAreaElement
    expect(field).toHaveAttribute('maxLength', '1000')
    await user.clear(field)
    await user.paste('x'.repeat(5000))
    expect(field.value).toHaveLength(1000)
    expect(await screen.findByRole('alert')).toHaveTextContent('Colado só até o limite de 1.000 caracteres.')
    expect(screen.getByText('1.000/1.000')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Inserir Nome ({nome})' }))
    expect(field.value).toHaveLength(1000)
    expect(screen.getByRole('alert')).toHaveTextContent('Chegou ao limite de 1.000 caracteres.')
    await user.tab()
    expect(put).toHaveBeenLastCalledWith('/settings', { chargeTemplate: 'x'.repeat(1000) })
  })

  it('older API (no chargeTone): no Mensagem de cobrança section', async () => {
    renderApp('/settings')
    await screen.findByRole('textbox', { name: 'Chave CPF' })
    expect(screen.queryByRole('radiogroup', { name: 'Modelo da mensagem' })).toBeNull()
  })

  it('detail level and text size apply right away', async () => {
    const user = userEvent.setup()
    renderApp('/settings')
    await user.click(await screen.findByRole('radio', { name: 'Enxuta' }))
    expect(screen.getByRole('radio', { name: 'Enxuta' })).toHaveAttribute('aria-checked', 'true')
    expect(JSON.parse(localStorage.getItem('pague50_prefs') ?? '{}').detail).toBe('lean')
    await user.click(screen.getByRole('radio', { name: 'Gigante' }))
    await waitFor(() => expect(document.documentElement.dataset.fz).toBe('xl'))
  })

  it('Excluir conta: counts, then the e-mailed code; after deleting, Entrar says "Conta excluída"', async () => {
    const user = userEvent.setup()
    post.mockResolvedValue({ data: { message: 'ok' } })
    del.mockResolvedValue({ data: { message: 'Account deleted.' } })
    renderApp('/settings')
    await user.click(await screen.findByRole('button', { name: 'Excluir conta' }))
    const sheet = await screen.findByRole('dialog', { name: 'Excluir conta' })
    expect(await within(sheet).findByText('pessoas', { exact: false })).toBeInTheDocument()
    expect(sheet).toHaveTextContent('3 pessoas')
    await user.click(within(sheet).getByRole('button', { name: 'Continuar' }))
    expect(post).toHaveBeenCalledWith('/me/delete-code')
    await user.type(await within(sheet).findByRole('textbox', { name: 'Código de 6 dígitos' }), '123456')
    await user.click(within(sheet).getByRole('button', { name: /Excluir conta/ }))
    expect(del).toHaveBeenCalledWith('/me', { data: { code: '123456' } })
    expect(await screen.findByText(/Conta excluída/)).toBeInTheDocument()
  })
})
