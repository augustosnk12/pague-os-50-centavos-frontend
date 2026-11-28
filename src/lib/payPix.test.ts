import { describe, it, expect } from 'vitest'
import { batchCandidates } from './batch'
import { pixOptions } from './payPix'
import type { DebtWithInstallments } from '../hooks/debts/useDebtsByDebtor'

const inst = (id: string, number: number, due: string, amount: string, paid = '0.00') => ({
  id, number, amount, paidAmount: paid, dueDate: `${due}T00:00:00.000Z`, paidAt: null, status: 'PENDING', debtId: 'x', payments: [],
})
const debt = (id: string, installments: ReturnType<typeof inst>[]) =>
  ({ id, description: id, type: 'PIX', totalAmount: '0', debtorId: 'c1', createdAt: '2026-01-01', installments }) as unknown as DebtWithInstallments

const TODAY = '2026-11-27'
const opts = (debts: DebtWithInstallments[]) => pixOptions(batchCandidates(debts, TODAY)).map((o) => [o.id, o.cents, o.ids])

describe('Pagar com Pix · options (item 75)', () => {
  it('late, next and everything, each with its installments', () => {
    const debts = [
      debt('carro', [inst('a1', 1, '2026-10-10', '200.00'), inst('a2', 2, '2026-11-10', '200.00', '50.00'), inst('a3', 3, '2026-12-10', '200.00')]),
      debt('tv', [inst('t1', 1, '2026-12-01', '80.00')]),
    ]
    expect(opts(debts)).toEqual([
      ['late', 35000, ['a1', 'a2']],
      ['next', 8000, ['t1']],
      ['all', 63000, ['a1', 'a2', 't1', 'a3']],
    ])
  })

  it('nothing late: Próxima and Tudo', () => {
    expect(opts([debt('d', [inst('x1', 1, '2026-12-05', '10.00'), inst('x2', 2, '2027-01-05', '10.00')])])).toEqual([
      ['next', 1000, ['x1']],
      ['all', 2000, ['x1', 'x2']],
    ])
  })

  it('an option equal to Tudo is dropped (one installment: only Tudo; only late ones: no Atrasado)', () => {
    expect(opts([debt('d', [inst('x1', 1, '2026-12-05', '10.00')])])).toEqual([['all', 1000, ['x1']]])
    expect(opts([debt('d', [inst('x1', 1, '2026-10-05', '10.00'), inst('x2', 2, '2026-11-05', '10.00')])])).toEqual([['all', 2000, ['x1', 'x2']]])
  })

  it('nothing open: no options', () => {
    expect(opts([debt('d', [inst('x1', 1, '2026-10-05', '10.00', '10.00')])])).toEqual([])
  })
})
