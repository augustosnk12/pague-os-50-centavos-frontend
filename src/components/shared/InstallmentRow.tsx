import { Avatar } from '../ui/Avatar'
import { Money } from '../ui/Money'
import { Button } from '../ui/Button'
import { StatusBadge } from '../ui/Badge'
import { fmtDate, daysBetween, STATUS_META, deriveInstStatus } from '../../lib/utils'
import type { InstallmentStatus } from '../../types/installment'

interface InstallmentData {
  id: string
  number: number
  amount: string
  dueDate: string
  paidAt: string | null
  status: InstallmentStatus
}

interface EnrichedInstallment {
  inst: InstallmentData
  debtDescription: string | null
  debtorId: string
  debtorName: string
  status: InstallmentStatus
}

interface InstallmentRowProps {
  enriched: EnrichedInstallment
  onOpenDebtor?: (id: string) => void
  onMarkPaid: () => void
  showDebtor?: boolean
  index?: number
}

export function InstallmentRow({ enriched, onOpenDebtor, onMarkPaid, showDebtor = true, index = 0 }: InstallmentRowProps) {
  const { inst, debtDescription, debtorId, debtorName } = enriched
  const now = new Date().toISOString()
  const days = daysBetween(now, inst.dueDate)
  const status = deriveInstStatus({ dueDate: inst.dueDate, paidAt: inst.paidAt })

  let when: string
  if (status === 'PAID') {
    when = `Pago em ${fmtDate(inst.paidAt!)}`
  } else if (status === 'OVERDUE') {
    when = days === 0 ? 'Vence hoje' : `Atrasado há ${days} ${days === 1 ? 'dia' : 'dias'}`
  } else {
    const dleft = -days
    when = dleft === 0 ? 'Vence hoje' : `Vence em ${dleft} ${dleft === 1 ? 'dia' : 'dias'} · ${fmtDate(inst.dueDate)}`
  }

  const m = STATUS_META[status]

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 13,
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderLeft: `4px solid ${m.color}`,
        borderRadius: 'var(--radius)',
        padding: '13px 15px',
        boxShadow: 'var(--shadow-sm)',
        animation: `ltRise .4s cubic-bezier(0.22,1,0.36,1) ${index * 0.04}s both`,
      }}
    >
      <div
        onClick={() => onOpenDebtor?.(debtorId)}
        style={{ cursor: onOpenDebtor ? 'pointer' : 'default', flexShrink: 0 }}
      >
        <Avatar name={debtorName} size={44} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {showDebtor && (
            <span
              onClick={() => onOpenDebtor?.(debtorId)}
              style={{ fontWeight: 800, fontSize: 15, cursor: onOpenDebtor ? 'pointer' : 'default', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
            >
              {debtorName}
            </span>
          )}
          <span style={{ fontSize: 12, color: 'var(--text-faint)', fontWeight: 600 }}>Parcela {inst.number}</span>
        </div>
        <div
          style={{
            fontSize: 13,
            color: status === 'OVERDUE' ? 'var(--overdue)' : 'var(--text-muted)',
            fontWeight: status === 'OVERDUE' ? 700 : 500,
            marginTop: 2,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {debtDescription ? `${debtDescription} · ` : ''}{when}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 7 }}>
        <Money value={inst.amount} size={16.5} weight={800} />
        {status === 'PAID' ? (
          <StatusBadge status="PAID" size="sm" />
        ) : (
          <Button size="sm" variant="soft" icon="check" onClick={onMarkPaid}>
            Marcar pago
          </Button>
        )}
      </div>
    </div>
  )
}

export type { EnrichedInstallment }
