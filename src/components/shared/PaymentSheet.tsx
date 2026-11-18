import { useEffect, useRef, useState } from 'react'
import { Modal } from '../ui/Modal'
import { DateInput } from '../ui/DateInput'
import { Avatar } from '../ui/Avatar'
import { Icon } from '../ui/Icon'
import { IconButton } from '../ui/IconButton'
import { Money } from '../ui/Money'
import { Detail } from '../../contexts/PreferencesContext'
import { useToast } from '../../contexts/ToastContext'
import { useRegisterPayment } from '../../hooks/installments/useRegisterPayment'
import { useDeletePayment } from '../../hooks/installments/useDeletePayment'
import { useDebtor } from '../../hooks/debtors/useDebtor'
import { amountWidth, formatCents, parseCurrencyDigits } from '../../lib/currency'
import { localToday } from '../../lib/date'
import { fmtList, fmtMoney, fmtTitle } from '../../lib/format'
import { daysUntil, installmentPosition, remainingCents } from '../../lib/installmentTag'
import { whatsappLink } from '../../lib/whatsapp'
import { RemindSheet } from './RemindSheet'
import { ReceiptSheet } from './ReceiptSheet'
import { BatchSheet } from './BatchSheet'
import { useDebtsByDebtor } from '../../hooks/debts/useDebtsByDebtor'
import { leftOf } from '../../lib/debtorProfile'
import type { ReceiptRequest } from '../../lib/receipt'
import { getApiError } from '../../lib/api'
import { translateApiError } from '../../lib/utils'
import { failedSave } from '../../lib/saveError'
import type { PaymentTarget } from '../../lib/paymentTarget'
import type { Installment } from '../../types/installment'
import type { Payment } from '../../types/payment'

type DateMode = 'today' | 'yesterday' | 'other'

const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? name
const addDays = (iso: string, n: number) => {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10)
}

/** "atrasada há 2 dias", "vence hoje", "vence em 12 nov" (improvement 6). */
function dueText(inst: Installment, today: string): { text: string; color: string } {
  if (remainingCents(inst) === 0) return { text: 'quitada', color: 'var(--paid)' }
  const d = daysUntil(inst.dueDate, today)
  if (d < 0) return { text: `atrasada há ${-d} ${d === -1 ? 'dia' : 'dias'}`, color: 'var(--overdue)' }
  if (d === 0) return { text: 'vence hoje', color: 'var(--pending)' }
  if (d === 1) return { text: 'vence amanhã', color: 'var(--text-muted)' }
  return { text: `vence em ${fmtList(inst.dueDate)}`, color: 'var(--text-muted)' }
}

interface PaymentSheetProps {
  /** The installment to pay; null closes the sheet. */
  target: PaymentTarget | null
  onClose: () => void
}

/**
 * Payment sheet (S2, improvements 6, 7 and 10). Registers and deletes
 * payments itself and offers "Desfazer" in the toast for both, using the
 * existing endpoints (POST / DELETE /installments/:id/payments).
 */
export function PaymentSheet({ target, onClose }: PaymentSheetProps) {
  const today = localToday()
  const { showToast } = useToast()
  const register = useRegisterPayment()
  const remove = useDeletePayment()

  // Keep the last target while the sheet plays its closing animation.
  const lastTarget = useRef<PaymentTarget | null>(target)
  if (target) lastTarget.current = target
  const t = target ?? lastTarget.current

  // The installment as the sheet knows it: replaced after a deletion.
  const [inst, setInst] = useState<Installment | null>(t?.installment ?? null)
  const [cents, setCents] = useState('')
  const [dateMode, setDateMode] = useState<DateMode>('today')
  const [otherDate, setOtherDate] = useState('')
  const [histOpen, setHistOpen] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [remindId, setRemindId] = useState<string | null>(null)
  const [receipt, setReceipt] = useState<ReceiptRequest | null>(null)
  const [batchFrom, setBatchFrom] = useState<{ debtorId: string; installmentId: string } | null>(null)

  // Fresh state each time the sheet opens (or opens for another installment).
  useEffect(() => {
    if (!target) return
    const i = target.installment
    setInst(i)
    setCents(String(remainingCents(i)))
    setDateMode('today')
    setOtherDate('')
    setHistOpen(remainingCents(i) === 0)
  }, [target])

  const overdue = !!inst && remainingCents(inst) > 0 && daysUntil(inst.dueDate, today) < 0
  // The phone only matters for the WhatsApp reminder of an overdue installment.
  const { data: debtorFull } = useDebtor(target && overdue ? target.debtor.id : '')
  // "Pagou mais de uma?" only when the debtor has another open installment (S7).
  const { data: debtorDebts } = useDebtsByDebtor(target ? target.debtor.id : '')
  const openCount = (debtorDebts ?? []).reduce((n, d) => n + d.installments.filter((i) => leftOf(i) > 0).length, 0)

  if (!t || !inst) return null

  const left = remainingCents(inst)
  const paidCents = Math.round(Number(inst.paidAmount ?? '0') * 100)
  const readOnly = left === 0
  const amount = parseInt(cents || '0', 10)
  const willPayOff = amount > 0 && amount >= left
  const payments: Payment[] = inst.payments ?? []
  const date = dateMode === 'today' ? today : dateMode === 'yesterday' ? addDays(today, -1) : otherDate
  const due = dueText(inst, today)
  const position = installmentPosition(inst.number, t.installmentCount, t.recurrence)
  const name = t.debtor.name
  // WhatsApp reminder (S5): for an overdue installment of someone with a valid phone.
  const canRemind = overdue && !!whatsappLink(debtorFull?.phone)

  const setAmount = (raw: string) => {
    const digits = parseCurrencyDigits(raw)
    setCents(parseInt(digits || '0', 10) > left ? String(left) : digits)
  }

  const fail = (fallback: string) => (e: unknown) => showToast(translateApiError(getApiError(e), fallback), { icon: 'alert' })

  /** Deletes a payment that was just registered ("Desfazer"). */
  const undoRegister = (installmentId: string, payment: Payment) =>
    remove.mutate({ installmentId, paymentId: payment.id }, {
      onSuccess: () => showToast('Pagamento desfeito'),
      onError: fail('Não foi possível desfazer.'),
    })

  /** Registers again a payment that was just deleted ("Desfazer"). */
  const undoDelete = (installmentId: string, payment: Payment) =>
    register.mutate({ id: installmentId, body: { amount: Number(payment.amount), paidAt: payment.paidAt.slice(0, 10) } }, {
      onSuccess: ({ installment, payment: back }) => {
        setInst((cur) => (cur && cur.id === installmentId ? { ...cur, ...installment, payments: [...(cur.payments ?? []), back] } : cur))
        showToast('Pagamento restaurado', { icon: 'check' })
      },
      onError: fail('Não foi possível desfazer.'),
    })

  const confirm = () => {
    if (amount <= 0 || !date || register.isPending) return
    const installmentId = inst.id
    const debtorId = t.debtor.id
    register.mutate({ id: installmentId, body: { amount: amount / 100, paidAt: date } }, {
      onSuccess: ({ payment }) => {
        onClose()
        showToast(willPayOff ? `Parcela quitada · ${firstName(name)}` : `Pagamento de ${fmtMoney(amount / 100)} registrado`, {
          icon: 'check',
          status: willPayOff ? 'PAID' : undefined,
          action: { label: 'Desfazer', onClick: () => undoRegister(installmentId, payment) },
          secondary: { label: 'Comprovante', onClick: () => setReceipt({ debtorId, paymentId: payment.id }) },
        })
      },
      // Not saved: say what, and offer "Tentar de novo" (improvement 47). The sheet stays filled.
      onError: failedSave(showToast, `registrar ${fmtMoney(amount / 100)}`, confirm),
    })
  }

  const deletePayment = (p: Payment) => {
    if (deleting) return
    const installmentId = inst.id
    setDeleting(p.id)
    remove.mutate({ installmentId, paymentId: p.id }, {
      onSuccess: (updated) => {
        setDeleting(null)
        setInst((cur) => (cur && cur.id === installmentId ? { ...cur, ...updated, payments: (cur.payments ?? []).filter((x) => x.id !== p.id) } : cur))
        showToast(`Pagamento de ${fmtMoney(p.amount)} excluído`, {
          action: { label: 'Desfazer', onClick: () => undoDelete(installmentId, p) },
        })
      },
      onError: (e) => {
        setDeleting(null)
        fail('Erro ao excluir pagamento.')(e)
      },
    })
  }

  const history = payments.length > 0 && (
    <div className="lt-pay-hist">
      {readOnly ? (
        <div className="lt-pay-hist-count">{payments.length} {payments.length === 1 ? 'pagamento' : 'pagamentos'}</div>
      ) : (
        <button type="button" className="lt-hist-toggle" aria-expanded={histOpen} onClick={() => setHistOpen((o) => !o)}>
          <Icon name="clock" size={14} />
          <span style={{ flex: 1, textAlign: 'left' }}>
            {payments.length} {payments.length === 1 ? 'pagamento anterior' : 'pagamentos anteriores'} · {fmtMoney(paidCents / 100)}
          </span>
          <Icon name="chevronDown" size={15} style={{ transform: histOpen ? 'rotate(180deg)' : 'none', transition: 'transform var(--dur) var(--ease-std)' }} />
        </button>
      )}
      {histOpen && (
        <ul className="lt-hist-list">
          {payments.map((p) => (
            <li key={p.id} className="lt-hist-row">
              <span className="lt-hist-ok" aria-hidden="true"><Icon name="check" size={11} strokeWidth={3} /></span>
              <span style={{ flex: 1, fontWeight: 700, fontSize: '0.8125rem' }}>{fmtList(p.paidAt)}</span>
              <Money value={p.amount} size={13.5} color="var(--paid)" />
              <IconButton
                name="receipt"
                size={15}
                label={`Comprovante do pagamento de ${fmtMoney(p.amount)} de ${fmtList(p.paidAt)}`}
                onClick={() => setReceipt({ debtorId: t.debtor.id, paymentId: p.id })}
              />
              <IconButton
                name="trash"
                size={15}
                label={`Excluir pagamento de ${fmtMoney(p.amount)} de ${fmtList(p.paidAt)}`}
                onClick={() => deletePayment(p)}
                disabled={!!deleting}
                style={{ color: 'var(--overdue)' }}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  )

  return (
    <>
    <RemindSheet debtorId={remindId} onClose={() => setRemindId(null)} />
    <ReceiptSheet request={receipt} onClose={() => setReceipt(null)} />
    <BatchSheet debtorId={batchFrom?.debtorId ?? null} preselect={batchFrom?.installmentId} onClose={() => setBatchFrom(null)} />
    <Modal
      open={!!target}
      onClose={onClose}
      title={name}
      head={(titleId, close) => (
        <div className="lt-pay-head">
          <Avatar name={name} size={40} hue={t.debtor.avatarHue} emoji={t.debtor.avatarEmoji} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 id={titleId} className="lt-pay-name">
              <span className="lt-sr-only">{readOnly ? 'Pagamentos da parcela de ' : 'Registrar pagamento de '}</span>
              {name}
            </h2>
            {t.debtDescription && <div className="lt-pay-desc">{t.debtDescription}</div>}
            <div className="lt-pay-sub">
              {position && <>{/^\d/.test(position) ? `Parcela ${position}` : position.charAt(0).toUpperCase() + position.slice(1)} · </>}
              <span style={{ color: due.color }}>{due.text}</span>
            </div>
          </div>
          {canRemind && (
            <button type="button" className="lt-wa-mini" onClick={() => setRemindId(t.debtor.id)} aria-label={`Lembrar ${firstName(name)} no WhatsApp`} title="Lembrar no WhatsApp">
              <Icon name="whatsapp" size={16} />
            </button>
          )}
          <IconButton name="x" onClick={close} label="Fechar" />
        </div>
      )}
      footer={
        readOnly ? (
          <button type="button" className="lt-btn-lg" data-variant="secondary" onClick={onClose}>Fechar</button>
        ) : (
          <button type="button" className="lt-btn-lg" data-variant="primary" onClick={confirm} disabled={amount <= 0 || !date || register.isPending}>
            <Icon name="check" size={17} />
            {register.isPending ? 'Registrando…' : `${willPayOff ? 'Quitar parcela' : 'Registrar'}${amount > 0 ? ` · ${fmtMoney(amount / 100)}` : ''}`}
          </button>
        )
      }
    >
      <div className="lt-pay-body">
        {readOnly ? (
          <>
            <div className="lt-paid-box">
              <Icon name="check" size={18} strokeWidth={2.8} />
              <div>
                <div style={{ fontWeight: 800 }}>Parcela quitada</div>
                <div style={{ fontWeight: 700, fontSize: '0.75rem' }}>{fmtMoney(inst.amount)}</div>
              </div>
            </div>
            {history}
          </>
        ) : (
          <>
            <div className="lt-amt-box">
              <label className="lt-amt-input">
                <span className="lt-amt-cur" aria-hidden="true">R$</span>
                <input
                  value={formatCents(cents)}
                  onChange={(e) => setAmount(e.target.value)}
                  inputMode="numeric"
                  placeholder="0,00"
                  aria-label="Valor recebido"
                  // As wide as its digits, so "R$" stays next to the amount.
                  style={{ width: amountWidth(formatCents(cents)) }}
                />
              </label>
              <div className="lt-amt-chips">
                <button type="button" className="lt-chip" aria-pressed={amount === left} onClick={() => setCents(String(left))}>
                  Total {fmtMoney(left / 100)}
                </button>
                <button type="button" className="lt-chip" aria-pressed={amount === Math.round(left / 2)} onClick={() => setCents(String(Math.round(left / 2)))}>
                  Metade
                </button>
              </div>
              {amount > 0 && !willPayOff ? (
                <div className="lt-partial-note">
                  <Icon name="clock" size={13} />
                  <span>Pagamento parcial · restam <b>{fmtMoney((left - amount) / 100)}</b></span>
                </div>
              ) : paidCents > 0 ? (
                <Detail>
                  <div className="lt-paid-before">Já pago {fmtMoney(paidCents / 100)} de {fmtMoney(inst.amount)}</div>
                </Detail>
              ) : null}
            </div>

            <div className="lt-date-row" role="group" aria-label="Data do pagamento">
              <div style={{ minWidth: 0 }}>
                <div className="lt-date-k">Pago em</div>
                <div className="lt-date-v">{date ? fmtTitle(date) : '—'}</div>
              </div>
              <div className="lt-date-chips">
                <button type="button" className="lt-chip" aria-pressed={dateMode === 'today'} onClick={() => setDateMode('today')}>Hoje</button>
                <button type="button" className="lt-chip" aria-pressed={dateMode === 'yesterday'} onClick={() => setDateMode('yesterday')}>Ontem</button>
                {dateMode === 'other' ? (
                  <DateInput
                    compact
                    autoFocus
                    ariaLabel="Outra data do pagamento"
                    value={otherDate}
                    onChange={setOtherDate}
                    max={today}
                  />
                ) : (
                  <button type="button" className="lt-chip" onClick={() => { setOtherDate(addDays(today, -2)); setDateMode('other') }}>
                    <Icon name="calendar" size={14} /> Outra
                  </button>
                )}
              </div>
            </div>
            {openCount > 1 && (
              <button
                type="button"
                className="lt-more-link lt-pay-more"
                onClick={() => {
                  const from = { debtorId: t.debtor.id, installmentId: inst.id }
                  onClose()
                  setBatchFrom(from)
                }}
              >
                <Icon name="layers" size={13} /> Pagou mais de uma parcela? Receber em lote
              </button>
            )}
            {history}
          </>
        )}
      </div>
    </Modal>
    </>
  )
}
