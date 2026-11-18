import { describe, it, expect } from 'vitest'
import { allocate, batchCandidates, dueThisMonth, monthEnd } from './batch'
import type { DebtWithInstallments } from '../hooks/debts/useDebtsByDebtor'

const inst = (id: string, number: number, due: string, amount: string, paid = '0.00') => ({
  id, number, amount, paidAmount: paid, dueDate: `${due}T00:00:00.000Z`, paidAt: null, status: 'PENDING', debtId: 'x', payments: [],
})
const debt = (id: string, description: string, installments: ReturnType<typeof inst>[]) =>
  ({ id, description, type: 'PIX', totalAmount: '0', debtorId: 'd1', createdAt: '2026-01-01', installments }) as unknown as DebtWithInstallments

// The mock's example: Maria owes Roupa 10 + Viagem 20 + Comida 30 in November, sends 60.
const TODAY = '2026-11-13'
const DEBTS = [
  debt('c', 'Comida', [inst('c1', 1, '2026-11-25', '30.00')]),
  debt('r', 'Roupa', [inst('r1', 1, '2026-11-05', '10.00'), inst('r2', 2, '2026-12-05', '10.00')]),
  debt('v', 'Viagem', [inst('v1', 1, '2026-11-20', '25.00', '5.00'), inst('v0', 0, '2026-10-20', '5.00', '5.00')]),
]

describe('Receber várias (S7)', () => {
  const cands = batchCandidates(DEBTS, TODAY)
  const month = new Set(cands.filter((c) => dueThisMonth(c, TODAY)).map((c) => c.inst.id))

  it('lists open installments of every debt, overdue first; this month preselected', () => {
    expect(monthEnd(TODAY)).toBe('2026-11-30')
    expect(monthEnd('2026-02-10')).toBe('2026-02-28')
    expect(cands.map((c) => c.inst.id)).toEqual(['r1', 'v1', 'c1', 'r2'])
    expect(cands.map((c) => c.left)).toEqual([1000, 2000, 3000, 1000])
    expect([...month]).toEqual(['r1', 'v1', 'c1'])
  })

  it('the exact total pays every selected one', () => {
    const a = allocate(cands, month, 6000)
    expect(a).toMatchObject({ selTotal: 6000, over: 0, full: 3, partial: null, notCovered: 0 })
    expect([...a.amounts]).toEqual([['r1', 1000], ['v1', 2000], ['c1', 3000]])
  })

  it('less goes oldest first; the last one reached stays partial', () => {
    const a = allocate(cands, month, 5000)
    expect(a.full).toBe(2)
    expect(a.partial?.inst.id).toBe('c1')
    expect(a.amounts.get('c1')).toBe(2000)
    const b = allocate(cands, month, 2500)
    expect(b).toMatchObject({ full: 1, notCovered: 1 })
    expect(b.partial?.inst.id).toBe('v1')
  })

  it('more than the selected ones is reported, not spread', () => {
    expect(allocate(cands, month, 7000).over).toBe(1000)
    expect(allocate(cands, new Set(), 1000)).toMatchObject({ over: 1000, selTotal: 0, full: 0 })
  })
})
