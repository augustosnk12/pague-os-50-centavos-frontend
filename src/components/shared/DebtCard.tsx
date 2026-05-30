import { useState } from 'react'
import { Icon } from '../ui/Icon'
import { Money } from '../ui/Money'
import { Button } from '../ui/Button'
import { Progress } from '../ui/Progress'
import { StatusBadge } from '../ui/Badge'
import { money, fmtDate, STATUS_META, DEBT_TYPE_META } from '../../lib/utils'
import type { Installment, InstallmentStatus } from '../../types/installment'
import type { DebtWithInstallments } from '../../hooks/debts/useDebtsByDebtor'

interface DebtCardProps {
  debt: DebtWithInstallments
  onMarkPaid: (inst: Installment) => void
}

export function DebtCard({ debt, onMarkPaid }: DebtCardProps) {
  const [open, setOpen] = useState(false)
  const insts = debt.installments ?? []
  const paid = insts.filter((i) => i.status === 'PAID')
  const remaining = insts.filter((i) => i.status !== 'PAID').reduce((s, i) => s + Number(i.amount), 0)
  const ratio = insts.length ? paid.length / insts.length : 0
  const m = DEBT_TYPE_META[debt.type]
  const hasOverdue = insts.some((i) => i.status === 'OVERDUE')

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
      <div onClick={() => setOpen((o) => !o)} style={{ padding: 16, cursor: 'pointer', display: 'flex', gap: 13, alignItems: 'center' }}>
        <span style={{ width: 42, height: 42, borderRadius: 12, background: 'var(--primary-weak)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
          <Icon name={m?.icon ?? 'wallet'} size={20} color="var(--primary)" />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontWeight: 800, fontSize: 15.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {debt.description ?? m?.label}
            </span>
            {hasOverdue && <span style={{ width: 8, height: 8, borderRadius: 99, background: 'var(--overdue)', flexShrink: 0 }} />}
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 2 }}>
            {m?.label} · {insts.length}× · {paid.length}/{insts.length} pagas
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <Money value={debt.totalAmount} size={15.5} weight={800} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end', marginTop: 2 }}>
            <span style={{ fontSize: 12, color: remaining > 0 ? 'var(--text-muted)' : 'var(--paid)', fontWeight: 700 }}>
              {remaining > 0 ? `${money(remaining)} restam` : 'Quitada'}
            </span>
            <Icon name="chevronDown" size={16} color="var(--text-faint)" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .25s' }} />
          </div>
        </div>
      </div>

      <div style={{ padding: '0 16px 4px' }}>
        <Progress value={ratio} color={hasOverdue ? 'var(--overdue)' : 'var(--paid)'} height={5} />
      </div>

      {open && (
        <div style={{ padding: '12px 16px 16px', display: 'flex', flexDirection: 'column', gap: 8, animation: 'ltFade .25s ease' }}>
          {insts.map((inst) => {
            const st: InstallmentStatus = inst.status
            const sm = STATUS_META[st]
            return (
              <div key={inst.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: 'var(--surface-2)', borderRadius: 12 }}>
                <span style={{ width: 28, height: 28, borderRadius: 8, background: sm.weak, color: sm.color, display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 13, flexShrink: 0 }}>
                  {inst.number}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{money(inst.amount)}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {st === 'PAID' ? `Pago em ${fmtDate(inst.paidAt!)}` : `Vence ${fmtDate(inst.dueDate)}`}
                  </div>
                </div>
                {st === 'PAID' ? (
                  <StatusBadge status="PAID" size="sm" />
                ) : (
                  <Button size="sm" variant={st === 'OVERDUE' ? 'paid' : 'soft'} icon="check" onClick={() => onMarkPaid(inst)}>
                    Marcar pago
                  </Button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
