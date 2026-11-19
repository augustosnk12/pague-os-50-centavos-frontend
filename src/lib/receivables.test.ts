import { describe, it, expect } from 'vitest'
import type { ReportPayment } from '../api/payments.api'
import { initialPeriod, monthLabel, periodBounds, periodInvalid, periodLabel, receivablesCsv, receivablesFileName } from './receivables'

const pay = (over: Partial<ReportPayment>): ReportPayment => ({
  id: 'p', amount: '10.00', paidAt: '2026-11-03T12:00:00.000Z', batchId: null, batchKind: null, installmentId: 'i',
  installmentNumber: 2, installmentsCount: 6, debtId: 'x', debtDescription: 'Notebook', debtorId: 'd', debtorName: 'Mariana', ...over,
})

describe('Recebimentos: period', () => {
  const today = '2026-11-19'

  it('6 meses starts on the 1st of the month 5 months back (crossing the year)', () => {
    expect(periodBounds({ ...initialPeriod(today), kind: 'm6' }, today)).toEqual({ from: '2026-06-01', to: today })
    expect(periodBounds({ ...initialPeriod('2026-02-10'), kind: 'm6' }, '2026-02-10')).toEqual({ from: '2025-09-01', to: '2026-02-10' })
  })

  it('Este ano, Tudo (no start) and Período', () => {
    expect(periodBounds({ kind: 'year', from: '', to: '' }, today)).toEqual({ from: '2026-01-01', to: today })
    expect(periodBounds({ kind: 'all', from: '', to: '' }, today)).toEqual({ to: today })
    expect(initialPeriod(today)).toMatchObject({ from: '2026-11-01', to: today })
    expect(periodBounds({ kind: 'range', from: '2026-10-05', to: '2026-10-20' }, today)).toEqual({ from: '2026-10-05', to: '2026-10-20' })
  })

  it('Período incomplete or reversed has no bounds; only reversed is an error', () => {
    expect(periodBounds({ kind: 'range', from: '', to: today }, today)).toBeNull()
    expect(periodInvalid({ kind: 'range', from: '', to: today })).toBe(false)
    expect(periodBounds({ kind: 'range', from: '2026-11-10', to: '2026-11-01' }, today)).toBeNull()
    expect(periodInvalid({ kind: 'range', from: '2026-11-10', to: '2026-11-01' })).toBe(true)
  })

  it('labels in Brazilian format', () => {
    expect(periodLabel({ kind: 'range', from: '2026-11-01', to: '2026-11-19' }, null)).toBe('01/11/2026 a 19/11/2026')
    expect(periodLabel({ kind: 'all', from: '', to: '' }, '2025-06')).toBe('Todo o histórico · desde jun de 2025')
    expect(monthLabel('2026-11', 2026)).toBe('Nov')
    expect(monthLabel('2025-12', 2026)).toBe('Dez 25')
  })
})

describe('Recebimentos: CSV', () => {
  it('oldest first, ";" with BOM, DD/MM/AAAA, decimal comma, quotes escaped, "mensal" for recurring', () => {
    const csv = receivablesCsv([
      pay({ paidAt: '2026-11-03T12:00:00.000Z', amount: '1250.50', debtorName: 'Ana "Nina"' }),
      pay({ paidAt: '2026-10-10T12:00:00.000Z', debtDescription: null, debtRecurrence: 'MONTHLY' }),
    ])
    expect(csv.startsWith('﻿')).toBe(true)
    expect(csv.slice(1).split('\r\n')).toEqual([
      '"Data";"Devedor";"Dívida";"Parcela";"Valor (R$)"',
      '"10/10/2026";"Mariana";"Dívida";"mensal";"10,00"',
      '"03/11/2026";"Ana ""Nina""";"Notebook";"2/6";"1250,50"',
    ])
  })

  it('file name: the months of the payments, or the chosen days', () => {
    const rows = [pay({ paidAt: '2026-11-03T12:00:00.000Z' }), pay({ paidAt: '2026-06-10T12:00:00.000Z' })]
    expect(receivablesFileName({ kind: 'm6', from: '', to: '' }, rows)).toBe('recebimentos-2026-06-a-2026-11.csv')
    expect(receivablesFileName({ kind: 'range', from: '2026-10-01', to: '2026-10-31' }, rows)).toBe('recebimentos-2026-10-01-a-2026-10-31.csv')
  })
})
