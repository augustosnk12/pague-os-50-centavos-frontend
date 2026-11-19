import type { ReportPayment } from '../api/payments.api'
import { fmtBR } from './format'

/**
 * Recebimentos (S12, improvement 38): the period choices, their bounds and the
 * CSV of the period. Pure functions so the screen and the export sheet agree.
 */
export type PeriodKind = 'm6' | 'year' | 'all' | 'range'

export const PERIODS: { id: PeriodKind; label: string }[] = [
  { id: 'm6', label: '6 meses' },
  { id: 'year', label: 'Este ano' },
  { id: 'all', label: 'Tudo' },
  { id: 'range', label: 'Período' },
]

export interface PeriodChoice {
  kind: PeriodKind
  /** Only for "Período": YYYY-MM-DD, or '' while not filled. */
  from: string
  to: string
}

const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

/** "Período" starts as this month so far. */
export function initialPeriod(today: string): PeriodChoice {
  return { kind: 'm6', from: `${today.slice(0, 7)}-01`, to: today }
}

/** What to ask the API: no `from` = since the first payment. */
export type Bounds = { from?: string; to: string }

/**
 * Bounds of the choice, or null when "Período" is incomplete or the start is
 * after the end (`invalid` tells the two apart).
 */
export function periodBounds(p: PeriodChoice, today: string): Bounds | null {
  const [y, m] = today.split('-').map(Number)
  if (p.kind === 'm6') {
    const d = new Date(Date.UTC(y, m - 1 - 5, 1))
    return { from: d.toISOString().slice(0, 10), to: today }
  }
  if (p.kind === 'year') return { from: `${y}-01-01`, to: today }
  if (p.kind === 'all') return { to: today }
  return p.from && p.to && p.from <= p.to ? { from: p.from, to: p.to } : null
}

export const periodInvalid = (p: PeriodChoice) => p.kind === 'range' && !!p.from && !!p.to && p.from > p.to

/** Subtitle of the screen: "Últimos 6 meses", "01/11/2026 a 19/11/2026"… */
export function periodLabel(p: PeriodChoice, firstMonth: string | null): string {
  if (p.kind === 'm6') return 'Últimos 6 meses'
  if (p.kind === 'year') return 'Este ano · desde 1º de janeiro'
  if (p.kind === 'range') return p.from && p.to && p.from <= p.to ? `${fmtBR(p.from)} a ${fmtBR(p.to)}` : 'Escolha as datas'
  if (!firstMonth) return 'Todo o histórico'
  const [fy, fm] = firstMonth.split('-').map(Number)
  return `Todo o histórico · desde ${MONTHS[fm - 1]} de ${fy}`
}

/** Bar label: "Nov", or "Dez 25" outside the current year. */
export function monthLabel(month: string, currentYear: number): string {
  const [y, m] = month.split('-').map(Number)
  const name = MONTHS[m - 1]
  const cap = name[0].toUpperCase() + name.slice(1)
  return y === currentYear ? cap : `${cap} ${String(y).slice(2)}`
}

/** "3/12", or "mensal" for a monthly charge. */
export function paymentPosition(p: Pick<ReportPayment, 'installmentNumber' | 'installmentsCount' | 'debtRecurrence'>): string {
  return p.debtRecurrence === 'MONTHLY' ? 'mensal' : `${p.installmentNumber}/${p.installmentsCount}`
}

const cell = (v: string) => `"${v.replace(/"/g, '""')}"`

/**
 * The spreadsheet: oldest first, ";" separated with a BOM (opens right in a
 * Brazilian Excel), dates DD/MM/AAAA and amounts with a decimal comma.
 */
export function receivablesCsv(rows: ReportPayment[]): string {
  const sorted = [...rows].sort((a, b) => (a.paidAt < b.paidAt ? -1 : a.paidAt > b.paidAt ? 1 : 0))
  const lines = [
    ['Data', 'Devedor', 'Dívida', 'Parcela', 'Valor (R$)'],
    ...sorted.map((r) => [
      fmtBR(r.paidAt.slice(0, 10)),
      r.debtorName,
      r.debtDescription || 'Dívida',
      paymentPosition(r),
      Number(r.amount).toFixed(2).replace('.', ','),
    ]),
  ]
  return '﻿' + lines.map((l) => l.map(cell).join(';')).join('\r\n')
}

/** "recebimentos-2026-06-a-2026-11.csv" (months of the payments) or the chosen days for "Período". */
export function receivablesFileName(p: PeriodChoice, rows: ReportPayment[]): string {
  if (p.kind === 'range' && p.from && p.to) return `recebimentos-${p.from}-a-${p.to}.csv`
  if (!rows.length) return 'recebimentos.csv'
  const days = rows.map((r) => r.paidAt.slice(0, 7)).sort()
  return `recebimentos-${days[0]}-a-${days[days.length - 1]}.csv`
}
