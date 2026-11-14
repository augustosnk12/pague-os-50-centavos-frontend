import { useState, type ReactNode } from 'react'
import { Modal } from '../../../components/ui/Modal'
import { Icon } from '../../../components/ui/Icon'
import { PaidOnField } from '../../../components/shared/PaidOnField'
import { getReliabilityOption } from '../../../constants/reliability'
import { formatAddress } from '../../../lib/utils'
import { fmtMoney, fmtPhone } from '../../../lib/format'
import { debtLeft, debtRecurrenceEnd, openInstallments, recurrenceEndLabel, type ProfileNumbers } from '../../../lib/debtorProfile'
import { recurrenceEnd } from '../../../lib/newDebt'
import { fmtBR } from '../../../lib/format'
import { DateInput } from '../../../components/ui/DateInput'
import { localToday } from '../../../lib/date'
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

export function DebtActionsSheet({ debt, debtorName, onClose, onPayoff, onPayoffReceipt, onRecurrence, onRecurrenceEnd, onEdit }: {
  debt: DebtWithInstallments | null
  debtorName: string
  onClose: () => void
  onPayoff: (d: DebtWithInstallments) => void
  onPayoffReceipt: (d: DebtWithInstallments) => void
  onRecurrence: (d: DebtWithInstallments, active: boolean) => void
  onRecurrenceEnd: (d: DebtWithInstallments) => void
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
  if (monthly) {
    const end = recurrenceEndLabel(d, localToday())
    items.push(<Item key="end" icon="calendar" title="Alterar término" sub={end === 'sem fim' ? 'Hoje: sem fim' : end.charAt(0).toUpperCase() + end.slice(1)} onClick={then(() => onRecurrenceEnd(d))} />)
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

/* ---------- Alterar término (recurring) ---------- */

type EndMode = 'never' | 'count' | 'date'
const END_MODES: { id: EndMode; label: string }[] = [
  { id: 'never', label: 'Sem fim' },
  { id: 'count', label: 'Após' },
  { id: 'date', label: 'Em uma data' },
]

/**
 * When a monthly debt ends — sooner, later or never. Charges that already
 * exist stay: the end cannot come before them (the API refuses it too).
 */
export function RecurrenceEndSheet({ debt, busy, onClose, onSave }: {
  debt: DebtWithInstallments | null
  busy: boolean
  onClose: () => void
  onSave: (d: DebtWithInstallments, end: { occurrences: number | null; endsAt: string | null }) => void
}) {
  const [last, setLast] = useState(debt)
  const [mode, setMode] = useState<EndMode>('never')
  const [months, setMonths] = useState('')
  const [until, setUntil] = useState('')
  if (debt && debt !== last) {
    setLast(debt)
    setMode(debt.recurrenceOccurrences ? 'count' : debt.recurrenceEndsAt ? 'date' : 'never')
    setMonths(debt.recurrenceOccurrences ? String(debt.recurrenceOccurrences) : '')
    setUntil(debt.recurrenceEndsAt ? debt.recurrenceEndsAt.slice(0, 10) : '')
  }
  const d = debt ?? last
  if (!d) return null

  const dues = d.installments.map((i) => i.dueDate.slice(0, 10))
  const created = dues.length
  const lastDue = [...dues].sort().pop() ?? ''
  const n = parseInt(months, 10) || 0
  const now = debtRecurrenceEnd(d)
  const next = recurrenceEnd(dues, d.recurrenceDay, { occurrences: mode === 'count' ? n : null, endsAt: mode === 'date' && until ? until : null })

  const problem =
    mode === 'count' && n < created
      ? `Já existem ${created} ${created === 1 ? 'cobrança' : 'cobranças'}: o mínimo é ${created}`
      : mode === 'date' && !until
        ? 'Escolha a data da última cobrança'
        : mode === 'date' && until < lastDue
          ? `Já existe cobrança em ${fmtBR(lastDue)}: escolha essa data ou depois`
          : null
  const result =
    mode === 'never' ? 'Continua todo mês, sem data para terminar' : next.last ? `Última cobrança em ${fmtBR(next.last)}${next.remaining ? ` · faltam ${next.remaining}` : ''}` : ''
  const unchanged =
    (mode === 'never' && !d.recurrenceOccurrences && !d.recurrenceEndsAt) ||
    (mode === 'count' && n === d.recurrenceOccurrences) ||
    (mode === 'date' && until === (d.recurrenceEndsAt ?? '').slice(0, 10))

  return (
    <Modal
      open={!!debt}
      onClose={onClose}
      title="Alterar término"
      footer={
        <button
          type="button"
          className="lt-btn-lg"
          data-variant="primary"
          disabled={busy || !!problem || unchanged}
          onClick={() => onSave(d, { occurrences: mode === 'count' ? n : null, endsAt: mode === 'date' ? `${until}T00:00:00.000Z` : null })}
        >
          <Icon name="check" size={17} /> {busy ? 'Salvando…' : 'Salvar término'}
        </button>
      }
    >
      <div className="lt-pay-body">
        <p className="lt-end-now">
          <b>{d.description || 'Dívida'}</b> · {created} {created === 1 ? 'cobrança criada' : 'cobranças criadas'} · hoje {now.last ? (now.remaining ? `termina em ${fmtBR(now.last)}` : `a última é ${fmtBR(now.last)}`) : 'sem fim'}
        </p>
        <div>
          <div className="lt-flabel" id="end-mode-l">Termina</div>
          <div className="lt-seg" role="group" aria-labelledby="end-mode-l">
            {END_MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                aria-pressed={mode === m.id}
                onClick={() => {
                  setMode(m.id)
                  // Start from the current end (or what already exists), not from an empty field.
                  if (m.id === 'date' && !until) setUntil(now.last ?? lastDue)
                  if (m.id === 'count' && !months) setMonths(String(Math.max(created, now.last ? created + (now.remaining ?? 0) : created)))
                }}
              >
                {m.label}
              </button>
            ))}
          </div>
          {mode === 'count' && (
            <label className="lt-end-months">
              <input
                className="lt-end-input"
                value={months}
                onChange={(e) => setMonths(e.target.value.replace(/\D/g, '').slice(0, 3))}
                inputMode="numeric"
                aria-label="Número de cobranças no total"
                autoFocus
              />
              <span>cobranças no total</span>
            </label>
          )}
          {mode === 'date' && (
            <div style={{ marginTop: 10 }}>
              <DateInput label="Última cobrança em" value={until} onChange={setUntil} min={lastDue} />
            </div>
          )}
        </div>
        <div className="lt-end-result" role="status" data-problem={problem ? true : undefined}>
          {problem ?? result}
        </div>
      </div>
    </Modal>
  )
}

/* ---------- Excluir dívida / devedor (improvement 46) ---------- */

const norm = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').trim().toLowerCase()

/** Simple confirmation; only reached for a debt with no payments. */
export function DeleteDebtSheet({ debt, busy, onClose, onConfirm }: {
  debt: DebtWithInstallments | null
  busy: boolean
  onClose: () => void
  onConfirm: (d: DebtWithInstallments) => void
}) {
  const [last, setLast] = useState(debt)
  if (debt && debt !== last) setLast(debt)
  const d = debt ?? last
  if (!d) return null
  const n = d.installments.length
  return (
    <Modal
      open={!!debt}
      onClose={onClose}
      title={`Excluir ${d.description || 'dívida'}?`}
      footer={
        <button type="button" className="lt-btn-lg" data-variant="danger" disabled={busy} onClick={() => onConfirm(d)}>
          <Icon name="trash" size={16} /> {busy ? 'Excluindo…' : 'Excluir dívida'}
        </button>
      }
    >
      <p className="lt-del-p">{n > 1 ? `As ${n} parcelas dessa dívida serão apagadas.` : 'A parcela dessa dívida será apagada.'} Não dá para desfazer.</p>
    </Modal>
  )
}

/**
 * Excluir devedor: with no debts, a simple confirmation. With history, it
 * first suggests Arquivar (keeps the history) and, to delete everything,
 * asks only for the first name (accents and case don't matter).
 */
export function DeleteDebtorSheet({ open, onClose, debtor, debts, archive, received, busy, onArchive, onDelete }: {
  open: boolean
  onClose: () => void
  debtor: Debtor
  debts: DebtWithInstallments[]
  archive: ArchiveState
  /** Received on everything, cents. */
  received: number
  busy: boolean
  onArchive: () => void
  onDelete: () => void
}) {
  const [typed, setTyped] = useState('')
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) setTyped('')
  }
  const first = firstName(debtor.name)
  const hasHistory = debts.length > 0
  const payments = debts.reduce((n, d) => n + d.installments.reduce((m, i) => m + (i.payments?.length ?? 0), 0), 0)
  const ok = !hasHistory || norm(typed) === norm(first)
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Excluir ${first}?`}
      footer={
        <button type="button" className="lt-btn-lg" data-variant="danger" aria-disabled={!ok || undefined} disabled={busy} onClick={() => ok && onDelete()}>
          <Icon name="trash" size={16} /> {busy ? 'Excluindo…' : hasHistory ? 'Excluir tudo' : 'Excluir devedor'}
        </button>
      }
    >
      {!hasHistory ? (
        <p className="lt-del-p">{debtor.name} não tem dívidas. O cadastro será apagado e não dá para desfazer.</p>
      ) : (
        <div className="lt-del">
          {!archive.archived && (
            <div className="lt-del-arch">
              <div className="lt-del-arch-t"><Icon name="archive" size={15} /> Prefere arquivar?</div>
              <div className="lt-del-arch-s">Some das listas e mantém o histórico de {fmtMoney(received / 100)} recebidos. Dá para reativar.</div>
              {archive.blockedBy ? (
                <div className="lt-del-arch-why">{archive.blockedBy}</div>
              ) : (
                <button type="button" className="lt-chip" onClick={onArchive}>Arquivar {first}</button>
              )}
            </div>
          )}
          <div>
            <div className="lt-del-all-t">{archive.archived ? 'Excluir tudo' : 'Ou excluir tudo'}</div>
            <div className="lt-del-all-s">
              Apaga {debts.length} {debts.length === 1 ? 'dívida' : 'dívidas'} e {payments} {payments === 1 ? 'pagamento' : 'pagamentos'}. Não dá para desfazer.
            </div>
            <label className="lt-flabel" htmlFor="dd-confirm">Digite “{first}” para confirmar</label>
            <input id="dd-confirm" className="lt-del-input" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
          </div>
        </div>
      )}
    </Modal>
  )
}
