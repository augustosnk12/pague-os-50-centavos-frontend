import { describe, it, expect } from 'vitest'
import {
  buildView, dayLabel, periodLabel, periodRange, readUrlState, relativeLabel, shiftPeriod, weekDays, writeUrlState,
} from './installmentsView'
import type { InstallmentEnriched } from '../types/installment'

const TODAY = '2026-11-09' // Monday

let seq = 0
const inst = (due: string, amount = '100.00', paid = '0.00', debtorId = 'd1'): InstallmentEnriched => ({
  id: `i${++seq}`, number: 1, amount, paidAmount: paid, dueDate: `${due}T00:00:00.000Z`, paidAt: null, status: 'PENDING', debtId: 'x',
  debt: { id: 'x', description: 'Algo', type: 'PIX', debtorId, debtor: { id: debtorId, name: debtorId, avatarHue: null, avatarEmoji: null } },
})

describe('periods', () => {
  it('ranges: weeks start on Monday (as the API); months are calendar months', () => {
    expect(periodRange('week', '2026-11-15')).toEqual(['2026-11-09', '2026-11-15'])
    expect(periodRange('week', '2026-11-09')).toEqual(['2026-11-09', '2026-11-15'])
    expect(periodRange('month', '2026-02-10')).toEqual(['2026-02-01', '2026-02-28'])
    expect(periodRange('day', TODAY)).toEqual([TODAY, TODAY])
  })

  it('shifting a month keeps a valid day', () => {
    expect(shiftPeriod('month', '2026-01-31', 1)).toBe('2026-02-28')
    expect(shiftPeriod('week', TODAY, -1)).toBe('2026-11-02')
    expect(shiftPeriod('day', '2026-12-31', 1)).toBe('2027-01-01')
  })

  it('labels', () => {
    expect(periodLabel('month', TODAY)).toBe('Novembro 2026')
    expect(periodLabel('week', TODAY)).toBe('9 – 15 nov')
    expect(periodLabel('week', '2026-10-01')).toBe('28 set – 4 out')
    expect(periodLabel('day', TODAY)).toBe('seg, 09 nov')
    expect(relativeLabel('month', TODAY, TODAY)).toBe('Este mês')
    expect(relativeLabel('month', '2026-09-01', TODAY)).toBe('Há 2 meses')
    expect(relativeLabel('week', '2026-11-17', TODAY)).toBe('Próxima semana')
    expect(relativeLabel('day', '2026-11-08', TODAY)).toBe('Ontem')
    expect(dayLabel('2026-11-10', TODAY)).toBe('Amanhã')
    expect(dayLabel('2026-11-12', TODAY)).toBe('qui, 12 nov')
    expect(weekDays('2026-11-12')).toEqual(['2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13', '2026-11-14', '2026-11-15'])
  })
})

describe('buildView', () => {
  const items = [
    inst('2026-10-05'), // overdue from before the month
    inst('2026-11-02', '100.00', '40.00'), // partial, overdue → counts as overdue
    inst('2026-11-09', '50.00', '50.00'), // paid today
    inst('2026-11-09', '80.00'), // due today
    inst('2026-11-20', '200.00', '0.00', 'd2'),
  ]

  it('tabs count; Atrasadas includes the previous periods; partial overdue counts as overdue', () => {
    const v = buildView(items, { period: 'month', anchor: TODAY, today: TODAY, tab: 'all', debtorIds: [] })
    expect(v.counts).toEqual({ all: 4, open: 3, overdue: 2, paid: 1 })
    expect(v.previous).toHaveLength(1)
    expect(v.previousCents).toBe(10000)
  })

  it('totals of the period in cents', () => {
    const v = buildView(items, { period: 'month', anchor: TODAY, today: TODAY, tab: 'all', debtorIds: [] })
    expect(v.totals).toEqual({ expected: 43000, received: 9000, overdue: 6000, pending: 28000, due: 34000 })
  })

  it('groups by day: open first, paid apart; Atrasadas lists the previous ones first', () => {
    const all = buildView(items, { period: 'month', anchor: TODAY, today: TODAY, tab: 'all', debtorIds: [] })
    expect(all.groups.map((g) => g.day)).toEqual(['2026-11-02', '2026-11-09', '2026-11-20'])
    const today = all.groups[1]
    expect([today.open.length, today.paid.length, today.dueCents, today.paidCents]).toEqual([1, 1, 8000, 5000])
    const late = buildView(items, { period: 'month', anchor: TODAY, today: TODAY, tab: 'overdue', debtorIds: [] })
    expect(late.groups.map((g) => g.day)).toEqual(['2026-10-05', '2026-11-02'])
  })

  it('debtor filter', () => {
    const v = buildView(items, { period: 'month', anchor: TODAY, today: TODAY, tab: 'all', debtorIds: ['d2'] })
    expect(v.counts.all).toBe(1)
    expect(v.previous).toHaveLength(0)
  })
})

describe('URL state', () => {
  it('round-trips and keeps the default URL clean', () => {
    const s = { period: 'week' as const, anchor: '2026-11-20', tab: 'overdue' as const, debtorIds: ['a', 'b'] }
    const p = writeUrlState(s, TODAY)
    expect(p.toString()).toBe('periodo=semana&data=2026-11-20&aba=atrasadas&devedores=a%2Cb')
    expect(readUrlState(p, TODAY)).toEqual({ ...s, summary: false })
    expect(writeUrlState({ period: 'month', anchor: TODAY, tab: 'all', debtorIds: [] }, TODAY).toString()).toBe('')
  })

  it('accepts the older names (?period=week, ?status=overdue) and ?resumo=1', () => {
    expect(readUrlState(new URLSearchParams('period=week&status=overdue&resumo=1'), TODAY)).toMatchObject({ period: 'week', tab: 'overdue', summary: true })
    expect(readUrlState(new URLSearchParams('data=lixo'), TODAY).anchor).toBe(TODAY)
  })
})
