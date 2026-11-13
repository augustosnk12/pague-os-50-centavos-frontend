import { describe, it, expect } from 'vitest'
import { daysUntil, installmentTag, remainingCents } from './installmentTag'

const TODAY = '2026-11-09'
const inst = (due: string, amount = '100.00', paidAmount = '0.00') => ({ dueDate: `${due}T00:00:00.000Z`, amount, paidAmount })

describe('installmentTag', () => {
  it('counts calendar days, whatever the time of the ISO string', () => {
    expect(daysUntil('2026-11-09T00:00:00.000Z', TODAY)).toBe(0)
    expect(daysUntil('2026-11-12', TODAY)).toBe(3)
    expect(daysUntil('2026-10-31', TODAY)).toBe(-9)
    // across the DST-free UTC math and a month change
    expect(daysUntil('2026-12-01', '2026-11-30')).toBe(1)
  })

  it('remaining uses integer cents', () => {
    expect(remainingCents({ amount: '0.30', paidAmount: '0.10' })).toBe(20)
    expect(remainingCents({ amount: '100.00', paidAmount: '120.00' })).toBe(0)
  })

  it('overdue: "Nd atraso", with "Parcial" when something was paid', () => {
    expect(installmentTag(inst('2026-11-06'), TODAY)).toEqual({ text: '3d atraso', spoken: '3 dias de atraso', tone: 'overdue' })
    expect(installmentTag(inst('2026-11-08'), TODAY)?.spoken).toBe('1 dia de atraso')
    expect(installmentTag(inst('2026-11-06', '100.00', '40.00'), TODAY)?.text).toBe('Parcial · 3d atraso')
  })

  it('today, partial, paid and future dates', () => {
    expect(installmentTag(inst('2026-11-09'), TODAY)?.text).toBe('Vence hoje')
    expect(installmentTag(inst('2026-11-15', '100.00', '40.00'), TODAY)?.text).toMatch(/^Parcial · falta R\$\s60,00$/)
    expect(installmentTag(inst('2026-11-01', '100.00', '100.00'), TODAY)?.tone).toBe('paid')
    expect(installmentTag(inst('2026-11-12'), TODAY)).toEqual({ text: '12 nov', spoken: 'vence em 12 nov', tone: 'muted' })
    expect(installmentTag(inst('2026-11-10'), TODAY)?.spoken).toBe('vence amanhã')
    expect(installmentTag(inst('2026-11-12'), TODAY, { showDate: false })).toBeNull()
  })
})
