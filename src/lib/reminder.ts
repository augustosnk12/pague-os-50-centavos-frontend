/**
 * WhatsApp reminder message (improvement 10): the open installments (the
 * overdue ones, or the next one when nothing is overdue) and the total,
 * optionally followed by a Pix "copia e cola" with the exact amount (33).
 */
import { daysUntil, installmentPosition } from './installmentTag'
import { fmtList, fmtMoney } from './format'

export interface ReminderDebt {
  description: string | null
  recurrence?: 'MONTHLY' | null
  installments: { id: string; number: number; amount: string; paidAmount: string; dueDate: string }[]
}

export interface ReminderItem {
  id: string
  label: string
  dueDate: string
  cents: number
  overdue: boolean
}

const cents = (v: string) => Math.round(Number(v) * 100)

/** What the message lists: every overdue installment, or else the next one due. */
export function reminderItems(debts: ReminderDebt[], today: string): ReminderItem[] {
  const open: ReminderItem[] = []
  for (const d of debts) {
    for (const i of d.installments) {
      const left = cents(i.amount) - cents(i.paidAmount)
      if (left <= 0) continue
      open.push({
        id: i.id,
        label: `${d.description || 'Dívida'} (${installmentPosition(i.number, d.installments.length, d.recurrence)})`,
        dueDate: i.dueDate,
        cents: left,
        overdue: daysUntil(i.dueDate, today) < 0,
      })
    }
  }
  open.sort((a, b) => (a.dueDate < b.dueDate ? -1 : a.dueDate > b.dueDate ? 1 : 0))
  const overdue = open.filter((i) => i.overdue)
  return overdue.length ? overdue : open.slice(0, 1)
}

export const reminderTotal = (items: ReminderItem[]) => items.reduce((s, i) => s + i.cents, 0)

export function reminderText(firstName: string, items: ReminderItem[]): string {
  const late = items.some((i) => i.overdue)
  const lines = items.map((i) => `• ${i.label} — ${fmtMoney(i.cents / 100)} · ${i.overdue ? 'venceu' : 'vence'} ${fmtList(i.dueDate)}`)
  return [
    `Oi, ${firstName}! Tudo bem? 😊`,
    `Passando pra lembrar ${late ? (items.length > 1 ? 'das parcelas em aberto' : 'da parcela em aberto') : 'da próxima parcela'}:`,
    ...lines,
    `Total: ${fmtMoney(reminderTotal(items) / 100)}.`,
    '',
    'Pode me mandar no Pix? Obrigado!',
  ].join('\n')
}

/** Block appended to the message when "Incluir Pix copia e cola" is on. */
export const pixBlock = (code: string, totalCents: number) => `\n\nPix copia e cola (${fmtMoney(totalCents / 100)}):\n${code}`
