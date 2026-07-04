import type { DebtorReliability } from '../types/debtor'

export interface ReliabilityOption {
  id: DebtorReliability
  label: string
  color: string
  icon: string
}

// Payment-profile classification. Colors/icons are derived here (not stored);
// mirrors the prototype's RELIABILITY_OPTIONS.
export const RELIABILITY_OPTIONS: ReliabilityOption[] = [
  { id: 'GOOD_PAYER', label: 'Bom pagador', color: 'var(--paid)', icon: 'check' },
  { id: 'LATE_BUT_PAYS', label: 'Atrasa, mas paga', color: 'var(--pending)', icon: 'clock' },
  { id: 'VEACO', label: 'Veaco', color: 'var(--overdue)', icon: 'alert' },
]

export const getReliabilityOption = (id: DebtorReliability | null | undefined) =>
  id ? RELIABILITY_OPTIONS.find((o) => o.id === id) : undefined
