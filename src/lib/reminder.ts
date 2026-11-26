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
  return [
    `Oi, ${firstName}! Tudo bem? 😊`,
    `Passando pra lembrar ${late ? (items.length > 1 ? 'das parcelas em aberto' : 'da parcela em aberto') : 'da próxima parcela'}:`,
    reminderLines(items),
    `Total: ${fmtMoney(reminderTotal(items) / 100)}.`,
    '',
    'Pode me mandar no Pix? Obrigado!',
  ].join('\n')
}

/** Block appended to the message when "Incluir Pix copia e cola" is on. */
export const pixBlock = (code: string, totalCents: number) => `\n\nPix copia e cola (${fmtMoney(totalCents / 100)}):\n${code}`

/* ── Item 68 (UI v3): the charge message your way ─────────────────────────── */

/** `chargeTone` of GET /settings; null = Amigável (the message above). */
export type ChargeTone = 'FRIENDLY' | 'DIRECT' | 'CUSTOM'

export const CHARGE_TONES: { value: ChargeTone; label: string }[] = [
  { value: 'FRIENDLY', label: 'Amigável' },
  { value: 'DIRECT', label: 'Direta' },
  { value: 'CUSTOM', label: 'Minha' },
]

export const toneLabel = (tone: ChargeTone | null | undefined) => CHARGE_TONES.find((t) => t.value === (tone ?? 'FRIENDLY'))!.label

/** The variables "Minha" can use, inserted by buttons. Unknown ones stay as typed. */
export const CHARGE_VARS: { token: string; label: string }[] = [
  { token: '{nome}', label: 'Nome' },
  { token: '{itens}', label: 'Parcelas' },
  { token: '{total}', label: 'Total' },
  { token: '{pix}', label: 'Pix' },
]

export const CHARGE_TEMPLATE_MAX = 1000

export const DIRECT_TEMPLATE = 'Olá, {nome}. Seguem os valores em aberto:\n{itens}\nTotal: {total}.\n{pix}\nPor favor, me avise quando pagar.'

/** What "Minha" starts with the first time. */
export const CUSTOM_STARTER = 'Oi, {nome}! 😊\nSó lembrando do que está em aberto:\n{itens}\nTotal: {total}.\n{pix}\nValeu!'

export const reminderLines = (items: ReminderItem[]) =>
  items.map((i) => `• ${i.label} — ${fmtMoney(i.cents / 100)} · ${i.overdue ? 'venceu' : 'vence'} ${fmtList(i.dueDate)}`).join('\n')

/**
 * Fills a template. `pix` is the "copia e cola" block (empty when off): a line
 * that only holds {pix} disappears when it is empty. A template without {pix}
 * gets the block at the end, as the Amigável message does.
 */
export function fillTemplate(template: string, firstName: string, items: ReminderItem[], pix = ''): string {
  const block = pix.trim()
  const hasPix = template.includes('{pix}')
  let t = template
    .replace(/\{nome\}/g, () => firstName)
    .replace(/\{itens\}/g, () => reminderLines(items))
    .replace(/\{total\}/g, () => fmtMoney(reminderTotal(items) / 100))
  t = block ? t.replace(/\{pix\}/g, () => block) : t.replace(/^[ \t]*\{pix\}[ \t]*\n?/gm, '').replace(/\{pix\}/g, '')
  t = t.replace(/\n{3,}/g, '\n\n').trim()
  return !hasPix && block ? t + pix : t
}

/** The message for the chosen tone (the Pix block included when `pix` is given). */
export function chargeMessage(
  settings: { chargeTone?: ChargeTone | null; chargeTemplate?: string | null } | undefined,
  firstName: string,
  items: ReminderItem[],
  pix = '',
): string {
  const tone = settings?.chargeTone ?? 'FRIENDLY'
  if (tone === 'DIRECT') return fillTemplate(DIRECT_TEMPLATE, firstName, items, pix)
  if (tone === 'CUSTOM' && settings?.chargeTemplate?.trim()) return fillTemplate(settings.chargeTemplate, firstName, items, pix)
  return reminderText(firstName, items) + pix
}
