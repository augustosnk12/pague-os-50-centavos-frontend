import { describe, expect, it } from 'vitest'
import { calcInstallments, parseRate, priceInstallment } from './installmentCalc'

describe('calculadora de parcelas', () => {
  it('without interest splits like the app: the cent remainder goes to installment #1', () => {
    const r = calcInstallments(10_000, 3, '2026-01-31')!
    expect(r.rows.map((x) => x.cents)).toEqual([3334, 3333, 3333])
    expect(r.totalCents).toBe(10_000)
    expect(r.interestCents).toBe(0)
    // Day 31 falls on the last day of shorter months.
    expect(r.rows.map((x) => x.dueDate)).toEqual(['2026-01-31', '2026-02-28', '2026-03-31'])
  })

  it('with a monthly rate uses the Price table (fixed installment)', () => {
    // R$ 1.000,00 in 12× at 2% a.m. → R$ 94,56
    expect(priceInstallment(100_000, 12, 2)).toBe(9456)
    const r = calcInstallments(100_000, 12, '2026-12-10', 2)!
    expect(new Set(r.rows.map((x) => x.cents))).toEqual(new Set([9456]))
    expect(r.totalCents).toBe(113_472)
    expect(r.interestCents).toBe(13_472)
  })

  it('rejects what cannot be calculated', () => {
    expect(calcInstallments(0, 3, '2026-12-10')).toBeNull()
    expect(calcInstallments(1000, 0, '2026-12-10')).toBeNull()
    expect(calcInstallments(1000, 121, '2026-12-10')).toBeNull()
    expect(calcInstallments(1000, 3, '')).toBeNull()
    expect(calcInstallments(1000, 3, '2026-12-10', NaN)).toBeNull()
  })

  it('reads the rate as typed in pt-BR', () => {
    expect(parseRate('')).toBe(0)
    expect(parseRate('2,5')).toBe(2.5)
    expect(parseRate('1.99 %')).toBe(1.99)
    expect(parseRate('abc')).toBeNaN()
  })
})
