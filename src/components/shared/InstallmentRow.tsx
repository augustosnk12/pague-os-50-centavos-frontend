import { Avatar } from '../ui/Avatar'
import { Money } from '../ui/Money'
import { Button } from '../ui/Button'
import { StatusBadge } from '../ui/Badge'
import { Icon } from '../ui/Icon'
import { fmtDate, daysBetween, STATUS_META, deriveInstStatus, money } from '../../lib/utils'
import type { InstallmentStatus } from '../../types/installment'

interface InstallmentData {
  id: string
  number: number
  amount: string
  paidAmount: string
  dueDate: string
  paidAt: string | null
  status: InstallmentStatus
  payments?: { id: string }[]
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
  onReceive: () => void
  showDebtor?: boolean
  index?: number
}

export function InstallmentRow({ enriched, onOpenDebtor, onReceive, showDebtor = true, index = 0 }: InstallmentRowProps) {
  const { inst, debtDescription, debtorId, debtorName } = enriched
  const now = new Date().toISOString()
  const days = daysBetween(now, inst.dueDate)
  const status = deriveInstStatus({ dueDate: inst.dueDate, paidAt: inst.paidAt, paidAmount: inst.paidAmount, amount: inst.amount })

  const paidAmt = Number(inst.paidAmount ?? '0')
  const totalAmt = Number(inst.amount)
  const isPartial = status === 'PARTIALLY_PAID'

  let when: string
  if (status === 'PAID') {
    when = `Pago em ${fmtDate(inst.paidAt!)}`
  } else if (isPartial) {
    when = `${money(paidAmt)} pago · vence ${fmtDate(inst.dueDate)}`
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
            color: status === 'OVERDUE' ? 'var(--overdue)' : isPartial ? 'var(--partial)' : 'var(--text-muted)',
            fontWeight: (status === 'OVERDUE' || isPartial) ? 700 : 500,
            marginTop: 2,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {!isPartial && debtDescription ? `${debtDescription} · ` : ''}{when}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 7 }}>
        {isPartial ? (
          <div style={{ textAlign: 'right' }}>
            <Money value={totalAmt - paidAmt} size={16.5} weight={800} color="var(--partial)" />
            <div style={{ fontSize: 11.5, color: 'var(--text-faint)', fontWeight: 600 }}>de {money(totalAmt)}</div>
          </div>
        ) : (
          <Money value={inst.amount} size={16.5} weight={800} />
        )}
        {status === 'PAID' ? (
          (inst.payments?.length ?? 0) > 0 ? (
            <button
              type="button"
              onClick={onReceive}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--paid-weak)', color: 'var(--paid)', border: 'none', padding: '5px 11px', borderRadius: 99, fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              <Icon name="check" size={13} strokeWidth={2.6} />
              Pago
            </button>
          ) : (
            <StatusBadge status="PAID" size="sm" />
          )
        ) : (
          <Button size="sm" variant="primary" icon="wallet" onClick={onReceive}>
            Receber
          </Button>
        )}
      </div>
    </div>
  )
}

export type { EnrichedInstallment }
