/**
 * "Pagar com Pix" (item 75): what you can pay a creditor in one go — what is
 * late, the next installment, or everything still open. The app only prepares
 * the Pix (key, QR Code, copia e cola); the payment happens in the bank.
 */
import type { BatchCandidate } from './batch'

export type PixPick = 'late' | 'next' | 'all'

export interface PixOption {
  id: PixPick
  label: string
  /** Cents. */
  cents: number
  /** The installments this amount pays (oldest first). */
  ids: string[]
}

const total = (cs: BatchCandidate[]) => cs.reduce((s, c) => s + c.left, 0)

/**
 * Options in this order: Atrasado (when something is late), Próxima (the
 * first one not late), Tudo. An option that comes to the same amount as
 * "Tudo" is dropped, so a single open installment shows only "Tudo".
 */
export function pixOptions(candidates: BatchCandidate[]): PixOption[] {
  if (!candidates.length) return []
  const late = candidates.filter((c) => c.late)
  const next = candidates.find((c) => !c.late)
  const all = total(candidates)
  const opts: PixOption[] = []
  if (late.length) opts.push({ id: 'late', label: 'Atrasado', cents: total(late), ids: late.map((c) => c.inst.id) })
  if (next) opts.push({ id: 'next', label: 'Próxima', cents: next.left, ids: [next.inst.id] })
  return [...opts.filter((o) => o.cents !== all), { id: 'all', label: 'Tudo', cents: all, ids: candidates.map((c) => c.inst.id) }]
}
