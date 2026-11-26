import { describe, it, expect } from 'vitest'
import { buildForecast, forecastMonths, nextMonthlyDue, projectRecurring } from './forecast'
import type { InstallmentEnriched } from '../types/installment'
import type { DebtWithInstallments } from '../hooks/debts/useDebtsByDebtor'

const who = (id: string, name: string) => ({ id, name, avatarHue: 10, avatarEmoji: null })
const inst = (id: string, debtId: string, debtorId: string, name: string, due: string, amount: string, paid = '0.00', recurrence: 'MONTHLY' | null = null): InstallmentEnriched => ({
  id, number: 1, amount, paidAmount: paid, dueDate: `${due}T00:00:00.000Z`, paidAt: null, status: 'PENDING', debtId,
  debt: { id: debtId, description: null, type: 'PIX', debtorId, recurrence, debtor: who(debtorId, name) },
})
const recurring = (over: Partial<DebtWithInstallments>, dues: string[]): DebtWithInstallments => ({
  id: 'r1', description: 'Internet', type: 'PIX', totalAmount: '100.00', debtorId: 'p2', createdAt: '2026-09-01T00:00:00.000Z',
  recurrence: 'MONTHLY', recurrenceDay: 31, recurrenceActive: true, recurrenceOccurrences: null, recurrenceEndsAt: null,
  installments: dues.map((d, k) => ({ id: `ri${k}`, number: k + 1, amount: '100.00', paidAmount: '0.00', dueDate: `${d}T00:00:00.000Z`, paidAt: null, status: 'PENDING', debtId: 'r1' })),
  ...over,
})

describe('Previsão (improvement 69)', () => {
  it('six months starting with the current one, across the year', () => {
    expect(forecastMonths('2026-11-26')).toEqual(['2026-11', '2026-12', '2027-01', '2027-02', '2027-03', '2027-04'])
  })

  it('same rule as the API for the next monthly due date (day 31 → last day of short months)', () => {
    expect(nextMonthlyDue('2026-11-30', 31)).toBe('2026-12-31')
    expect(nextMonthlyDue('2027-01-31', 31)).toBe('2027-02-28')
    expect(nextMonthlyDue('2027-02-28', 31)).toBe('2027-03-31')
  })

  it('projects a recurrence until the window, its end date or its number of charges', () => {
    expect(projectRecurring(recurring({}, ['2026-11-30']), '2027-04')).toEqual(['2026-12-31', '2027-01-31', '2027-02-28', '2027-03-31', '2027-04-30'])
    expect(projectRecurring(recurring({ recurrenceOccurrences: 3 }, ['2026-10-31', '2026-11-30']), '2027-04')).toEqual(['2026-12-31'])
    expect(projectRecurring(recurring({ recurrenceEndsAt: '2027-01-31T00:00:00.000Z' }, ['2026-11-30']), '2027-04')).toEqual(['2026-12-31', '2027-01-31'])
    expect(projectRecurring(recurring({ recurrenceActive: false }, ['2026-11-30']), '2027-04')).toEqual([])
  })

  it('open part of what is due from today on, overdue left out, projected recurrences added, people sorted by amount', () => {
    const f = buildForecast({
      today: '2026-11-26',
      installments: [
        inst('a', 'd1', 'p1', 'Maria Rocha', '2026-11-10', '50.00'), // overdue → out
        inst('b', 'd1', 'p1', 'Maria Rocha', '2026-11-28', '50.00', '20.00'), // 30 open
        inst('c', 'd1', 'p1', 'Maria Rocha', '2026-12-28', '50.00'),
        inst('c', 'd1', 'p1', 'Maria Rocha', '2026-12-28', '50.00'), // duplicate
        inst('e', 'd1', 'p1', 'Maria Rocha', '2026-12-29', '50.00', '50.00'), // paid → nothing
        inst('ri0', 'r1', 'p2', 'Tio Carlos', '2026-11-30', '100.00', '0.00', 'MONTHLY'),
      ],
      recurringDebts: [recurring({}, ['2026-11-30'])],
    })
    expect(f.months.map((m) => m.cents)).toEqual([13000, 15000, 10000, 10000, 10000, 10000])
    expect(f.totalCents).toBe(68000)
    expect(f.recurringCents).toBe(60000)
    expect(f.count).toBe(8)
    expect(f.people.map((p) => [p.name, p.cents, p.count, p.last])).toEqual([
      ['Tio Carlos', 60000, 6, '2027-04-30'],
      ['Maria Rocha', 8000, 2, '2026-12-28'],
    ])
  })
})
