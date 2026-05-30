import { fmtDate, fmtDateShort, monthKey, monthLabel } from './utils'

export type Period = 'day' | 'week' | 'month'

export function periodLabel(period: Period, dateKey: string): string {
  const base = new Date(dateKey + 'T12:00:00Z')
  if (period === 'day') return fmtDate(base.toISOString())
  if (period === 'month') return monthLabel(monthKey(base.toISOString()))
  const day = (base.getUTCDay() + 6) % 7
  const mon = new Date(base)
  mon.setUTCDate(base.getUTCDate() - day)
  const sun = new Date(mon)
  sun.setUTCDate(mon.getUTCDate() + 6)
  return `${fmtDateShort(mon.toISOString())} – ${fmtDateShort(sun.toISOString())}`
}

export function shiftDate(period: Period, dateKey: string, dir: number): string {
  const base = new Date(dateKey + 'T12:00:00Z')
  if (period === 'day') base.setUTCDate(base.getUTCDate() + dir)
  else if (period === 'week') base.setUTCDate(base.getUTCDate() + dir * 7)
  else base.setUTCMonth(base.getUTCMonth() + dir)
  return base.toISOString().slice(0, 10)
}
