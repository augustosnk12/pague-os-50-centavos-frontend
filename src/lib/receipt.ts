/**
 * Receipts (S6, improvements 37 and 54), built in the app from data already
 * loaded (GET /debtors/:id/debts), no backend:
 * - one payment ("Comprovante de pagamento")
 * - a batch: payments that share a batchId ("Receber várias", S7)
 * - a payoff: every installment of a (non-recurring) debt paid
 *   ("Comprovante de quitação"), payments grouped by date.
 */
import { installmentPosition } from './installmentTag'
import { fmtList, fmtMoney } from './format'
import type { Payment } from '../types/payment'

export interface ReceiptDebt {
  id: string
  description: string | null
  recurrence?: 'MONTHLY' | null
  installments: { id: string; number: number; amount: string; paidAmount: string; payments?: Payment[] }[]
}

export type ReceiptRequest = { debtorId: string; paymentId: string } | { debtorId: string; payoffDebtId: string }

export interface ReceiptItem {
  ref: string
  amount: string
  /** "quitada" / "parcial" for batch items. */
  status?: string
}

export interface Receipt {
  kind: 'payment' | 'batch' | 'payoff'
  title: string
  code: string
  totalCents: number
  /** "terça, 3 de novembro de 2026" (or "Quitada em …"). */
  date: string
  from: string
  to: string
  /** Debt and installment ("Notebook · parcela 7/12"), or the debt for a payoff. */
  ref?: string
  /** "Quitada" or "Parcial · restam R$ X" (single payment). */
  installment?: string
  items?: ReceiptItem[]
  /** What is still owed on the debt(s): "Quitada" or "R$ X". */
  balance: string
}

const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
const WEEKDAYS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado']
const cents = (v: string) => Math.round(Number(v) * 100)
const money = (c: number) => fmtMoney(c / 100)

export function longDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  return `${WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]}, ${d} de ${MONTHS[m - 1]} de ${y}`
}

/** Short, stable code: P50-<5 chars of the payment id>-<YYMMDD>. */
export function receiptCode(paymentId: string, paidAt: string): string {
  const tail = paymentId.replace(/[^a-z0-9]/gi, '').slice(-5).toUpperCase().padStart(5, '0')
  return `P50-${tail}-${paidAt.slice(2, 10).replace(/-/g, '')}`
}

const left = (i: ReceiptDebt['installments'][number]) => Math.max(0, cents(i.amount) - cents(i.paidAmount))
const debtLeft = (d: ReceiptDebt) => d.installments.reduce((s, i) => s + left(i), 0)
const position = (d: ReceiptDebt, number: number) => installmentPosition(number, d.installments.length, d.recurrence)
const describe = (d: ReceiptDebt) => d.description || 'Dívida'

export function buildReceipt(
  debts: ReceiptDebt[],
  req: ReceiptRequest,
  { from, to }: { from: string; to: string },
): Receipt | null {
  if ('payoffDebtId' in req) {
    const d = debts.find((x) => x.id === req.payoffDebtId)
    if (!d || d.recurrence === 'MONTHLY' || debtLeft(d) > 0) return null
    const pays = d.installments.flatMap((i) => (i.payments ?? []).map((p) => ({ p, number: i.number })))
    if (!pays.length) return null
    const byDay = new Map<string, { cents: number; numbers: Set<number> }>()
    for (const { p, number } of pays) {
      const day = p.paidAt.slice(0, 10)
      const g = byDay.get(day) ?? { cents: 0, numbers: new Set<number>() }
      g.cents += cents(p.amount)
      g.numbers.add(number)
      byDay.set(day, g)
    }
    const days = [...byDay.entries()].sort(([a], [b]) => (a < b ? -1 : 1))
    let items: ReceiptItem[] = days.map(([day, g]) => ({
      ref: `${fmtList(day)} · ${g.numbers.size > 1 ? `${g.numbers.size} parcelas` : `parcela ${position(d, [...g.numbers][0])}`}`,
      amount: money(g.cents),
    }))
    // More than 6 dates: the oldest ones in one line, the last 5 listed.
    if (items.length > 6) {
      const old = days.slice(0, days.length - 5)
      items = [{ ref: `${old.length} pagamentos anteriores`, amount: money(old.reduce((s, [, g]) => s + g.cents, 0)) }, ...items.slice(-5)]
    }
    const last = days[days.length - 1][0]
    const lastPay = pays.filter(({ p }) => p.paidAt.slice(0, 10) === last).map(({ p }) => p)[0]
    const n = d.installments.length
    return {
      kind: 'payoff',
      title: 'Comprovante de quitação',
      code: receiptCode(lastPay.id, last),
      totalCents: pays.reduce((s, { p }) => s + cents(p.amount), 0),
      date: `Quitada em ${longDate(last)}`,
      from,
      to,
      ref: `${describe(d)} · ${n} ${n === 1 ? 'parcela' : 'parcelas'}`,
      items,
      balance: 'Quitada',
    }
  }

  // The payment, its installment and its debt.
  let found: { d: ReceiptDebt; i: ReceiptDebt['installments'][number]; p: Payment } | null = null
  for (const d of debts) for (const i of d.installments) for (const p of i.payments ?? []) if (p.id === req.paymentId) found = { d, i, p }
  if (!found) return null
  const { d, i, p } = found

  const batch = p.batchId
    ? debts.flatMap((dd) => dd.installments.flatMap((ii) => (ii.payments ?? []).filter((q) => q.batchId === p.batchId).map((q) => ({ d: dd, i: ii, p: q }))))
    : []
  if (batch.length > 1) {
    const involved = [...new Set(batch.map((b) => b.d))]
    const owed = involved.reduce((s, dd) => s + debtLeft(dd), 0)
    return {
      kind: 'batch',
      title: 'Comprovante de pagamento',
      code: receiptCode(p.id, p.paidAt),
      totalCents: batch.reduce((s, b) => s + cents(b.p.amount), 0),
      date: longDate(p.paidAt),
      from,
      to,
      ref: `${batch.length} parcelas`,
      items: batch.map((b) => ({
        ref: `${describe(b.d)} · ${b.d.recurrence === 'MONTHLY' ? 'mensalidade' : `parcela ${position(b.d, b.i.number)}`}`,
        amount: fmtMoney(b.p.amount),
        status: left(b.i) === 0 ? 'quitada' : 'parcial',
      })),
      balance: owed === 0 ? 'Quitada' : money(owed),
    }
  }

  const owed = debtLeft(d)
  return {
    kind: 'payment',
    title: 'Comprovante de pagamento',
    code: receiptCode(p.id, p.paidAt),
    totalCents: cents(p.amount),
    date: longDate(p.paidAt),
    from,
    to,
    ref: `${describe(d)} · ${d.recurrence === 'MONTHLY' ? 'mensalidade' : `parcela ${position(d, i.number)}`}`,
    installment: left(i) === 0 ? 'Quitada' : `Parcial · restam ${money(left(i))}`,
    balance: owed === 0 ? 'Quitada' : money(owed),
  }
}

/** Text for "Enviar no WhatsApp" (same data as the card). */
export function receiptText(r: Receipt): string {
  const total = money(r.totalCents)
  if (r.kind === 'payoff') {
    return [
      '✅ Comprovante de quitação',
      r.code,
      '',
      `${r.ref} de ${r.from}: quitada.`,
      `Total pago: ${total} · ${r.date.charAt(0).toLowerCase()}${r.date.slice(1)}.`,
      '',
      'Pagamentos:',
      ...(r.items ?? []).map((it) => `• ${it.ref} — ${it.amount}`),
      '',
      'Nada mais em aberto nesta dívida. Obrigado! 🙌',
    ].join('\n')
  }
  if (r.kind === 'batch') {
    return [
      '✅ Comprovante de pagamento',
      r.code,
      '',
      `Recebi ${total} de ${r.from} em ${r.date}, referente a:`,
      ...(r.items ?? []).map((it) => `• ${it.ref} — ${it.amount} (${it.status})`),
      `Saldo em aberto: ${r.balance}`,
      '',
      'Obrigado! 🙌',
    ].join('\n')
  }
  return [
    '✅ Comprovante de pagamento',
    r.code,
    '',
    `Recebi ${total} de ${r.from} em ${r.date}.`,
    `Referente a: ${r.ref}`,
    `Parcela: ${r.installment}`,
    `Saldo da dívida: ${r.balance}`,
    '',
    'Obrigado! 🙌',
  ].join('\n')
}
