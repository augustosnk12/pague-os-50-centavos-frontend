import { Icon } from './Icon'
import { STATUS_META, DEBT_TYPE_META } from '../../lib/utils'
import type { InstallmentStatus } from '../../types/installment'
import type { DebtType } from '../../types/debt'

interface StatusBadgeProps {
  status: InstallmentStatus
  size?: 'sm' | 'md'
  className?: string
}

export function StatusBadge({ status, size = 'md', className }: StatusBadgeProps) {
  const m = STATUS_META[status]
  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        background: m.weak,
        color: m.color,
        padding: size === 'sm' ? '3px 9px' : '5px 11px',
        borderRadius: 99,
        fontSize: size === 'sm' ? 11.5 : 12.5,
        fontWeight: 700,
        letterSpacing: '0.01em',
        whiteSpace: 'nowrap',
      }}
    >
      <Icon name={m.icon} size={size === 'sm' ? 12 : 13} strokeWidth={2.6} />
      {m.label}
    </span>
  )
}

interface TypeChipProps {
  type: DebtType
  size?: 'sm' | 'md'
  className?: string
}

export function TypeChip({ type, size = 'md', className }: TypeChipProps) {
  const m = DEBT_TYPE_META[type]
  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        background: 'var(--surface-2)',
        color: 'var(--text-muted)',
        padding: size === 'sm' ? '3px 9px' : '5px 11px',
        borderRadius: 99,
        fontSize: size === 'sm' ? 11.5 : 12.5,
        fontWeight: 600,
        border: '1px solid var(--border)',
        whiteSpace: 'nowrap',
      }}
    >
      <Icon name={m.icon} size={13} strokeWidth={2} />
      {m.short}
    </span>
  )
}
