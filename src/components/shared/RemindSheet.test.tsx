import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '../../contexts/AuthContext'
import { ToastProvider } from '../../contexts/ToastContext'
import { MemoryRouter } from 'react-router-dom'
import { RemindSheet } from './RemindSheet'
import { api } from '../../lib/axios'
import { setLenderInStorage, setToken } from '../../lib/cookies'

vi.mock('../../lib/axios', () => ({ api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() } }))
const get = vi.mocked(api.get)
const put = vi.mocked(api.put)

const inst = (id: string, number: number, due: string, amount = '100.00', paidAmount = '0.00') => ({
  id, number, amount, paidAmount, dueDate: `${due}T00:00:00.000Z`, paidAt: null, status: 'PENDING', debtId: 'x',
})
let debtor: Record<string, unknown>
let pixKey: string | null

function renderSheet(onClose = vi.fn()) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <MemoryRouter>
    <QueryClientProvider client={qc}>
      <AuthProvider>
        <ToastProvider>
          <RemindSheet debtorId="d1" onClose={onClose} />
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
    </MemoryRouter>,
  )
  return onClose
}

describe('RemindSheet (S5)', () => {
  beforeEach(() => {
    vi.setSystemTime(new Date('2026-11-09T12:00:00-03:00'))
    setToken('t')
    setLenderInStorage({ id: 'l1', email: 'a@b.co', name: 'Augusto Silva' })
    debtor = { id: 'd1', name: 'Ana Ribeiro', phone: '(11) 91234-5678', notes: 'Só cobra no zap depois das 18h' }
    pixKey = null
    get.mockReset()
    get.mockImplementation((url: string) => {
      if (url === '/debtors/d1') return Promise.resolve({ data: debtor })
      if (url === '/debtors/d1/debts')
        return Promise.resolve({ data: [{ id: 'x', description: 'Notebook', installments: [inst('a', 1, '2026-11-02'), inst('b', 2, '2026-12-02')] }] })
      if (url === '/settings') return Promise.resolve({ data: { pixKey, pixKeyType: pixKey ? 'PHONE' : null } })
      return Promise.reject(new Error(url))
    })
  })

  it('message with what is overdue and the total, editable; the debtor note is shown', async () => {
    renderSheet()
    const sheet = await screen.findByRole('dialog', { name: 'Lembrar Ana' })
    const text = await within(sheet).findByRole('textbox', { name: 'Mensagem' })
    expect((text as HTMLTextAreaElement).value).toContain('• Notebook (1/2) — R$ 100,00 · venceu 02 nov')
    expect((text as HTMLTextAreaElement).value).toContain('Total: R$ 100,00.')
    expect(sheet).toHaveTextContent('Só cobra no zap depois das 18h')
    expect(sheet).toHaveTextContent('(11) 91234-5678')
    // Without a Pix key: a hint instead of the switch.
    expect(within(sheet).queryByRole('switch')).toBeNull()
    expect(sheet).toHaveTextContent('Cadastre sua chave Pix em Configurações')
  })

  it('Pix copia e cola: the switch adds and removes only its block, keeping edits', async () => {
    pixKey = '+5511987654321'
    const user = userEvent.setup()
    renderSheet()
    const sheet = await screen.findByRole('dialog', { name: 'Lembrar Ana' })
    const text = await within(sheet).findByRole('textbox', { name: 'Mensagem' })
    await user.type(text, ' Abraço!')
    const sw = await within(sheet).findByRole('switch', { name: 'Incluir Pix copia e cola' })
    await user.click(sw)
    expect(sw).toHaveAttribute('aria-checked', 'true')
    expect((text as HTMLTextAreaElement).value).toMatch(/Abraço!\n\nPix copia e cola \(R\$\s100,00\):\n00020126.*br\.gov\.bcb\.pix.*\+5511987654321.*5406100\.005802BR5913Augusto Silva/)
    await user.click(sw)
    expect((text as HTMLTextAreaElement).value.endsWith('Abraço!')).toBe(true)
  })

  it('"Abrir WhatsApp" opens WhatsApp with the (edited) text and closes', async () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null)
    const user = userEvent.setup()
    const onClose = renderSheet()
    const sheet = await screen.findByRole('dialog', { name: 'Lembrar Ana' })
    await within(sheet).findByRole('textbox', { name: 'Mensagem' })
    await user.click(within(sheet).getByRole('button', { name: 'Abrir WhatsApp' }))
    expect(open).toHaveBeenCalledWith(expect.stringMatching(/^https:\/\/api\.whatsapp\.com\/send\?phone=5511912345678&text=Oi%2C%20Ana!/), '_blank', 'noopener,noreferrer')
    expect(onClose).toHaveBeenCalled()
  })

  it('without a phone: asks for it right there, saves it to the debtor and opens WhatsApp in the same tap', async () => {
    debtor = { ...debtor, phone: null }
    put.mockReset().mockResolvedValue({ data: { ...debtor, phone: '(11) 91234-5678' } })
    const open = vi.spyOn(window, 'open').mockReturnValue(null)
    const onClose = renderSheet()
    const sheet = await screen.findByRole('dialog', { name: 'Lembrar Ana' })
    const go = await within(sheet).findByRole('button', { name: 'Salvar e abrir WhatsApp' })
    expect(go).toBeEnabled()
    // Empty: the tap says what is missing (no silent disabled button).
    await userEvent.click(go)
    expect(await within(sheet).findByRole('alert')).toHaveTextContent('Informe o telefone com DDD')
    expect(open).not.toHaveBeenCalled()
    await userEvent.type(within(sheet).getByLabelText('Telefone de Ana'), '11912345678')
    await userEvent.click(go)
    expect(put).toHaveBeenCalledWith('/debtors/d1', { phone: '(11) 91234-5678' })
    expect(open).toHaveBeenCalledWith(expect.stringMatching(/^https:\/\/api\.whatsapp\.com\/send\?phone=5511912345678&text=Oi%2C%20Ana!/), '_blank', 'noopener,noreferrer')
    expect(onClose).toHaveBeenCalled()
    open.mockRestore()
  })

  it('item 68: the tone from Configurações (Direta) builds the message; untouched, the Pix goes where {pix} is', async () => {
    pixKey = '+5511987654321'
    get.mockImplementation((url: string) => {
      if (url === '/debtors/d1') return Promise.resolve({ data: debtor })
      if (url === '/debtors/d1/debts')
        return Promise.resolve({ data: [{ id: 'x', description: 'Notebook', installments: [inst('a', 1, '2026-11-02'), inst('b', 2, '2026-12-02')] }] })
      if (url === '/settings') return Promise.resolve({ data: { pixKey, pixKeyType: 'PHONE', chargeTone: 'DIRECT', chargeTemplate: null } })
      return Promise.reject(new Error(url))
    })
    const user = userEvent.setup()
    renderSheet()
    const sheet = await screen.findByRole('dialog', { name: 'Lembrar Ana' })
    const text = (await within(sheet).findByRole('textbox', { name: 'Mensagem' })) as HTMLTextAreaElement
    await waitFor(() => expect(text.value).toMatch(/^Olá, Ana\. Seguem os valores em aberto:/))
    expect(text.value).not.toContain('{pix}')
    expect(sheet).toHaveTextContent('Modelo: Direta · Mudar em Configurações')
    const sw = within(sheet).getByRole('switch', { name: 'Incluir Pix copia e cola' })
    await user.click(sw)
    expect(text.value).toMatch(/Total: R\$\s100,00\.\nPix copia e cola \(R\$\s100,00\):\n00020126.*\nPor favor, me avise quando pagar\.$/)
    await user.click(sw)
    expect(text.value).toMatch(/Total: R\$\s100,00\.\nPor favor, me avise quando pagar\.$/)
  })

  it('nothing open: the button stays off and says why', async () => {
    get.mockImplementation((url: string) => {
      if (url === '/debtors/d1') return Promise.resolve({ data: debtor })
      if (url === '/debtors/d1/debts') return Promise.resolve({ data: [] })
      if (url === '/settings') return Promise.resolve({ data: { pixKey: null, pixKeyType: null } })
      return Promise.reject(new Error(url))
    })
    renderSheet()
    const sheet = await screen.findByRole('dialog', { name: 'Lembrar Ana' })
    await waitFor(() => expect(within(sheet).getByRole('button', { name: 'Abrir WhatsApp' })).toBeDisabled())
    expect(within(sheet).getByRole('button', { name: 'Abrir WhatsApp' })).toHaveAccessibleDescription('Não há nada em aberto para cobrar.')
  })
})
