import { useState, type ReactNode } from 'react'
import { Modal } from '../../../components/ui/Modal'
import { Icon } from '../../../components/ui/Icon'
import { PaidOnField } from '../../../components/shared/PaidOnField'
import { getReliabilityOption } from '../../../constants/reliability'
import { formatAddress } from '../../../lib/utils'
import { fmtMoney, fmtPhone } from '../../../lib/format'
import { debtLeft, openInstallments, type ProfileNumbers } from '../../../lib/debtorProfile'
import type { DebtWithInstallments } from '../../../hooks/debts/useDebtsByDebtor'
import type { Debtor } from '../../../types/debtor'

const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? name
/** Touch screens dial; elsewhere tel: depends on a configured app and often does nothing. */
const canCall = () => typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches

function Item({ icon, title, sub, onClick, disabled, danger }: { icon: string; title: string; sub?: string; onClick: () => void; disabled?: boolean; danger?: boolean }) {
  return (
    <button type="button" className="lt-act" data-danger={danger || undefined} aria-disabled={disabled || undefined} onClick={onClick}>
      <Icon name={icon} size={19} />
      <span className="lt-act-txt">
        <span className="lt-act-t">{title}</span>
        {sub && <span className="lt-act-s">{sub}</span>}
      </span>
    </button>
  )
}

/** Phone: "Ligar" on touch screens, "Copiar telefone" elsewhere (improvement 9). */
function phoneAction(phone: string, copied: () => void) {
  return canCall()
    ? { icon: 'phone', title: 'Ligar', sub: fmtPhone(phone), run: () => window.location.assign(`tel:${phone.replace(/[^\d+]/g, '')}`) }
    : {
        icon: 'phone',
        title: 'Copiar telefone',
        sub: fmtPhone(phone),
        run: () => void navigator.clipboard?.writeText(fmtPhone(phone)).then(copied, copied),
      }
}

/* ---------- Contato e anotações ---------- */

export function DebtorInfoSheet({ open, onClose, debtor, numbers, onEdit, onCopied }: {
  open: boolean
  onClose: () => void
  debtor: Debtor
  numbers: ProfileNumbers
  onEdit: () => void
  onCopied: () => void
}) {
  const rel = getReliabilityOption(debtor.reliability)
  const address = debtor.address ? formatAddress(debtor.address) : ''
  const phone = debtor.phone ? phoneAction(debtor.phone, onCopied) : null
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Contato e anotações"
      footer={
        <button type="button" className="lt-btn-lg" data-variant="secondary" onClick={onEdit}>
          <Icon name="edit" size={15} /> Editar cadastro
        </button>
      }
    >
      <div className="lt-info">
        {rel && (
          <span className="lt-rel-pill" style={{ color: rel.color, borderColor: rel.color }}>
            <Icon name={rel.icon} size={12} strokeWidth={3} /> {rel.label}
          </span>
        )}
        {debtor.notes && <p className="lt-info-note">“{debtor.notes}”</p>}
        {phone && (
          <div className="lt-info-line">
            <Icon name="phone" size={16} />
            <span style={{ flex: 1 }}>{fmtPhone(debtor.phone!)}</span>
            <button type="button" className="lt-chip" onClick={phone.run}>{phone.title === 'Ligar' ? 'Ligar' : 'Copiar'}</button>
          </div>
        )}
        {debtor.email && <div className="lt-info-line"><Icon name="mail" size={16} /><span>{debtor.email}</span></div>}
        {address && <div className="lt-info-line" data-muted><Icon name="home" size={16} /><span>{address}</span></div>}
        {!debtor.phone && !debtor.email && !address && !debtor.notes && <p className="lt-info-empty">Nenhum dado de contato cadastrado.</p>}
        <dl className="lt-stats3">
          <div><dt>Já recebido</dt><dd style={{ color: 'var(--paid)' }}>{fmtMoney(numbers.received / 100)}</dd></div>
          <div><dt>Pontualidade</dt><dd>{numbers.onTime == null ? '—' : `${Math.round(numbers.onTime * 100)}%`}</dd></div>
          <div><dt>Parcelas pagas</dt><dd>{numbers.paidCount}/{numbers.count}</dd></div>
        </dl>
      </div>
    </Modal>
  )
}

/* ---------- ⋯ of the profile ---------- */

export interface ArchiveState {
  archived: boolean
  /** Why archiving is not allowed now (owes something, or an active monthly debt). */
  blockedBy: string | null
}

export function DebtorActionsSheet({ open, onClose, debtor, archive, onInfo, onEdit, onArchive, onDelete, onCopied, onBlocked }: {
  open: boolean
  onClose: () => void
  debtor: Debtor
  archive: ArchiveState
  onInfo: () => void
  onEdit: () => void
  onArchive: (archived: boolean) => void
  onDelete: () => void
  onCopied: () => void
  onBlocked: (why: string) => void
}) {
  const first = firstName(debtor.name)
  const phone = debtor.phone ? phoneAction(debtor.phone, onCopied) : null
  const then = (fn: () => void) => () => {
    onClose()
    fn()
  }
  return (
    <Modal open={open} onClose={onClose} title={debtor.name}>
      <div className="lt-acts">
        {phone && <Item icon={phone.icon} title={phone.title} sub={phone.sub} onClick={then(phone.run)} />}
        <Item icon="user" title="Ver contato e anotações" onClick={then(onInfo)} />
        <Item icon="edit" title="Editar cadastro" onClick={then(onEdit)} />
        {archive.archived ? (
          <Item icon="archive" title={`Reativar ${first}`} sub="Volta para as listas" onClick={then(() => onArchive(false))} />
        ) : archive.blockedBy ? (
          <Item icon="archive" title={`Arquivar ${first}`} sub={archive.blockedBy} disabled onClick={() => onBlocked(archive.blockedBy!)} />
        ) : (
          <Item icon="archive" title={`Arquivar ${first}`} sub="Some das listas. Dá para reativar depois." onClick={then(() => onArchive(true))} />
        )}
        <div className="lt-acts-sep" />
        <Item icon="trash" title={`Excluir ${first}`} sub="Apaga também as dívidas e pagamentos" danger onClick={then(onDelete)} />
      </div>
    </Modal>
  )
}

/* ---------- ⋯ of a debt ---------- */

export function DebtActionsSheet({ debt, debtorName, onClose, onPayoff, onPayoffReceipt, onRecurrence, onEdit }: {
  debt: DebtWithInstallments | null
  debtorName: string
  onClose: () => void
  onPayoff: (d: DebtWithInstallments) => void
  onPayoffReceipt: (d: DebtWithInstallments) => void
  onRecurrence: (d: DebtWithInstallments, active: boolean) => void
  onEdit: (d: DebtWithInstallments) => void
}) {
  const [last, setLast] = useState(debt)
  if (debt && debt !== last) setLast(debt)
  const d = debt ?? last
  if (!d) return null
  const left = debtLeft(d)
  const openN = openInstallments(d).length
  const monthly = d.recurrence === 'MONTHLY'
  const hasPayments = d.installments.some((i) => (i.payments?.length ?? 0) > 0)
  const then = (fn: () => void) => () => {
    onClose()
    fn()
  }
  const title = d.description || 'Dívida'
  const items: ReactNode[] = []
  if (left > 0) {
    items.push(
      <Item
        key="payoff"
        icon="check"
        title={monthly ? 'Pagar o que está em aberto' : 'Quitar dívida'}
        sub={monthly ? `Registrar ${fmtMoney(left / 100)} já cobrado; a recorrência continua` : `Registrar ${fmtMoney(left / 100)} de ${openN} ${openN === 1 ? 'parcela' : 'parcelas'} de uma vez`}
        onClick={then(() => onPayoff(d))}
      />,
    )
  } else if (!monthly && hasPayments) {
    items.push(<Item key="rcpt" icon="receipt" title="Comprovante de quitação" sub="Todos os pagamentos desta dívida num só comprovante" onClick={then(() => onPayoffReceipt(d))} />)
  }
  if (monthly) {
    items.push(
      d.recurrenceActive === false ? (
        <Item key="rec" icon="refresh" title="Retomar recorrência" sub={`Volta a gerar ${d.recurrenceDay ? `todo dia ${d.recurrenceDay}` : 'todo mês'}`} onClick={then(() => onRecurrence(d, true))} />
      ) : (
        <Item key="rec" icon="refresh" title="Encerrar recorrência" sub="Não gera novas cobranças; as em aberto continuam" onClick={then(() => onRecurrence(d, false))} />
      ),
    )
  }
  items.push(<Item key="edit" icon="edit" title="Editar dívida" onClick={then(() => onEdit(d))} />)
  return (
    <Modal
      open={!!debt}
      onClose={onClose}
      title={title}
      head={(id, close) => (
        <div className="lt-remind-head">
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 id={id} className="lt-remind-title">{title}</h2>
            <div className="lt-act-s">{debtorName} · {left > 0 ? `restam ${fmtMoney(left / 100)}` : 'quitada'}</div>
          </div>
          <button type="button" className="lt-icon-close" aria-label="Fechar" onClick={close}><Icon name="x" size={18} /></button>
        </div>
      )}
    >
      <div className="lt-acts">{items}</div>
    </Modal>
  )
}

/* ---------- Quitar ---------- */

export function PayoffSheet({ debt, debtorName, today, busy, onClose, onConfirm }: {
  debt: DebtWithInstallments | null
  debtorName: string
  today: string
  busy: boolean
  onClose: () => void
  onConfirm: (d: DebtWithInstallments, paidAt: string) => void
}) {
  const [last, setLast] = useState(debt)
  const [date, setDate] = useState(today)
  if (debt && debt !== last) {
    setLast(debt)
    setDate(today)
  }
  const d = debt ?? last
  if (!d) return null
  const left = debtLeft(d)
  const openN = openInstallments(d).length
  const monthly = d.recurrence === 'MONTHLY'
  return (
    <Modal
      open={!!debt}
      onClose={onClose}
      title={monthly ? 'Pagar em aberto' : `Quitar ${d.description || 'dívida'}`}
      footer={
        <button type="button" className="lt-btn-lg" data-variant="primary" disabled={busy || !date} onClick={() => onConfirm(d, date)}>
          <Icon name="check" size={17} /> {busy ? 'Registrando…' : `${monthly ? 'Registrar' : 'Quitar dívida'} · ${fmtMoney(left / 100)}`}
        </button>
      }
    >
      <div className="lt-pay-body">
        <div className="lt-amt-box">
          <div className="lt-payoff-v">{fmtMoney(left / 100)}</div>
          <div className="lt-paid-before">
            {openN} {openN === 1 ? 'parcela em aberto' : 'parcelas em aberto'} de {debtorName} {openN === 1 ? 'será marcada como paga' : 'serão marcadas como pagas'}
          </div>
        </div>
        {debt && <PaidOnField key={debt.id} today={today} onChange={setDate} />}
      </div>
    </Modal>
  )
}
