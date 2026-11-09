import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useState } from 'react'
import { render, screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ToastProvider } from '../../contexts/ToastContext'
import { PreferencesProvider } from '../../contexts/PreferencesContext'
import { PaymentSheet } from './PaymentSheet'
import type { PaymentTarget } from '../../lib/paymentTarget'
import { api } from '../../lib/axios'
import type { Installment } from '../../types/installment'

vi.mock('../../lib/axios', () => ({
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}))
const mocked = vi.mocked(api, true)

const installment = (over: Partial<Installment> = {}): Installment => ({
  id: 'i1', number: 2, amount: '250.00', paidAmount: '0.00', dueDate: '2026-11-06T00:00:00.000Z',
  paidAt: null, status: 'PENDING', debtId: 'debt1', payments: [], ...over,
})
const target = (inst: Installment = installment()): PaymentTarget => ({
  installment: inst,
  debtor: { id: 'd1', name: 'João Araújo', avatarHue: 200, avatarEmoji: null },
  debtDescription: 'Notebook',
  installmentCount: 12,
})

function Harness({ initial }: { initial: PaymentTarget }) {
  const [t, setT] = useState<PaymentTarget | null>(initial)
  return (
    <>
      <button onClick={() => setT(initial)}>Reabrir</button>
      <PaymentSheet target={t} onClose={() => setT(null)} />
    </>
  )
}

function renderSheet(t: PaymentTarget) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <PreferencesProvider>
        <ToastProvider>
          <Harness initial={t} />
        </ToastProvider>
      </PreferencesProvider>
    </QueryClientProvider>,
  )
}

describe('PaymentSheet (S2)', () => {
  beforeEach(() => {
    vi.setSystemTime(new Date('2026-11-09T12:00:00-03:00'))
    vi.clearAllMocks()
    mocked.get.mockResolvedValue({ data: { id: 'd1', name: 'João Araújo', phone: '(11) 91234-5678' } })
  })

  it('header gives the context: who, what and how late (improvement 6)', async () => {
    renderSheet(target())
    const dialog = await screen.findByRole('dialog', { name: 'Registrar pagamento de João Araújo' })
    expect(dialog).toHaveTextContent('Notebook · 2/12 · atrasada há 3 dias')
    // The 3 numbers Parcela / Já pago / Restante are gone: the amount already holds what is left.
    expect(within(dialog).queryByText('Restante')).toBeNull()
    expect(within(dialog).getByRole('textbox', { name: 'Valor recebido' })).toHaveValue('250,00')
  })

  it('WhatsApp reminder only for an overdue installment of someone with a phone', async () => {
    renderSheet(target())
    const wa = await screen.findByRole('link', { name: 'Lembrar João no WhatsApp' })
    expect(wa.getAttribute('href')).toMatch(/^https:\/\/wa\.me\/5511912345678\?text=Oi%2C%20Jo%C3%A3o!/)
    expect(wa).toHaveAttribute('target', '_blank')
  })

  it('no WhatsApp when the installment is not overdue', async () => {
    renderSheet(target(installment({ dueDate: '2026-11-20T00:00:00.000Z' })))
    await screen.findByRole('dialog')
    expect(screen.queryByRole('link', { name: /WhatsApp/ })).toBeNull()
    expect(mocked.get).not.toHaveBeenCalled()
  })

  it('Total / Metade and the partial note; the button says what will happen', async () => {
    const user = userEvent.setup()
    renderSheet(target())
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByRole('button', { name: /^Quitar parcela · R\$\s250,00$/ })).toBeEnabled()
    await user.click(within(dialog).getByRole('button', { name: 'Metade' }))
    expect(within(dialog).getByRole('button', { name: 'Metade' })).toHaveAttribute('aria-pressed', 'true')
    expect(dialog).toHaveTextContent(/Pagamento parcial · restam R\$\s125,00/)
    expect(within(dialog).getByRole('button', { name: /^Registrar · R\$\s125,00$/ })).toBeInTheDocument()
    // Typed values are capped at what is left.
    const input = within(dialog).getByRole('textbox', { name: 'Valor recebido' })
    await user.clear(input)
    await user.type(input, '99999')
    expect(input).toHaveValue('250,00')
  })

  it('date in one line: Hoje (default), Ontem, Outra becomes a date field', async () => {
    const user = userEvent.setup()
    renderSheet(target())
    const dates = await screen.findByRole('group', { name: 'Data do pagamento' })
    expect(dates).toHaveTextContent('seg, 09 nov')
    await user.click(within(dates).getByRole('button', { name: 'Ontem' }))
    expect(dates).toHaveTextContent('dom, 08 nov')
    await user.click(within(dates).getByRole('button', { name: 'Outra' }))
    // Brazilian format, never the browser's native picker.
    const field = within(dates).getByRole('textbox', { name: 'Outra data do pagamento' })
    expect(field).toHaveValue('07/11/2026')
    expect(field).not.toHaveAttribute('type', 'date')
    const cal = await screen.findByRole('dialog', { name: 'Calendário: Outra data do pagamento' })
    await waitFor(() => expect(within(cal).getByRole('button', { name: 'sábado, 7 de novembro de 2026' })).toHaveFocus())
    // Future days are disabled (max = today).
    expect(within(cal).getByRole('button', { name: 'terça, 10 de novembro de 2026' })).toBeDisabled()
    await user.click(within(cal).getByRole('button', { name: 'quarta, 4 de novembro de 2026' }))
    expect(screen.queryByRole('dialog', { name: /Calendário/ })).toBeNull()
    expect(field).toHaveValue('04/11/2026')
    expect(dates).toHaveTextContent('qua, 04 nov')
    // The sheet is still open.
    expect(screen.getByRole('dialog', { name: /Registrar pagamento/ })).toBeInTheDocument()
  })

  it('Esc closes the calendar only, not the sheet', async () => {
    const user = userEvent.setup()
    renderSheet(target())
    const dates = await screen.findByRole('group', { name: 'Data do pagamento' })
    await user.click(within(dates).getByRole('button', { name: 'Outra' }))
    await screen.findByRole('dialog', { name: /Calendário/ })
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog', { name: /Calendário/ })).toBeNull()
    expect(screen.getByRole('dialog', { name: /Registrar pagamento/ })).toBeInTheDocument()
    expect(within(dates).getByRole('textbox', { name: 'Outra data do pagamento' })).toHaveFocus()
  })

  it('confirm registers, closes and offers "Desfazer", which deletes that payment (improvement 7)', async () => {
    const user = userEvent.setup()
    mocked.post.mockResolvedValue({ data: { installment: installment({ paidAmount: '250.00', status: 'PAID' }), payment: { id: 'p9', amount: '250.00', paidAt: '2026-11-09' } } })
    mocked.delete.mockResolvedValue({ data: installment() })
    renderSheet(target())
    await user.click(await screen.findByRole('button', { name: /^Quitar parcela/ }))
    expect(mocked.post).toHaveBeenCalledWith('/installments/i1/payments', { amount: 250, paidAt: '2026-11-09' })
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(await screen.findByText('Parcela quitada · João')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Desfazer' }))
    expect(mocked.delete).toHaveBeenCalledWith('/installments/i1/payments/p9')
    expect(await screen.findByText('Pagamento desfeito')).toBeInTheDocument()
  })

  it('deleting from the history can be undone too', async () => {
    const user = userEvent.setup()
    const paidOnce = installment({ paidAmount: '100.00', payments: [{ id: 'p1', amount: '100.00', paidAt: '2026-11-01T00:00:00.000Z' }] })
    mocked.delete.mockResolvedValue({ data: installment() })
    mocked.post.mockResolvedValue({ data: { installment: paidOnce, payment: { id: 'p2', amount: '100.00', paidAt: '2026-11-01' } } })
    renderSheet(target(paidOnce))
    const dialog = await screen.findByRole('dialog')
    expect(dialog).toHaveTextContent(/Já pago R\$\s100,00 de R\$\s250,00/)
    const toggle = within(dialog).getByRole('button', { name: /1 pagamento anterior · R\$\s100,00/ })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await user.click(toggle)
    await user.click(within(dialog).getByRole('button', { name: /^Excluir pagamento de R\$\s100,00 de 01 nov$/ }))
    expect(mocked.delete).toHaveBeenCalledWith('/installments/i1/payments/p1')
    expect(await screen.findByText(/Pagamento de R\$\s100,00 excluído/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Desfazer' }))
    expect(mocked.post).toHaveBeenCalledWith('/installments/i1/payments', { amount: 100, paidAt: '2026-11-01' })
    expect(await screen.findByText('Pagamento restaurado')).toBeInTheDocument()
  })

  it('a paid installment opens read-only with its payments', async () => {
    renderSheet(target(installment({ paidAmount: '250.00', payments: [{ id: 'p1', amount: '250.00', paidAt: '2026-11-03T00:00:00.000Z' }] })))
    const dialog = await screen.findByRole('dialog', { name: 'Pagamentos da parcela de João Araújo' })
    expect(dialog).toHaveTextContent('Parcela quitada')
    expect(within(dialog).queryByRole('textbox')).toBeNull()
    expect(within(dialog).getByRole('button', { name: /Excluir pagamento de R\$\s250,00 de 03 nov/ })).toBeInTheDocument()
    expect(within(dialog).getAllByRole('button', { name: 'Fechar' }).length).toBeGreaterThan(0)
  })

  it('a failure keeps the sheet open and says nothing was saved', async () => {
    const user = userEvent.setup()
    mocked.post.mockRejectedValue({ response: { data: { error: 'boom' } } })
    renderSheet(target())
    await user.click(await screen.findByRole('button', { name: /^Quitar parcela/ }))
    expect(await screen.findByText(/Erro ao registrar pagamento|boom/)).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })
})
