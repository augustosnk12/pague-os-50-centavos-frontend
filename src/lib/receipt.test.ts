import { describe, it, expect } from 'vitest'
import { buildReceipt, longDate, receiptCode, receiptText, type ReceiptDebt } from './receipt'

const pay = (id: string, amount: string, paidAt: string, batchId: string | null = null) => ({ id, amount, paidAt: `${paidAt}T00:00:00.000Z`, batchId })
const who = { from: 'Ana Ribeiro', to: 'Augusto Silva' }

const notebook: ReceiptDebt = {
  id: 'nb',
  description: 'Notebook',
  installments: [
    { id: 'n1', number: 1, amount: '100.00', paidAmount: '100.00', payments: [pay('pay_aaa11', '100.00', '2026-10-03')] },
    { id: 'n2', number: 2, amount: '100.00', paidAmount: '40.00', payments: [pay('pay_bbb22', '40.00', '2026-11-03')] },
    { id: 'n3', number: 3, amount: '100.00', paidAmount: '0.00', payments: [] },
  ],
}

describe('receipts', () => {
  it('date and code', () => {
    expect(longDate('2026-11-03T00:00:00.000Z')).toBe('terça, 3 de novembro de 2026')
    expect(receiptCode('cm3xk9pay_bbb22', '2026-11-03T00:00:00.000Z')).toBe('P50-BBB22-261103')
  })

  it('one payment: installment partial, balance of the whole debt', () => {
    const r = buildReceipt([notebook], { debtorId: 'd', paymentId: 'pay_bbb22' }, who)!
    expect(r).toMatchObject({
      kind: 'payment', title: 'Comprovante de pagamento', totalCents: 4000, date: 'terça, 3 de novembro de 2026',
      ref: 'Notebook · parcela 2/3', installment: 'Parcial · restam R$ 60,00', balance: 'R$ 160,00',
    })
    expect(receiptText(r)).toBe(
      ['✅ Comprovante de pagamento', 'P50-BBB22-261103', '', 'Recebi R$ 40,00 de Ana Ribeiro em terça, 3 de novembro de 2026.', 'Referente a: Notebook · parcela 2/3', 'Parcela: Parcial · restam R$ 60,00', 'Saldo da dívida: R$ 160,00', '', 'Obrigado! 🙌'].join('\n'),
    )
  })

  it('a batch: every payment of the batch, across debts', () => {
    const a: ReceiptDebt = { id: 'a', description: 'Mercado', installments: [{ id: 'a1', number: 1, amount: '50.00', paidAmount: '50.00', payments: [pay('p1', '50.00', '2026-11-05', 'B1')] }] }
    const b: ReceiptDebt = { id: 'b', description: 'Aluguel', recurrence: 'MONTHLY', installments: [{ id: 'b1', number: 4, amount: '300.00', paidAmount: '100.00', payments: [pay('p2', '100.00', '2026-11-05', 'B1')] }] }
    const r = buildReceipt([a, b], { debtorId: 'd', paymentId: 'p2' }, who)!
    expect(r.kind).toBe('batch')
    expect(r.totalCents).toBe(15000)
    expect(r.items).toEqual([
      { ref: 'Mercado · parcela 1/1', amount: 'R$ 50,00', status: 'quitada' },
      { ref: 'Aluguel · mensalidade', amount: 'R$ 100,00', status: 'parcial' },
    ])
    expect(r.balance).toBe('R$ 200,00')
  })

  it('payoff: only for fully paid, non-recurring debts; payments grouped by date', () => {
    expect(buildReceipt([notebook], { debtorId: 'd', payoffDebtId: 'nb' }, who)).toBeNull()
    const paid: ReceiptDebt = {
      id: 'q', description: 'Celular',
      installments: [
        { id: 'q1', number: 1, amount: '100.00', paidAmount: '100.00', payments: [pay('x1', '100.00', '2026-09-10')] },
        { id: 'q2', number: 2, amount: '100.00', paidAmount: '100.00', payments: [pay('x2', '100.00', '2026-11-08')] },
        { id: 'q3', number: 3, amount: '100.00', paidAmount: '100.00', payments: [pay('x3', '100.00', '2026-11-08')] },
      ],
    }
    const r = buildReceipt([paid], { debtorId: 'd', payoffDebtId: 'q' }, who)!
    expect(r).toMatchObject({ kind: 'payoff', title: 'Comprovante de quitação', totalCents: 30000, date: 'Quitada em domingo, 8 de novembro de 2026', ref: 'Celular · 3 parcelas', balance: 'Quitada' })
    expect(r.items).toEqual([{ ref: '10 set · parcela 1/3', amount: 'R$ 100,00' }, { ref: '08 nov · 2 parcelas', amount: 'R$ 200,00' }])
    expect(receiptText(r)).toContain('Total pago: R$ 300,00 · quitada em domingo, 8 de novembro de 2026.')
    expect(buildReceipt([{ ...paid, recurrence: 'MONTHLY' }], { debtorId: 'd', payoffDebtId: 'q' }, who)).toBeNull()
  })

  it('payoff with more than 6 dates sums the oldest in one line', () => {
    const many: ReceiptDebt = {
      id: 'm', description: 'Moto',
      installments: Array.from({ length: 8 }, (_, k) => ({
        id: `m${k}`, number: k + 1, amount: '10.00', paidAmount: '10.00', payments: [pay(`y${k}`, '10.00', `2026-0${k + 1}-05`)],
      })),
    }
    const r = buildReceipt([many], { debtorId: 'd', payoffDebtId: 'm' }, who)!
    expect(r.items).toHaveLength(6)
    expect(r.items![0]).toEqual({ ref: '3 pagamentos anteriores', amount: 'R$ 30,00' })
  })
})
