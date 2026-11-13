import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderApp } from '../../test/renderApp'
import { fakeGet } from '../../test/fakeApi'
import { api } from '../../lib/axios'
import { getToken } from '../../lib/cookies'

vi.mock('../../lib/axios', () => ({ api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() } }))
const get = vi.mocked(api.get)
const post = vi.mocked(api.post)
const reject = (status: number, error: string) => Promise.reject({ isAxiosError: true, response: { status, data: { error } } })
const session = { data: { accessToken: 'jwt-123', lender: { id: 'l1', email: 'ana@gmail.com', name: 'Ana' } } }

describe('Acesso (S13)', () => {
  beforeEach(() => {
    get.mockReset()
    post.mockReset()
    get.mockImplementation((url: string) => Promise.resolve({ data: fakeGet(url) }))
  })

  it('Entrar: only the e-mail; then the code enters by itself when complete', async () => {
    const user = userEvent.setup()
    post.mockImplementation((url: string) => (url === '/auth/verify-code' ? Promise.resolve(session) : Promise.resolve({ data: { message: 'ok' } })))
    renderApp('/login', { loggedIn: false })
    expect(await screen.findByRole('heading', { level: 1, name: 'Entrar' })).toBeInTheDocument()
    expect(screen.getByText('Sem senha: enviamos um link e um código para o seu e-mail.')).toBeInTheDocument()
    await user.type(screen.getByRole('textbox', { name: 'E-mail' }), 'ana@gmail.com')
    await user.click(screen.getByRole('button', { name: /Enviar link de acesso/ }))
    expect(post).toHaveBeenCalledWith('/auth/login', { email: 'ana@gmail.com' })

    expect(await screen.findByRole('heading', { level: 1, name: 'Confira seu e-mail' })).toBeInTheDocument()
    expect(screen.getByText(/ana@gmail\.com/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Abrir app de e-mail/ })).toHaveAttribute('href', 'https://mail.google.com/mail/u/0/#inbox')
    expect(screen.getByRole('button', { name: /^Reenviar em 1:00|^Reenviar em 0:5\d/ })).toBeDisabled()
    const code = screen.getByRole('textbox', { name: 'Código de 6 dígitos' })
    expect(code).toHaveAttribute('autocomplete', 'one-time-code')
    expect(code).toHaveAttribute('inputmode', 'numeric')
    await user.type(code, '12a3456')
    expect(post).toHaveBeenCalledWith('/auth/verify-code', { email: 'ana@gmail.com', code: '123456' })
    expect(await screen.findByRole('heading', { level: 1, name: /olá, ana/i })).toBeInTheDocument()
    expect(getToken()).toBe('jwt-123')
  })

  it('wrong code: error on the field, cleared for a new try; too many tries say how to get a new one', async () => {
    const user = userEvent.setup()
    post.mockImplementation((url: string) => (url === '/auth/login' ? Promise.resolve({ data: {} }) : reject(400, 'Invalid or expired code')))
    renderApp('/login', { loggedIn: false })
    await user.type(await screen.findByRole('textbox', { name: 'E-mail' }), 'ana@empresa.com.br')
    await user.click(screen.getByRole('button', { name: /Enviar link de acesso/ }))
    const code = await screen.findByRole('textbox', { name: 'Código de 6 dígitos' })
    // No shortcut for an unknown provider.
    expect(screen.queryByRole('link', { name: /Abrir app de e-mail/ })).toBeNull()
    await user.type(code, '000000')
    await waitFor(() => expect(code).toHaveAccessibleDescription(/Código incorreto ou expirado/))
    expect(code).toHaveAttribute('aria-invalid', 'true')
    expect(code).toHaveValue('')

    post.mockImplementation(() => reject(429, 'Too many attempts. Request a new code'))
    await user.type(code, '111111')
    await waitFor(() => expect(code).toHaveAccessibleDescription(/Muitas tentativas/))
  })

  it('"Usar outro e-mail" goes back to the form', async () => {
    const user = userEvent.setup()
    post.mockResolvedValue({ data: {} })
    renderApp('/login', { loggedIn: false })
    await user.type(await screen.findByRole('textbox', { name: 'E-mail' }), 'ana@gmail.com')
    await user.click(screen.getByRole('button', { name: /Enviar link de acesso/ }))
    await user.click(await screen.findByRole('button', { name: 'Usar outro e-mail' }))
    expect(screen.getByRole('heading', { level: 1, name: 'Entrar' })).toBeInTheDocument()
  })

  it('expired link: own screen, sends a new one to the last address used here', async () => {
    const user = userEvent.setup()
    localStorage.setItem('pague50_last_email', 'augusto@email.com')
    post.mockResolvedValue({ data: {} })
    renderApp('/login?error=Token%20expired', { loggedIn: false })
    expect(await screen.findByRole('heading', { level: 1, name: 'Esse link expirou' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Enviar um novo para au•••@email.com' }))
    expect(post).toHaveBeenCalledWith('/auth/login', { email: 'augusto@email.com' })
    expect(await screen.findByRole('heading', { level: 1, name: 'Confira seu e-mail' })).toBeInTheDocument()
  })

  it('account not confirmed: resending the confirmation leads to the confirmation code', async () => {
    const user = userEvent.setup()
    post.mockImplementation((url: string) =>
      url === '/auth/login' ? reject(403, 'Account not confirmed') : url === '/auth/confirm-code' ? Promise.resolve(session) : Promise.resolve({ data: {} }),
    )
    renderApp('/login', { loggedIn: false })
    await user.type(await screen.findByRole('textbox', { name: 'E-mail' }), 'ana@gmail.com')
    await user.click(screen.getByRole('button', { name: /Enviar link de acesso/ }))
    await user.click(await screen.findByRole('button', { name: 'Reenviar a confirmação da conta' }))
    expect(post).toHaveBeenCalledWith('/auth/resend-confirmation', { email: 'ana@gmail.com' })
    await user.type(await screen.findByRole('textbox', { name: 'Código de 6 dígitos' }), '654321')
    expect(post).toHaveBeenCalledWith('/auth/confirm-code', { email: 'ana@gmail.com', code: '654321' })
  })

  it('Criar conta: name and e-mail; the confirmation code already logs in', async () => {
    const user = userEvent.setup()
    post.mockImplementation((url: string) => (url === '/auth/confirm-code' ? Promise.resolve(session) : Promise.resolve({ data: {} })))
    renderApp('/register', { loggedIn: false })
    expect(await screen.findByRole('heading', { level: 1, name: 'Criar conta' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Criar conta/ }))
    expect(screen.getByRole('textbox', { name: 'Seu nome' })).toHaveAccessibleDescription(/Informe seu nome/)
    await user.type(screen.getByRole('textbox', { name: 'Seu nome' }), 'Ana')
    await user.type(screen.getByRole('textbox', { name: 'E-mail' }), 'ana@gmail.com')
    await user.click(screen.getByRole('button', { name: /Criar conta/ }))
    expect(post).toHaveBeenCalledWith('/auth/register', { name: 'Ana', email: 'ana@gmail.com' })
    await user.type(await screen.findByRole('textbox', { name: 'Código de 6 dígitos' }), '999999')
    expect(post).toHaveBeenCalledWith('/auth/confirm-code', { email: 'ana@gmail.com', code: '999999' })
    expect(await screen.findByRole('heading', { level: 1, name: /olá, ana/i })).toBeInTheDocument()
  })
})
