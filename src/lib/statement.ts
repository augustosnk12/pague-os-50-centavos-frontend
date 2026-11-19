/**
 * Extrato do devedor (S14, improvement 60): everything a person still owes,
 * per debt, ready to send as a WhatsApp message or a PNG. Only front: built
 * from GET /debtors/:id/debts, nothing is stored or made public.
 */
import { daysUntil } from './installmentTag'
import { fmtList, fmtMoney } from './format'
import { leftOf } from './debtorProfile'
import type { DebtWithInstallments } from '../hooks/debts/useDebtsByDebtor'

export type StatementUntil = 'all' | 'month'

export interface StatementOptions {
  /** "Todas em aberto" or "Até o fim do mês". */
  until: StatementUntil
  /** "Mostrar o total pago". */
  history: boolean
}

export interface StatementRow {
  label: string
  dueDate: string
  cents: number
  late: boolean
}

export interface StatementDebt {
  id: string
  title: string
  leftCents: number
  late: boolean
  rows: StatementRow[]
}

export interface Statement {
  debts: StatementDebt[]
  totalCents: number
  lateCents: number
  receivedCents: number
  paymentCount: number
  until: StatementUntil
  history: boolean
}

const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']

/** Last day of today's month (YYYY-MM-DD). */
export function monthEnd(today: string): string {
  const [y, m] = today.split('-').map(Number)
  return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10)
}

export function buildStatement(debts: DebtWithInstallments[], today: string, opts: StatementOptions): Statement {
  const end = monthEnd(today)
  const out: StatementDebt[] = []
  for (const d of debts) {
    const count = d.installments.length
    const rows = d.installments
      .filter((i) => leftOf(i) > 0 && (opts.until === 'all' || i.dueDate.slice(0, 10) <= end))
      .sort((a, b) => (a.dueDate < b.dueDate ? -1 : a.dueDate > b.dueDate ? 1 : a.number - b.number))
      .map((i) => ({
        label: d.recurrence === 'MONTHLY' ? `Mensalidade de ${MONTHS[Number(i.dueDate.slice(5, 7)) - 1]}` : `Parcela ${i.number}/${count}`,
        dueDate: i.dueDate,
        cents: leftOf(i),
        late: daysUntil(i.dueDate, today) < 0,
      }))
    if (!rows.length) continue
    out.push({ id: d.id, title: d.description || 'Dívida', leftCents: rows.reduce((s, r) => s + r.cents, 0), late: rows.some((r) => r.late), rows })
  }
  // Debts with something overdue first (stable otherwise).
  out.sort((a, b) => Number(b.late) - Number(a.late))
  const payments = debts.flatMap((d) => d.installments.flatMap((i) => i.payments ?? []))
  return {
    debts: out,
    totalCents: out.reduce((s, d) => s + d.leftCents, 0),
    lateCents: out.reduce((s, d) => s + d.rows.filter((r) => r.late).reduce((t, r) => t + r.cents, 0), 0),
    receivedCents: payments.reduce((s, p) => s + Math.round(Number(p.amount) * 100), 0),
    paymentCount: payments.length,
    until: opts.until,
    history: opts.history,
  }
}

/** What the Pix "copia e cola" charges: the overdue part, or else the total. */
export function statementPix(s: Statement): { cents: number; what: string } | null {
  if (s.lateCents > 0) return { cents: s.lateCents, what: 'o que está em atraso' }
  return s.totalCents > 0 ? { cents: s.totalCents, what: 'o total' } : null
}

const money = (c: number) => fmtMoney(c / 100)
const pays = (n: number) => `${n} pagamento${n === 1 ? '' : 's'}`
export const untilSuffix = (s: Statement) => (s.until === 'month' ? ' até o fim do mês' : '')
export const historyLine = (s: Statement) => `Já pago: ${money(s.receivedCents)} em ${pays(s.paymentCount)}`
export const rowText = (r: StatementRow) => `${r.label} · ${r.late ? 'venceu' : 'vence'} ${fmtList(r.dueDate)}`

/** The WhatsApp message (installments listed, *bold* debt names). */
export function statementText(name: string, issuedOn: string, s: Statement, pixCode: string | null): string {
  const L = [`📄 Extrato de ${name} · ${issuedOn}`, '']
  if (!s.debts.length) L.push(`Nada em aberto${untilSuffix(s)}. ✅`)
  else {
    L.push(`Total em aberto${untilSuffix(s)}: ${money(s.totalCents)}`)
    if (s.lateCents > 0) L.push(`Em atraso: ${money(s.lateCents)} ⚠️`)
    for (const d of s.debts) {
      L.push('', `*${d.title}* · ${money(d.leftCents)}`)
      for (const r of d.rows) L.push(`• ${rowText(r)} · ${money(r.cents)}${r.late ? ' ⚠️' : ''}`)
    }
  }
  if (s.history && s.paymentCount) L.push('', historyLine(s))
  const pix = statementPix(s)
  if (pix && pixCode) L.push('', `Pix copia e cola (${money(pix.cents)}, ${pix.what}):`, pixCode)
  return L.join('\n')
}
