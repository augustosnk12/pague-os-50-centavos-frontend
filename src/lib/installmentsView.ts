/**
 * Parcelas (S3): periods, labels, tabs, totals and day groups, as pure
 * functions of the API rows and the local "today". Status is derived from
 * dates and amounts (never the API `status`). Weeks start on Monday, as in
 * the API (GET /installments?period=week).
 */
import { daysUntil, remainingCents } from './installmentTag'
import { fmtList } from './format'
import type { InstallmentEnriched } from '../types/installment'

export type Period = 'day' | 'week' | 'month'
export type Tab = 'all' | 'open' | 'overdue' | 'paid'

const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
const MONTHS_SHORT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
const WD_SHORT = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']
const WD_LONG = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado']

const parts = (s: string) => {
  const [y, m, d] = s.slice(0, 10).split('-').map(Number)
  return { y, m: m - 1, d }
}
const iso = (y: number, m: number, d: number) => new Date(Date.UTC(y, m, d)).toISOString().slice(0, 10)
export const addDays = (s: string, n: number) => {
  const { y, m, d } = parts(s)
  return iso(y, m, d + n)
}
const weekday = (s: string) => {
  const { y, m, d } = parts(s)
  return new Date(Date.UTC(y, m, d)).getUTCDay()
}
export const dayOf = (inst: { dueDate: string }) => inst.dueDate.slice(0, 10)

/** First and last day of the period that contains `anchor`. */
export function periodRange(period: Period, anchor: string): [string, string] {
  if (period === 'day') return [anchor, anchor]
  if (period === 'week') {
    const start = addDays(anchor, -((weekday(anchor) + 6) % 7))
    return [start, addDays(start, 6)]
  }
  const { y, m } = parts(anchor)
  return [iso(y, m, 1), iso(y, m + 1, 0)]
}

export function shiftPeriod(period: Period, anchor: string, dir: number): string {
  if (period === 'day') return addDays(anchor, dir)
  if (period === 'week') return addDays(anchor, dir * 7)
  const { y, m, d } = parts(anchor)
  const last = new Date(Date.UTC(y, m + dir + 1, 0)).getUTCDate()
  return iso(y, m + dir, Math.min(d, last))
}

/** "Novembro 2026", "9 – 15 nov", "29 set – 5 out", "seg, 09 nov". */
export function periodLabel(period: Period, anchor: string): string {
  const [s, e] = periodRange(period, anchor)
  const a = parts(s)
  if (period === 'day') return `${WD_SHORT[weekday(s)]}, ${fmtList(s)}`
  if (period === 'week') {
    const b = parts(e)
    return a.m === b.m ? `${a.d} – ${b.d} ${MONTHS_SHORT[b.m]}` : `${a.d} ${MONTHS_SHORT[a.m]} – ${b.d} ${MONTHS_SHORT[b.m]}`
  }
  return `${MONTHS[a.m].charAt(0).toUpperCase()}${MONTHS[a.m].slice(1)} ${a.y}`
}

/** Where the period is relative to today: "Este mês", "Semana passada", "Daqui a 3 dias"… */
export function relativeLabel(period: Period, anchor: string, today: string): string {
  const [s] = periodRange(period, anchor)
  let n: number
  let words: [string, string, string, string]
  if (period === 'day') {
    n = daysUntil(s, today)
    words = ['Hoje', 'Amanhã', 'Ontem', 'dias']
  } else if (period === 'week') {
    n = Math.round(daysUntil(s, periodRange('week', today)[0]) / 7)
    words = ['Esta semana', 'Próxima semana', 'Semana passada', 'semanas']
  } else {
    const a = parts(s), t = parts(today)
    n = (a.y - t.y) * 12 + a.m - t.m
    words = ['Este mês', 'Próximo mês', 'Mês passado', 'meses']
  }
  if (n === 0) return words[0]
  if (n === 1) return words[1]
  if (n === -1) return words[2]
  return n > 0 ? `Daqui a ${n} ${words[3]}` : `Há ${-n} ${words[3]}`
}

export const isCurrentPeriod = (period: Period, anchor: string, today: string) => {
  const [s, e] = periodRange(period, anchor)
  return today >= s && today <= e
}

/** The 7 days (Mon–Sun) of the week of `anchor`. */
export function weekDays(anchor: string): string[] {
  const [s] = periodRange('week', anchor)
  return Array.from({ length: 7 }, (_, k) => addDays(s, k))
}

/** "Hoje", "Amanhã", "Ontem" or "qua, 12 nov" (day headers). */
export function dayLabel(day: string, today: string): string {
  const d = daysUntil(day, today)
  if (d === 0) return 'Hoje'
  if (d === 1) return 'Amanhã'
  if (d === -1) return 'Ontem'
  return `${WD_SHORT[weekday(day)]}, ${fmtList(day)}`
}
export const dayLabelLong = (day: string) => {
  const { d, m } = parts(day)
  return `${WD_LONG[weekday(day)]}, ${d} de ${MONTHS[m]}`
}

export const isPaid = (i: InstallmentEnriched) => remainingCents(i) === 0
export const isOverdue = (i: InstallmentEnriched, today: string) => !isPaid(i) && dayOf(i) < today

export function matchesTab(i: InstallmentEnriched, tab: Tab, today: string): boolean {
  if (tab === 'all') return true
  if (tab === 'open') return !isPaid(i)
  if (tab === 'overdue') return isOverdue(i, today)
  return isPaid(i)
}

export interface DayGroup {
  day: string
  open: InstallmentEnriched[]
  paid: InstallmentEnriched[]
  /** Still to receive in the day, in cents. */
  dueCents: number
  /** Total of the day's paid installments, in cents. */
  paidCents: number
}

export interface InstallmentsView {
  counts: Record<Tab, number>
  /** Overdue from before the period (shown folded in Todas/Em aberto, inside the list in Atrasadas). */
  previous: InstallmentEnriched[]
  previousCents: number
  /** Totals of the period (cents): expected, received, overdue, still due on time. */
  totals: { expected: number; received: number; overdue: number; pending: number; due: number }
  groups: DayGroup[]
  /** Rows the list has (before "Mostrar mais"). */
  rows: number
}

const cents = (v: string | null | undefined) => Math.round(Number(v ?? '0') * 100)

/**
 * Everything the Parcelas screen shows, from GET /installments rows
 * (period + overdue from before it, includeOverdueBefore=true).
 */
export function buildView(
  items: InstallmentEnriched[],
  { period, anchor, today, tab, debtorIds }: { period: Period; anchor: string; today: string; tab: Tab; debtorIds: string[] },
): InstallmentsView {
  const [start, end] = periodRange(period, anchor)
  const debtorOf = (i: InstallmentEnriched) => i.debt?.debtor?.id ?? i.debt?.debtorId
  const base = debtorIds.length ? items.filter((i) => debtorIds.includes(debtorOf(i) ?? '')) : items
  const byDue = (a: InstallmentEnriched, b: InstallmentEnriched) => (dayOf(a) < dayOf(b) ? -1 : dayOf(a) > dayOf(b) ? 1 : a.number - b.number)
  const inPeriod = base.filter((i) => dayOf(i) >= start && dayOf(i) <= end).sort(byDue)
  const previous = base.filter((i) => dayOf(i) < start && isOverdue(i, today)).sort(byDue)

  const counts: Record<Tab, number> = {
    all: inPeriod.length,
    open: inPeriod.filter((i) => !isPaid(i)).length,
    overdue: inPeriod.filter((i) => isOverdue(i, today)).length + previous.length,
    paid: inPeriod.filter(isPaid).length,
  }

  const expected = inPeriod.reduce((s, i) => s + cents(i.amount), 0)
  const received = inPeriod.reduce((s, i) => s + cents(i.paidAmount), 0)
  const overdue = inPeriod.filter((i) => isOverdue(i, today)).reduce((s, i) => s + remainingCents(i), 0)
  const due = inPeriod.reduce((s, i) => s + remainingCents(i), 0)

  const listed = [...(tab === 'overdue' ? previous : []), ...inPeriod.filter((i) => matchesTab(i, tab, today))]
  const groups: DayGroup[] = []
  for (const i of listed) {
    const day = dayOf(i)
    let g = groups[groups.length - 1]
    if (!g || g.day !== day) {
      g = { day, open: [], paid: [], dueCents: 0, paidCents: 0 }
      groups.push(g)
    }
    if (isPaid(i)) {
      g.paid.push(i)
      g.paidCents += cents(i.amount)
    } else {
      g.open.push(i)
      g.dueCents += remainingCents(i)
    }
  }

  return {
    counts,
    previous,
    previousCents: previous.reduce((s, i) => s + remainingCents(i), 0),
    totals: { expected, received, overdue, pending: Math.max(0, due - overdue), due },
    groups,
    rows: listed.length,
  }
}

/* URL state (improvement 25): /installments?periodo=mes&data=2026-11-09&aba=atrasadas&devedores=a,b */
const PERIOD_URL: Record<Period, string> = { day: 'dia', week: 'semana', month: 'mes' }
const TAB_URL: Record<Tab, string> = { all: 'todas', open: 'abertas', overdue: 'atrasadas', paid: 'pagas' }
const fromUrl = <T extends string>(map: Record<T, string>, v: string | null): T | undefined =>
  (Object.keys(map) as T[]).find((k) => map[k] === v || k === v)

export interface InstallmentsUrlState {
  period: Period
  anchor: string
  tab: Tab
  debtorIds: string[]
  /** Totals line expanded (the Painel's month bar links here with it open). */
  summary: boolean
}

export function readUrlState(params: URLSearchParams, today: string): InstallmentsUrlState {
  // Old names still work (links from earlier versions: ?period=week, ?status=overdue).
  const period = fromUrl(PERIOD_URL, params.get('periodo') ?? params.get('period')) ?? 'month'
  const tab = fromUrl(TAB_URL, params.get('aba')) ?? (params.get('status') === 'overdue' ? 'overdue' : 'all')
  const data = params.get('data')
  const anchor = data && /^\d{4}-\d{2}-\d{2}$/.test(data) ? data : today
  const debtorIds = (params.get('devedores') ?? '').split(',').filter(Boolean)
  return { period, anchor, tab, debtorIds, summary: params.get('resumo') === '1' }
}

export function writeUrlState(s: Omit<InstallmentsUrlState, 'summary'>, today: string): URLSearchParams {
  const p = new URLSearchParams()
  if (s.period !== 'month') p.set('periodo', PERIOD_URL[s.period])
  if (!isCurrentPeriod(s.period, s.anchor, today) || (s.period === 'day' && s.anchor !== today)) p.set('data', s.anchor)
  if (s.tab !== 'all') p.set('aba', TAB_URL[s.tab])
  if (s.debtorIds.length) p.set('devedores', s.debtorIds.join(','))
  return p
}
