import { useState } from 'react'
import { Icon } from '../ui/Icon'
import { Money } from '../ui/Money'
import { Button } from '../ui/Button'
import { Progress } from '../ui/Progress'
import { StatusBadge } from '../ui/Badge'
import { money, fmtDate, STATUS_META, DEBT_TYPE_META, deriveInstStatus } from '../../lib/utils'
import type { Installment, InstallmentStatus } from '../../types/installment'
import type { DebtWithInstallments } from '../../hooks/debts/useDebtsByDebtor'

interface DebtCardProps {
  debt: DebtWithInstallments
  onReceive: (inst: Installment) => void
}

export function DebtCard({ debt, onReceive }: DebtCardProps) {
  const [open, setOpen] = useState(false)
  const insts = debt.installments ?? []

  const paid = insts.filter((i) => {
    const s = deriveInstStatus({ dueDate: i.dueDate, paidAt: i.paidAt, paidAmount: i.paidAmount, amount: i.amount })
    return s === 'PAID'
  })
  const remaining = insts.reduce((s, i) => {
    const paid = Number(i.paidAmount ?? '0')
    return s + (Number(i.amount) - paid)
  }, 0)
  const paidValue = insts.reduce((s, i) => s + Number(i.paidAmount ?? '0'), 0)
  const totalValue = insts.reduce((s, i) => s + Number(i.amount), 0)
  const ratio = totalValue > 0 ? paidValue / totalValue : 0

  const m = DEBT_TYPE_META[debt.type]
  const hasOverdue = insts.some((i) => {
    const s = deriveInstStatus({ dueDate: i.dueDate, paidAt: i.paidAt, paidAmount: i.paidAmount, amount: i.amount })
    return s === 'OVERDUE'
  })

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
          {[...insts].sort((a, b) => {
            const sa = deriveInstStatus({ dueDate: a.dueDate, paidAt: a.paidAt, paidAmount: a.paidAmount, amount: a.amount })
            const sb = deriveInstStatus({ dueDate: b.dueDate, paidAt: b.paidAt, paidAmount: b.paidAmount, amount: b.amount })
            return (sa === 'PAID' ? 1 : 0) - (sb === 'PAID' ? 1 : 0)
          }).map((inst) => {
            const st: InstallmentStatus = deriveInstStatus({ dueDate: inst.dueDate, paidAt: inst.paidAt, paidAmount: inst.paidAmount, amount: inst.amount })
            const sm = STATUS_META[st]
            const paidAmt = Number(inst.paidAmount ?? '0')
            const totalAmt = Number(inst.amount)
            const isPartial = st === 'PARTIALLY_PAID'

            return (
              <div key={inst.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: 'var(--surface-2)', borderRadius: 12 }}>
                <span style={{ width: 28, height: 28, borderRadius: 8, background: sm.weak, color: sm.color, display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 13, flexShrink: 0 }}>
                  {inst.number}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>
                    {money(totalAmt)}
                    {isPartial && (
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--partial)', marginLeft: 6 }}>
                        falta {money(totalAmt - paidAmt)}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {st === 'PAID'
                      ? `Pago em ${fmtDate(inst.paidAt!)}`
                      : isPartial
                      ? `${money(paidAmt)} pago · vence ${fmtDate(inst.dueDate)}`
                      : `Vence ${fmtDate(inst.dueDate)}`}
                  </div>
                </div>
                {st === 'PAID' ? (
                  (inst.payments?.length ?? 0) > 1 ? (
                    <button
                      type="button"
                      onClick={() => onReceive(inst)}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--paid-weak)', color: 'var(--paid)', border: 'none', padding: '5px 11px', borderRadius: 99, fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
                    >
                      <Icon name="clock" size={13} strokeWidth={2.6} />
                      {inst.payments!.length} pagamentos
                    </button>
                  ) : (
                    <StatusBadge status="PAID" size="sm" />
                  )
                ) : (
                  <Button size="sm" variant="primary" icon="wallet" onClick={() => onReceive(inst)}>
                    Receber
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
