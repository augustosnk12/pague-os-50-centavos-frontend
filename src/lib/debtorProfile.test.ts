import { describe, it, expect } from 'vitest'
import { openInstallments, paidOffOn, paymentTimeline, profileNumbers, splitDebts } from './debtorProfile'
import type { DebtWithInstallments } from '../hooks/debts/useDebtsByDebtor'

const TODAY = '2026-11-12'
const pay = (id: string, amount: string, on: string) => ({ id, amount, paidAt: `${on}T12:00:00.000Z` })
const inst = (id: string, number: number, due: string, amount = '100.00', paid = '0.00', payments: ReturnType<typeof pay>[] = []) => ({
  id, number, amount, paidAmount: paid, dueDate: `${due}T00:00:00.000Z`, paidAt: null, status: 'PENDING' as const, debtId: 'x', payments,
})
const debt = (id: string, installments: ReturnType<typeof inst>[], extra: Partial<DebtWithInstallments> = {}): DebtWithInstallments => ({
  id, description: id, type: 'PIX_INSTALLMENT', totalAmount: '0', debtorId: 'd', createdAt: '2026-01-01', installments, ...extra,
})

const notebook = debt('Notebook', [
  inst('n1', 1, '2026-10-05', '100.00', '100.00', [pay('p1', '100.00', '2026-10-05')]), // on time
  inst('n2', 2, '2026-11-05', '100.00', '40.00', [pay('p2', '40.00', '2026-11-08')]), // partial, late
  inst('n3', 3, '2026-12-05'),
])
const celular = debt('Celular', [inst('c1', 1, '2026-09-01', '50.00', '50.00', [pay('p3', '50.00', '2026-09-04')])]) // paid 3 days late
const mercado = debt('Mercado', [inst('m1', 1, '2026-11-20', '30.00')])

describe('debtor profile', () => {
  it('header numbers: owed, overdue, next due, received, on-time rate', () => {
    expect(profileNumbers([notebook, celular, mercado], TODAY)).toEqual({
      owed: 6000 + 10000 + 3000, late: 6000, next: '2026-11-20', received: 19000, onTime: 0.5, paidCount: 2, count: 5,
    })
  })

  it('open debts with overdue first; paid-off debts apart', () => {
    const { open, paid } = splitDebts([mercado, notebook, celular], TODAY)
    expect(open.map((d) => d.id)).toEqual(['Notebook', 'Mercado'])
    expect(paid.map((d) => d.id)).toEqual(['Celular'])
    expect(paidOffOn(celular)).toBe('2026-09-04')
    expect(openInstallments(notebook).map((i) => i.id)).toEqual(['n2', 'n3'])
  })

  it('timeline newest first, with days after the due day', () => {
    const t = paymentTimeline([notebook, celular])
    expect(t.map((e) => [e.payment.id, e.daysLate])).toEqual([['p2', 3], ['p1', 0], ['p3', 3]])
  })
})
