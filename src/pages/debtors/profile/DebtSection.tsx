import { useRef } from 'react'
import { Icon } from '../../../components/ui/Icon'
import { IconButton } from '../../../components/ui/IconButton'
import { ListGroup } from '../../../components/ui/ListGroup'
import { InstallmentLine } from '../../../components/shared/InstallmentLine'
import { Detail } from '../../../contexts/PreferencesContext'
import { DEBT_TYPE_META } from '../../../lib/utils'
import { fmtMoney } from '../../../lib/format'
import { debtLate, debtLeft, enrich, leftOf, openInstallments, recurrenceEndLabel } from '../../../lib/debtorProfile'
import type { DebtWithInstallments } from '../../../hooks/debts/useDebtsByDebtor'
import type { Debtor } from '../../../types/debtor'
import type { InstallmentEnriched } from '../../../types/installment'

interface DebtSectionProps {
  debt: DebtWithInstallments
  debtor: Debtor
  today: string
  /** "Enxuta" shows only the next installment. */
  lean: boolean
  expanded: boolean
  onToggle: () => void
  onOpen: (inst: InstallmentEnriched) => void
  onActions: () => void
  onPayoff: () => void
  onReceipt: (paymentId: string) => void
}

/**
 * One open debt as its own card (improvement 12): header (description,
 * x/y pagas or monthly, what is left, ⋯), a thin bar, the next open
 * installments ready for "Receber", "Ver todas as N parcelas" and
 * "✓ Quitar · R$ X" when 2+ are open (34). Red edge when something is late.
 */
export function DebtSection({ debt, debtor, today, lean, expanded, onToggle, onOpen, onActions, onPayoff, onReceipt }: DebtSectionProps) {
  const total = debt.installments.length
  const left = debtLeft(debt)
  const open = openInstallments(debt)
  const paidN = debt.installments.filter((i) => leftOf(i) === 0).length
  const received = debt.installments.reduce((s, i) => s + Math.round(Number(i.paidAmount) * 100), 0)
  const expected = debt.installments.reduce((s, i) => s + Math.round(Number(i.amount) * 100), 0)
  const late = debtLate(debt, today)
  const show = lean ? 1 : 3
  const rows = expanded ? [...debt.installments].sort((a, b) => a.number - b.number) : open.slice(0, show)
  // Opened expanded (search, new debt) with nothing to hide: no "Mostrar só as em aberto".
  const canToggle = total > open.slice(0, show).length
  const title = debt.description || DEBT_TYPE_META[debt.type]?.label || 'Dívida'
  const monthly = debt.recurrence === 'MONTHLY'
  const sectionRef = useRef<HTMLElement>(null)
  const sticky = expanded && canToggle

  /** Recolher: collapse and, if the card's top went off screen, bring it back (improvement 12). */
  const toggle = () => {
    const collapsing = expanded
    onToggle()
    if (!collapsing) return
    requestAnimationFrame(() => {
      const el = sectionRef.current
      const head = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--app-head-h')) || 60
      if (el && el.getBoundingClientRect().top < head) el.scrollIntoView({ block: 'start' })
    })
  }

  return (
    <section ref={sectionRef} id={`divida-${debt.id}`} className="lt-dsec" data-late={late || undefined} aria-labelledby={`divida-h-${debt.id}`}>
      {/* Expanded, the header stays on screen while scrolling, with "Recolher". */}
      <div className="lt-dsec-h" data-sticky={sticky || undefined}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 id={`divida-h-${debt.id}`} className="lt-dsec-t">{title}</h3>
          <Detail>
            <div className="lt-dsec-s" data-monthly={monthly || undefined}>
              {monthly
                ? `↻ Mensal${debt.recurrenceDay ? ` · dia ${debt.recurrenceDay}` : ''} · ${debt.recurrenceActive === false ? 'encerrada' : recurrenceEndLabel(debt, today)}`
                : `${DEBT_TYPE_META[debt.type]?.label ?? ''} · ${paidN}/${total} pagas`}
            </div>
          </Detail>
        </div>
        <div className="lt-dsec-left">
          <div className="lt-dsec-v">{fmtMoney(left / 100)}</div>
          <Detail><div className="lt-dsec-k">restam</div></Detail>
        </div>
        {sticky ? (
          <button type="button" className="lt-dsec-collapse" aria-expanded onClick={toggle} aria-label={`Recolher ${title}`}>
            Recolher <Icon name="chevronDown" size={13} style={{ transform: 'rotate(180deg)' }} />
          </button>
        ) : (
          <IconButton name="dots" size={17} label={`Ações da dívida ${title}`} onClick={onActions} />
        )}
      </div>
      <Detail>
        <div className="lt-dsec-bar" aria-hidden="true"><span style={{ width: `${expected ? (received / expected) * 100 : 0}%` }} /></div>
      </Detail>
      <ListGroup label={`Parcelas de ${title}`}>
        {rows.map((i) => (
          <InstallmentLine key={i.id} inst={enrich(i, debt, debtor)} today={today} onOpen={onOpen} inDebt showDate={false} onReceipt={onReceipt} />
        ))}
      </ListGroup>
      {(canToggle || open.length > 1) && (
        <div className="lt-dsec-foot">
          {canToggle ? (
            <button type="button" className="lt-more-link" aria-expanded={expanded} onClick={toggle}>
              {expanded ? 'Mostrar só as em aberto' : `Ver todas as ${total} parcelas`}
              <Icon name="chevronDown" size={13} style={expanded ? { transform: 'rotate(180deg)' } : undefined} />
            </button>
          ) : (
            <span />
          )}
          {open.length > 1 && (
            <button type="button" className="lt-payoff-btn" onClick={onPayoff} aria-label={`${monthly ? 'Pagar o que está em aberto em' : 'Quitar'} ${title}, ${fmtMoney(left / 100)}`}>
              <Icon name="check" size={14} strokeWidth={2.8} /> {monthly ? 'Pagar em aberto' : 'Quitar'} · {fmtMoney(left / 100)}
            </button>
          )}
        </div>
      )}
    </section>
  )
}
