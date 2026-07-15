import { useState } from 'react'
import { Icon } from '../ui/Icon'
import { Money } from '../ui/Money'
import { Button } from '../ui/Button'
import { StatusBadge } from '../ui/Badge'
import { money, fmtDate, STATUS_META, DEBT_TYPE_META, deriveInstStatus } from '../../lib/utils'
import type { Installment, InstallmentStatus } from '../../types/installment'
import type { DebtWithInstallments } from '../../hooks/debts/useDebtsByDebtor'

interface DebtCardProps {
  debt: DebtWithInstallments
  onReceive: (inst: Installment) => void
  onEditDebt?: (debt: DebtWithInstallments) => void
}

export function DebtCard({ debt, onReceive, onEditDebt }: DebtCardProps) {
  const [open, setOpen] = useState(false)

  const insts = debt.installments ?? []

  const paid = insts.filter((i) => {
    const s = deriveInstStatus({ dueDate: i.dueDate, paidAt: i.paidAt, paidAmount: i.paidAmount, amount: i.amount })
    return s === 'PAID'
  })
  const remaining = insts.reduce((s, i) => {
    return s + (Number(i.amount) - Number(i.paidAmount ?? '0'))
  }, 0)
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
                  (inst.payments?.length ?? 0) > 0 ? (
                    <button
                      type="button"
                      onClick={() => onReceive(inst)}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--paid-weak)', color: 'var(--paid)', border: 'none', padding: '5px 11px', borderRadius: 99, fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
                    >
                      <Icon name="check" size={13} strokeWidth={2.6} />
                      Pago
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
          {onEditDebt && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
              <button
                type="button"
                onClick={() => onEditDebt(debt)}
                aria-label="Editar dívida"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '7px 12px', borderRadius: 'calc(var(--radius)*0.55)', border: 'none', background: 'transparent', color: 'var(--text-muted)', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', transition: 'background .15s, color .15s' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-hover)'; e.currentTarget.style.color = 'var(--text)' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' }}
              >
                <Icon name="edit" size={15} /> Editar
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
