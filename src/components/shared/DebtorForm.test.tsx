import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DebtorForm } from './DebtorForm'
import type { Debtor } from '../../types/debtor'

const fetchMock = vi.fn()

const dialog = () => screen.getByRole('dialog')
const field = (name: RegExp | string) => within(dialog()).getByRole('textbox', { name })

describe('Cadastro de devedor (S9)', () => {
  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })
  afterEach(() => vi.unstubAllGlobals())

  it('lean by default: Nome (required) and Telefone with a mask; errors on the field', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(<DebtorForm open onClose={() => {}} onSave={onSave} />)
    expect(within(dialog()).queryByRole('textbox', { name: /E-mail/ })).toBeNull()
    await user.click(within(dialog()).getByRole('button', { name: /Salvar devedor/ }))
    expect(within(dialog()).getByText('Informe o nome')).toBeInTheDocument()
    await waitFor(() => expect(field(/Nome/)).toHaveFocus())

    await user.type(field(/Nome/), 'Maria Souza')
    await user.type(field(/Telefone/), '1198765')
    expect(field(/Telefone/)).toHaveValue('(11) 9876-5')
    await user.click(within(dialog()).getByRole('button', { name: /Salvar devedor/ }))
    expect(within(dialog()).getByText('Telefone incompleto')).toBeInTheDocument()
    expect(onSave).not.toHaveBeenCalled()

    await user.type(field(/Telefone/), '4321')
    expect(field(/Telefone/)).toHaveValue('(11) 98765-4321')
    await user.click(within(dialog()).getByRole('button', { name: /Salvar devedor/ }))
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ name: 'Maria Souza', phone: '(11) 98765-4321', email: null, address: null }))
  })

  it('"Mais dados" → address: the CEP first; found fills the rest and goes to Número', async () => {
    const user = userEvent.setup()
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ logradouro: 'Avenida Paulista', bairro: 'Bela Vista', localidade: 'São Paulo', uf: 'SP' }) })
    const onSave = vi.fn()
    render(<DebtorForm open onClose={() => {}} onSave={onSave} />)
    await user.type(field(/Nome/), 'Ana')
    await user.click(within(dialog()).getByRole('button', { name: 'Mais dados' }))
    await user.click(within(dialog()).getByRole('button', { name: 'Bom pagador' }))
    await user.click(within(dialog()).getByRole('button', { name: /Adicionar endereço/ }))
    expect(within(dialog()).queryByRole('textbox', { name: 'Rua' })).toBeNull()
    await user.type(field('CEP'), '01310100')
    expect(await within(dialog()).findByText('Endereço encontrado')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith('https://viacep.com.br/ws/01310100/json/')
    expect(field('Rua')).toHaveValue('Avenida Paulista')
    await waitFor(() => expect(field('Número')).toHaveFocus())
    await user.type(field('Número'), '1000')
    await user.click(within(dialog()).getByRole('button', { name: /Salvar devedor/ }))
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      reliability: 'GOOD_PAYER',
      address: { zip: '01310100', street: 'Avenida Paulista', number: '1000', complement: null, neighborhood: 'Bela Vista', city: 'São Paulo', state: 'SP' },
    }))
  })

  it('CEP not found (or ViaCEP down) and "Não sei o CEP" show every field to fill by hand', async () => {
    const user = userEvent.setup()
    fetchMock.mockRejectedValue(new Error('offline'))
    render(<DebtorForm open onClose={() => {}} onSave={() => {}} />)
    await user.click(within(dialog()).getByRole('button', { name: 'Mais dados' }))
    await user.click(within(dialog()).getByRole('button', { name: /Adicionar endereço/ }))
    await user.click(within(dialog()).getByRole('button', { name: 'Não sei o CEP' }))
    expect(field('Rua')).toBeInTheDocument()
    await user.type(field('CEP'), '99999999')
    expect(await within(dialog()).findByText(/CEP não encontrado/)).toBeInTheDocument()
  })

  it('editing opens with "Mais dados" when there is more than name and phone', () => {
    const debtor = {
      id: 'd1', name: 'João', phone: '11999990000', email: 'j@x.com', notes: null, reliability: null, avatarHue: null, avatarEmoji: null,
      lenderId: 'l', createdAt: '2026-01-01', address: null,
    } as Debtor
    render(<DebtorForm open editing={debtor} onClose={() => {}} onSave={() => {}} />)
    expect(screen.getByRole('dialog', { name: 'Editar cadastro' })).toBeInTheDocument()
    expect(field(/Telefone/)).toHaveValue('(11) 99999-0000')
    expect(field(/E-mail/)).toHaveValue('j@x.com')
    expect(within(dialog()).getByRole('button', { name: /Salvar alterações/ })).toBeInTheDocument()
  })
})
