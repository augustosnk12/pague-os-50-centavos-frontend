import { Icon } from '../ui/Icon'
import { Money } from '../ui/Money'
import { STATUS_META } from '../../lib/utils'
import type { InstallmentStatus } from '../../types/installment'

interface StatTileProps {
  label: string
  value: string
  status: InstallmentStatus
  count: number
}

export function StatTile({ label, value, status, count }: StatTileProps) {
  const m = STATUS_META[status]
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '15px 16px', boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column', gap: 9 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, color: m.color, fontWeight: 700, fontSize: 13 }}>
          <span style={{ width: 24, height: 24, borderRadius: 8, background: m.weak, display: 'grid', placeItems: 'center' }}>
            <Icon name={m.icon} size={14} strokeWidth={2.6} />
          </span>
          {label}
        </span>
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-faint)' }}>{count}×</span>
      </div>
      <Money value={value} size={21} weight={800} />
    </div>
  )
}
