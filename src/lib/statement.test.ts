import { describe, it, expect } from 'vitest'
import type { DebtWithInstallments } from '../hooks/debts/useDebtsByDebtor'
import type { Installment } from '../types/installment'
import { buildStatement, monthEnd, statementPix, statementText } from './statement'

const inst = (number: number, due: string, amount: string, paid = '0.00', payments: Installment['payments'] = []): Installment => ({
  id: `i${number}-${due}`, number, amount, paidAmount: paid, dueDate: `${due}T00:00:00.000Z`, paidAt: null, status: 'PENDING', debtId: 'x', payments,
})
const debt = (id: string, description: string | null, installments: Installment[], recurrence: 'MONTHLY' | null = null): DebtWithInstallments => ({
  id, description, type: 'PIX', totalAmount: '0', debtorId: 'd', createdAt: '2026-01-01T00:00:00.000Z', recurrence, installments,
})
const pay = (amount: string) => ({ id: `p${amount}`, amount, paidAt: '2026-10-01T12:00:00.000Z' }) as NonNullable<Installment['payments']>[number]

const today = '2026-11-19'
const debts = [
  debt('a', 'Notebook', [
    inst(1, '2026-10-10', '100.00', '100.00', [pay('100.00')]),
    inst(2, '2026-11-10', '100.00', '40.00', [pay('40.00')]),
    inst(3, '2026-12-10', '100.00'),
  ]),
  debt('b', 'Academia', [inst(1, '2026-11-25', '90.00'), inst(2, '2026-12-25', '90.00')], 'MONTHLY'),
  debt('c', 'Mercado', [inst(1, '2026-12-01', '30.00')]),
]

describe('Extrato do devedor', () => {
  it('open installments per debt: what is left, labels, debts with something late first', () => {
    const s = buildStatement([debts[1], debts[0]], today, { until: 'all', history: false })
    expect(s.debts.map((d) => d.title)).toEqual(['Notebook', 'Academia'])
    expect(s.debts[0].rows.map((r) => [r.label, r.cents, r.late])).toEqual([['Parcela 2/3', 6000, true], ['Parcela 3/3', 10000, false]])
    expect(s.debts[1].rows.map((r) => r.label)).toEqual(['Mensalidade de novembro', 'Mensalidade de dezembro'])
    expect(s.totalCents).toBe(16000 + 18000)
    expect(s.lateCents).toBe(6000)
  })

  it('"Até o fim do mês" drops later installments and debts left empty', () => {
    expect(monthEnd('2026-02-10')).toBe('2026-02-28')
    const s = buildStatement(debts, today, { until: 'month', history: false })
    expect(s.debts.map((d) => [d.title, d.leftCents])).toEqual([['Notebook', 6000], ['Academia', 9000]])
  })

  it('history counts every payment; Pix charges the late part, or else the total', () => {
    const s = buildStatement(debts, today, { until: 'all', history: true })
    expect([s.receivedCents, s.paymentCount]).toEqual([14000, 2])
    expect(statementPix(s)).toEqual({ cents: 6000, what: 'o que está em atraso' })
    const noLate = buildStatement([debts[2]], today, { until: 'all', history: false })
    expect(statementPix(noLate)).toEqual({ cents: 3000, what: 'o total' })
    expect(statementPix(buildStatement([], today, { until: 'all', history: false }))).toBeNull()
  })

  it('WhatsApp text', () => {
    const s = buildStatement([debts[0]], today, { until: 'all', history: true })
    expect(statementText('Maria Rocha', '19/11/2026', s, 'PIXCODE').replace(/\u00a0/g, ' ')).toBe(
      [
        '📄 Extrato de Maria Rocha · 19/11/2026',
        '',
        'Total em aberto: R$ 160,00',
        'Em atraso: R$ 60,00 ⚠️',
        '',
        '*Notebook* · R$ 160,00',
        '• Parcela 2/3 · venceu 10 nov · R$ 60,00 ⚠️',
        '• Parcela 3/3 · vence 10 dez · R$ 100,00',
        '',
        'Já pago: R$ 140,00 em 2 pagamentos',
        '',
        'Pix copia e cola (R$ 60,00, o que está em atraso):',
        'PIXCODE',
      ].join('\n'),
    )
    const none = buildStatement([], today, { until: 'month', history: false })
    expect(statementText('Ana', '19/11/2026', none, null)).toBe('📄 Extrato de Ana · 19/11/2026\n\nNada em aberto até o fim do mês. ✅')
  })
})
