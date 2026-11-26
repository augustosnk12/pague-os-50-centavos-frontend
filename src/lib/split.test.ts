import { describe, it, expect } from 'vitest'
import { checkSplit, equalShares, shareInstallments, splitInstallment } from './split'
import { genInstallments } from './utils'

const sp = (s: string) => s.replace(/\u00a0/g, ' ')

describe('split a bill (item 66)', () => {
  it('equal parts: leftover cents to the first people, never to "Você"', () => {
    expect(equalShares(32000, ['a', 'b', 'c'], true).map((x) => x.cents)).toEqual([8000, 8000, 8000])
    expect(equalShares(10000, ['a', 'b'], true).map((x) => x.cents)).toEqual([3334, 3333])
    expect(equalShares(10001, ['a', 'b', 'c'], false).map((x) => x.cents)).toEqual([3334, 3334, 3333])
  })

  it('installments by the same rule as genInstallments (and the API)', () => {
    for (const [c, n] of [[8000, 3], [5001, 2], [10000, 7], [6400, 3], [1, 1]] as const) {
      const g = genInstallments(c / 100, n, '2026-12-10T00:00:00.000Z').map((p) => Math.round(Number(p.amount) * 100))
      const q = splitInstallment(c, n)
      expect([q.first, ...Array(n - 1).fill(q.rest)]).toEqual(g)
    }
    expect(sp(shareInstallments(8000, 3, false))).toBe('R$ 26,66 + 2× R$ 26,67')
    expect(sp(shareInstallments(6000, 3, false))).toBe('3× R$ 20,00')
    expect(shareInstallments(6000, 1, false)).toBe('à vista')
    expect(sp(shareInstallments(6000, 1, true))).toBe('R$ 60,00 por mês')
  })

  it('checks: too small for the installments, over the total, short of it without "Você", empty fields', () => {
    const base = { totalCents: 10000, ids: ['a', 'b'], withMe: false, installments: 3 }
    expect(checkSplit({ ...base, mode: 'equal', custom: {} }).problem).toBeNull()
    expect(checkSplit({ ...base, totalCents: 5, mode: 'equal', custom: {} })).toMatchObject({ problem: 'tiny', tiny: { id: 'b', cents: 2 } })
    expect(checkSplit({ ...base, mode: 'custom', custom: { a: '6000', b: '5000' } }).problem).toBe('over')
    expect(checkSplit({ ...base, mode: 'custom', custom: { a: '6000', b: '3000' } }).problem).toBe('short')
    expect(checkSplit({ ...base, withMe: true, mode: 'custom', custom: { a: '6000', b: '3000' } })).toMatchObject({ problem: null, mine: 1000 })
    expect(checkSplit({ ...base, mode: 'custom', custom: { a: '10000' } }).problem).toBe('empty')
    expect(checkSplit({ ...base, mode: 'custom', custom: { a: '9998', b: '2' } })).toMatchObject({ problem: 'tiny', tiny: { id: 'b' } })
  })
})
