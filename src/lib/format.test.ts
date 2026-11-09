import { describe, it, expect } from 'vitest'
import { fmtList, fmtTitle, fmtSentence, fmtMoney } from './format'

describe('glossary date formats (improvement 30)', () => {
  it('list / title / sentence', () => {
    expect(fmtList('2026-11-03')).toBe('03 nov')
    expect(fmtTitle('2026-11-03')).toBe('ter, 03 nov')
    expect(fmtSentence('2026-11-03', 2026)).toBe('terça, 3 de novembro')
    expect(fmtSentence('2027-01-01', 2026)).toBe('sexta, 1 de janeiro de 2027')
  })

  it('reads API due dates as calendar days (no shift at UTC midnight in Brazil)', () => {
    expect(fmtList('2026-11-10T00:00:00.000Z')).toBe('10 nov')
    expect(fmtTitle(new Date('2026-03-01T00:00:00.000Z'))).toBe('dom, 01 mar')
  })

  it('money', () => {
    expect(fmtMoney(1234.5).replace(/\s/g, ' ')).toBe('R$ 1.234,50')
  })
})
