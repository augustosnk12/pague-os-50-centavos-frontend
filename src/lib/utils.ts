import type { InstallmentStatus } from '../types/installment'
import type { Address } from '../types/debtor'
import { formatCep } from './cep'

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

export function formatAddress(a: Address | null | undefined): string {
  if (!a) return ''
  const line1 = [a.street, a.number].filter(Boolean).join(', ')
  const cityState = a.city && a.state ? `${a.city}/${a.state}` : a.city || a.state || ''
  const line2 = [a.neighborhood, cityState].filter(Boolean).join(' · ')
  const zip = a.zip ? formatCep(a.zip) : ''
  return [line1, a.complement, line2, zip].filter(Boolean).join(' — ')
}

export function money(v: number | string): string {
  return BRL.format(Number(v))
}

export function moneyParts(v: number | string): { symbol: string; int: string; dec: string } {
  const s = money(v)
  const m = s.match(/^(\D+)\s?([\d.]+),(\d{2})$/)
  if (!m) return { symbol: 'R$', int: s, dec: '' }
  return { symbol: m[1].trim(), int: m[2], dec: m[3] }
}

export const MES = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez']
export const MESLONG = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

export function fmtDate(date: string | Date): string {
  const x = new Date(date)
  return `${String(x.getUTCDate()).padStart(2, '0')} ${MES[x.getUTCMonth()]} ${x.getUTCFullYear()}`
}

export function fmtDateShort(date: string | Date): string {
  const x = new Date(date)
  return `${String(x.getUTCDate()).padStart(2, '0')}/${String(x.getUTCMonth() + 1).padStart(2, '0')}`
}

export function monthKey(date: string | Date): string {
  const x = new Date(date)
  return `${x.getUTCFullYear()}-${String(x.getUTCMonth() + 1).padStart(2, '0')}`
}

export function monthLabel(key: string): string {
  const [y, m] = key.split('-')
  return `${MESLONG[Number(m) - 1]} de ${y}`
}

export function monthLabelShort(key: string): string {
  const [y, m] = key.split('-')
  return `${MESLONG[Number(m) - 1].slice(0, 3)} ${y}`
}

export function addMonthsKey(key: string, delta: number): string {
  let [y, m] = key.split('-').map(Number)
  m = m - 1 + delta
  y += Math.floor(m / 12)
  m = ((m % 12) + 12) % 12
  return `${y}-${String(m + 1).padStart(2, '0')}`
}

export function daysBetween(a: string | Date, b: string | Date): number {
  return Math.round((new Date(a).getTime() - new Date(b).getTime()) / 86400000)
}

function sameDay(a: string | Date, b: string | Date): boolean {
  const x = new Date(a), y = new Date(b)
  return x.getUTCFullYear() === y.getUTCFullYear() && x.getUTCMonth() === y.getUTCMonth() && x.getUTCDate() === y.getUTCDate()
}

export function deriveInstStatus(inst: { dueDate: string; paidAt: string | null; paidAmount?: string; amount?: string }): InstallmentStatus {
  if (inst.paidAt) return 'PAID'
  if (inst.paidAmount && inst.amount) {
    const paid = Number(inst.paidAmount)
    if (paid > 0 && paid < Number(inst.amount)) return 'PARTIALLY_PAID'
  }
  const now = new Date()
  if (new Date(inst.dueDate) < now && !sameDay(inst.dueDate, now)) return 'OVERDUE'
  return 'PENDING'
}

export const DEBT_TYPE_META: Record<string, { label: string; icon: string; short: string }> = {
  CASH: { label: 'Dinheiro', icon: 'banknote', short: 'Dinheiro' },
  CREDIT_CARD: { label: 'Cartão de crédito', icon: 'card', short: 'Cartão' },
  PIX: { label: 'Pix', icon: 'zap', short: 'Pix' },
  PIX_INSTALLMENT: { label: 'Pix parcelado', icon: 'layers', short: 'Pix parc.' },
}

export const STATUS_META: Record<InstallmentStatus, { label: string; color: string; weak: string; icon: string }> = {
  PAID: { label: 'Pago', color: 'var(--paid)', weak: 'var(--paid-weak)', icon: 'check' },
  PARTIALLY_PAID: { label: 'Parcial', color: 'var(--partial)', weak: 'var(--partial-weak)', icon: 'clock' },
  PENDING: { label: 'Pendente', color: 'var(--pending)', weak: 'var(--pending-weak)', icon: 'clock' },
  OVERDUE: { label: 'Atrasado', color: 'var(--overdue)', weak: 'var(--overdue-weak)', icon: 'alert' },
}

/**
 * Installments as the API creates them (create-debt.use-case): each one is the
 * total / n rounded half-up to the cent, installment #1 takes the difference
 * (it can be a cent less), and days 29–31 fall on the last day of shorter months.
 */
export function genInstallments(
  total: number,
  count: number,
  firstDueISO: string,
): { number: number; amount: string; dueDate: string }[] {
  const t = Math.round(total * 100)
  const n = Math.max(1, Math.floor(count))
  const base = Math.round(t / n)
  const remainder = t - base * n
  const first = new Date(firstDueISO)
  if (isNaN(first.getTime())) return []
  const out = []
  for (let i = 0; i < n; i++) {
    const cents = base + (i === 0 ? remainder : 0)
    const y = first.getUTCFullYear()
    const m = first.getUTCMonth() + i
    const last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate()
    const due = new Date(Date.UTC(y, m, Math.min(first.getUTCDate(), last)))
    out.push({ number: i + 1, amount: (cents / 100).toFixed(2), dueDate: due.toISOString() })
  }
  return out
}

export function avatarHue(name: string): string {
  let h = 0
  for (const c of name) h = (h + c.charCodeAt(0)) % 360
  return `calc(var(--accent-h) + ${(h % 60) - 30})`
}

const API_ERROR_MAP: Record<string, string> = {
  'Invalid email': 'E-mail inválido.',
  'Account not found': 'Conta não encontrada.',
  'Account not confirmed': 'Conta ainda não confirmada. Verifique seu e-mail.',
  'Email already registered': 'Este e-mail já está cadastrado.',
  'Invalid or expired token': 'Token inválido ou expirado.',
  'Invalid token type': 'Token inválido.',
  'Token expired': 'Token expirado.',
  'Debtor not found': 'Devedor não encontrado.',
  'There are already more charges than that': 'Já existem mais cobranças do que isso.',
  'There is already a charge after that date': 'Já existe cobrança depois dessa data.',
  'Debtor is archived': 'Este devedor está arquivado. Reative-o para criar dívidas.',
  'Recurring debts must be CASH or PIX': 'Só Dinheiro e Pix podem repetir todo mês.',
  'The end date must be on or after the first due date': 'A última cobrança deve ser depois do primeiro vencimento.',
  'Number of months must be at least 1': 'Informe pelo menos 1 mês.',
  'Choose either an end date or a number of months': 'Escolha uma data final ou um número de meses.',
  'Debtor with this name already exists': 'Já existe um devedor com este nome.',
  'Debtor with this email already exists': 'Já existe um devedor com este e-mail.',
  'Name already in use by another debtor': 'Este nome já está em uso por outro devedor.',
  'Email already in use by another debtor': 'Este e-mail já está em uso por outro devedor.',
  'Debt not found': 'Cobrança não encontrada.',
  'Number of installments must be at least 1': 'O número de parcelas deve ser pelo menos 1.',
  'Installment not found': 'Parcela não encontrada.',
  'Installment is already paid': 'Esta parcela já foi paga.',
  'Payment not found': 'Pagamento não encontrado.',
  'Debt has payments and cannot be deleted': 'Esta dívida tem pagamentos registrados e não pode ser excluída.',
}

export function translateApiError(msg: string | undefined | null, fallback = 'Ocorreu um erro. Tente novamente.'): string {
  if (!msg) return fallback
  return API_ERROR_MAP[msg] ?? API_ERROR_MAP[decodeURIComponent(msg)] ?? msg
}
