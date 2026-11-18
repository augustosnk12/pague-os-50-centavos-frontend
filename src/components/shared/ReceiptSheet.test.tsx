import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '../../contexts/AuthContext'
import { ToastProvider } from '../../contexts/ToastContext'
import { ReceiptSheet } from './ReceiptSheet'
import { api } from '../../lib/axios'
import { setLenderInStorage, setToken } from '../../lib/cookies'
import { shareOrDownload } from '../../lib/receiptImage'
import type { ReceiptRequest } from '../../lib/receipt'

vi.mock('../../lib/axios', () => ({ api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() } }))
vi.mock('../../lib/receiptImage', () => ({ shareOrDownload: vi.fn(() => Promise.resolve('downloaded')) }))
const get = vi.mocked(api.get)

const pay = (id: string, amount: string, paidAt: string) => ({ id, amount, paidAt: `${paidAt}T00:00:00.000Z`, batchId: null })
let phone: string | null

function renderSheet(request: ReceiptRequest) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <MemoryRouter>
      <QueryClientProvider client={qc}>
        <AuthProvider>
          <ToastProvider>
            <ReceiptSheet request={request} onClose={vi.fn()} />
          </ToastProvider>
        </AuthProvider>
      </QueryClientProvider>
    </MemoryRouter>,
  )
}

describe('ReceiptSheet (S6)', () => {
  beforeEach(() => {
    setToken('t')
    setLenderInStorage({ id: 'l1', email: 'a@b.co', name: 'Augusto Silva' })
    phone = '11912345678'
    get.mockReset()
    get.mockImplementation((url: string) => {
      if (url === '/debtors/d1') return Promise.resolve({ data: { id: 'd1', name: 'Ana Ribeiro', phone } })
      if (url === '/debtors/d1/debts')
        return Promise.resolve({
          data: [
            { id: 'nb', description: 'Notebook', installments: [
              { id: 'n1', number: 1, amount: '100.00', paidAmount: '100.00', payments: [pay('pay_aaa11', '100.00', '2026-10-03')] },
              { id: 'n2', number: 2, amount: '100.00', paidAmount: '100.00', payments: [pay('pay_bbb22', '100.00', '2026-11-03')] },
            ] },
          ],
        })
      return Promise.reject(new Error(url))
    })
  })

  it('receipt card: code, amount, date, who, what and the balance', async () => {
    renderSheet({ debtorId: 'd1', paymentId: 'pay_bbb22' })
    const card = await screen.findByRole('article', { name: /^Comprovante de pagamento P50-BBB22-261103$/ })
    expect(card).toHaveTextContent('terça, 3 de novembro de 2026')
    expect(card).toHaveTextContent(/DeAna Ribeiro/)
    expect(card).toHaveTextContent(/ParaAugusto Silva/)
    expect(card).toHaveTextContent(/Referente aNotebook · parcela 2\/2/)
    expect(card).toHaveTextContent(/Saldo da dívida✓ Quitada/)
    expect(card).toHaveTextContent('não é documento fiscal')
  })

  it('"Enviar no WhatsApp" opens WhatsApp with the receipt text; "Imagem" shares or downloads the PNG', async () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null)
    const user = userEvent.setup()
    renderSheet({ debtorId: 'd1', paymentId: 'pay_bbb22' })
    const dialog = await screen.findByRole('dialog', { name: 'Comprovante' })
    await within(dialog).findByRole('article')
    await user.click(within(dialog).getByRole('button', { name: 'Compartilhar ou baixar a imagem do comprovante' }))
    expect(shareOrDownload).toHaveBeenCalledWith(expect.objectContaining({ code: 'P50-BBB22-261103', kind: 'payment' }), expect.stringContaining('✅ Comprovante de pagamento'))
    expect(await screen.findByText('Imagem do comprovante baixada')).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Enviar no WhatsApp' }))
    expect(open).toHaveBeenCalledWith(expect.stringMatching(/^https:\/\/api\.whatsapp\.com\/send\?phone=5511912345678&text=%E2%9C%85%20Comprovante/), '_blank', 'noopener,noreferrer')
  })

  it('without a phone only "Imagem" is offered', async () => {
    phone = null
    renderSheet({ debtorId: 'd1', paymentId: 'pay_bbb22' })
    const dialog = await screen.findByRole('dialog', { name: 'Comprovante' })
    await within(dialog).findByRole('article')
    expect(within(dialog).queryByRole('button', { name: 'Enviar no WhatsApp' })).toBeNull()
    expect(within(dialog).getByRole('button', { name: /imagem do comprovante/ })).toBeInTheDocument()
  })

  it('payoff receipt for a fully paid debt', async () => {
    renderSheet({ debtorId: 'd1', payoffDebtId: 'nb' })
    const card = await screen.findByRole('article', { name: /^Comprovante de quitação/ })
    expect(card).toHaveTextContent('Quitada em terça, 3 de novembro de 2026')
    expect(card).toHaveTextContent(/DívidaNotebook · 2 parcelas/)
    expect(card).toHaveTextContent(/03 out · parcela 1\/2/)
    expect(card).toHaveTextContent(/Situação✓ Quitada/)
  })

  it('a payment that no longer exists (undone) says so', async () => {
    renderSheet({ debtorId: 'd1', paymentId: 'gone' })
    expect(await screen.findByText(/Não encontramos esse pagamento/)).toBeInTheDocument()
  })
})
