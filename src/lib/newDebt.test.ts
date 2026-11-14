import { describe, it, expect } from 'vitest'
import { addMonths, defaultDue, nextDayOf, recurrenceEnd, recurringPreview } from './newDebt'

describe('Nova dívida: datas (S8)', () => {
  it('addMonths keeps the day, or the last day of shorter months', () => {
    expect(addMonths('2026-11-10', 1)).toBe('2026-12-10')
    expect(addMonths('2027-01-31', 1)).toBe('2027-02-28')
    expect(addMonths('2026-12-31', 2)).toBe('2027-02-28')
  })

  it('nextDayOf: this month if still ahead, otherwise next month', () => {
    expect(nextDayOf(20, '2026-11-13')).toBe('2026-11-20')
    expect(nextDayOf(13, '2026-11-13')).toBe('2026-12-13')
    expect(nextDayOf(5, '2026-11-13')).toBe('2026-12-05')
    expect(nextDayOf(31, '2027-02-10')).toBe('2027-02-28')
    expect(nextDayOf(31, '2026-12-31')).toBe('2027-01-31')
  })

  it('defaultDue: the default day of card / Pix parcelado, otherwise the 1st of next month', () => {
    const s = { defaultCardDueDay: 10, defaultPixInstallmentDueDay: null }
    expect(defaultDue('CREDIT_CARD', s, '2026-11-13')).toBe('2026-12-10')
    expect(defaultDue('PIX_INSTALLMENT', s, '2026-11-13')).toBe('2026-12-01')
    expect(defaultDue('PIX', s, '2026-12-20')).toBe('2027-01-01')
    expect(defaultDue('CREDIT_CARD', undefined, '2026-11-13')).toBe('2026-12-01')
  })

  it('recurringPreview: the next 3, cut by the end chosen', () => {
    expect(recurringPreview('2026-12-10', 'never', 0, '')).toEqual(['2026-12-10', '2027-01-10', '2027-02-10'])
    expect(recurringPreview('2026-12-10', 'count', 2, '')).toEqual(['2026-12-10', '2027-01-10'])
    expect(recurringPreview('2026-12-10', 'date', 0, '2027-01-09')).toEqual(['2026-12-10'])
  })
})

describe('Término da recorrência', () => {
  it('after N charges: the date of the last one and how many are left', () => {
    expect(recurrenceEnd(['2026-11-10', '2026-12-10'], 10, { occurrences: 6 })).toEqual({ last: '2027-04-10', remaining: 4 })
    expect(recurrenceEnd(['2026-11-10', '2026-12-10'], 10, { occurrences: 2 })).toEqual({ last: '2026-12-10', remaining: 0 })
  })

  it('until a date: the last due day on or before it (31 → end of short months)', () => {
    expect(recurrenceEnd(['2026-12-31'], 31, { endsAt: '2027-03-15T00:00:00.000Z' })).toEqual({ last: '2027-02-28', remaining: 2 })
    expect(recurrenceEnd(['2026-11-10'], 10, { endsAt: '2026-11-10T00:00:00.000Z' })).toEqual({ last: '2026-11-10', remaining: 0 })
  })

  it('no end', () => {
    expect(recurrenceEnd(['2026-11-10'], 10, {})).toEqual({ last: null, remaining: null })
  })
})
