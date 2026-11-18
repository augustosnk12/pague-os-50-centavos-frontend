import { describe, it, expect, vi, afterEach } from 'vitest'
import { deriveInstStatus, genInstallments, money } from './utils'
import { formatCents, parseCurrencyDigits } from './currency'
import { formatCep, parseCep } from './cep'

afterEach(() => vi.useRealTimers())

describe('deriveInstStatus', () => {
  const today = new Date('2026-11-05T12:00:00Z')
  const at = (d: string) => `${d}T00:00:00.000Z`

  it('is PAID when paidAt is set, regardless of the API status', () => {
    vi.setSystemTime(today)
    expect(deriveInstStatus({ dueDate: at('2026-10-01'), paidAt: at('2026-10-02') })).toBe('PAID')
  })

  it('is OVERDUE after the due day, but not on the due day itself', () => {
    vi.setSystemTime(today)
    expect(deriveInstStatus({ dueDate: at('2026-11-04'), paidAt: null })).toBe('OVERDUE')
    expect(deriveInstStatus({ dueDate: at('2026-11-05'), paidAt: null })).toBe('PENDING')
    expect(deriveInstStatus({ dueDate: at('2026-11-06'), paidAt: null })).toBe('PENDING')
  })

  it('is PARTIALLY_PAID while something but not everything was paid', () => {
    vi.setSystemTime(today)
    expect(deriveInstStatus({ dueDate: at('2026-12-01'), paidAt: null, paidAmount: '40', amount: '100' })).toBe(
      'PARTIALLY_PAID',
    )
  })
})

describe('genInstallments (mirrors the API rule)', () => {
  it('splits the total and gives the cent remainder to installment #1', () => {
    const out = genInstallments(100, 3, '2026-12-10T00:00:00.000Z')
    expect(out.map((i) => i.amount)).toEqual(['33.34', '33.33', '33.33'])
    expect(out.map((i) => i.dueDate.slice(0, 10))).toEqual(['2026-12-10', '2027-01-10', '2027-02-10'])
  })

  it('rounds each one half-up, like the API (#1 can be a cent less)', () => {
    expect(genInstallments(200, 3, '2026-12-10T00:00:00.000Z').map((i) => i.amount)).toEqual(['66.66', '66.67', '66.67'])
  })

  it('days 29–31 fall on the last day of shorter months', () => {
    const out = genInstallments(400, 4, '2027-01-31T00:00:00.000Z')
    expect(out.map((i) => i.dueDate.slice(0, 10))).toEqual(['2027-01-31', '2027-02-28', '2027-03-31', '2027-04-30'])
  })

  it('returns nothing for an invalid date', () => {
    expect(genInstallments(100, 2, 'not a date')).toEqual([])
  })
})

describe('money and currency input', () => {
  it('formats BRL', () => {
    expect(money(1234.5).replace(/\s/g, ' ')).toBe('R$ 1.234,50')
  })

  it('keeps digits only, at most 10', () => {
    expect(parseCurrencyDigits('R$ 1.234,56abc')).toBe('123456')
    expect(parseCurrencyDigits('123456789012')).toBe('1234567890')
    expect(formatCents('123456')).toBe('1.234,56')
    expect(formatCents('')).toBe('')
  })
})

describe('CEP', () => {
  it('stores digits and displays 00000-000', () => {
    expect(parseCep('01310-100x')).toBe('01310100')
    expect(formatCep('01310100')).toBe('01310-100')
    expect(formatCep('0131')).toBe('0131')
  })
})
