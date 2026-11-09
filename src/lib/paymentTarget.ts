import type { Installment, InstallmentEnriched } from '../types/installment'

/** Everything the sheet shows about the installment it is open for. */
export interface PaymentTarget {
  installment: Installment
  debtor: { id: string; name: string; avatarHue?: number | null; avatarEmoji?: string | null }
  debtDescription: string | null
  installmentCount?: number | null
  recurrence?: 'MONTHLY' | null
}

/** Target for rows that come from GET /installments or /dashboard/overview. */
export function paymentTarget(inst: InstallmentEnriched): PaymentTarget {
  const d = inst.debt
  return {
    installment: inst,
    debtor: d?.debtor ?? { id: d?.debtorId ?? '', name: 'Devedor' },
    debtDescription: d?.description ?? null,
    installmentCount: d?.installmentCount,
    recurrence: d?.recurrence,
  }
}
