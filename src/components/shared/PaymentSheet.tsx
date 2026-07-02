import { useState, useEffect, useRef } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { DateInput } from '../ui/DateInput'
import { Money } from '../ui/Money'
import { Icon } from '../ui/Icon'
import { fmtDate, money } from '../../lib/utils'
import { formatCents, parseCurrencyDigits } from '../../lib/currency'
import type { Installment } from '../../types/installment'
import type { Payment } from '../../types/payment'

interface PaymentSheetContext {
  installment: Installment
  debtorName: string
  debtDescription: string | null
}

interface PaymentSheetProps {
  open: boolean
  onClose: () => void
  context: PaymentSheetContext | null
  onConfirm: (installmentId: string, amount: number, paidAt: string) => void
  onDeletePayment?: (installmentId: string, paymentId: string) => void
  deletingPaymentId?: string
  loading?: boolean
}

function toCents(brl: number): string {
  return String(Math.round(brl * 100))
}

function todayISO(): string {
  const n = new Date()
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`
}

interface SummaryStatProps {
  label: string
  value: number
  color?: string
  big?: boolean
}

function SummaryStat({ label, value, color, big }: SummaryStatProps) {
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 12, color: 'var(--text-faint)', fontWeight: 700, marginBottom: 3, whiteSpace: 'nowrap' }}>{label}</div>
      <Money value={value} size={big ? 22 : 17} weight={800} color={color} />
    </div>
  )
}

function QuickChip({ children, active, onClick, disabled }: { children: React.ReactNode; active: boolean; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      style={{
        padding: '5px 12px', borderRadius: 99, cursor: disabled ? 'not-allowed' : 'pointer',
        fontWeight: 700, fontSize: 12.5, fontFamily: 'inherit',
        border: `1.5px solid ${active ? 'var(--primary)' : 'var(--border)'}`,
        background: active ? 'var(--primary)' : 'var(--surface)',
        color: active ? 'var(--on-primary)' : 'var(--text-muted)',
        opacity: disabled ? 0.5 : 1, transition: 'all .15s',
      }}
    >
      {children}
    </button>
  )
}

interface PaymentHistoryRowProps {
  payment: Payment
  index: number
  onDelete?: () => void
  isDeleting?: boolean
}

function PaymentHistoryRow({ payment, index, onDelete, isDeleting }: PaymentHistoryRowProps) {
  const [removing, setRemoving] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const deletingStarted = useRef(false)

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [])

  useEffect(() => {
    if (isDeleting) {
      deletingStarted.current = true
    } else if (deletingStarted.current && removing) {
      deletingStarted.current = false
      setRemoving(false)
    }
  }, [isDeleting, removing])

  function handleDelete() {
    if (removing || isDeleting) return
    setRemoving(true)
    timerRef.current = setTimeout(() => onDelete?.(), 240)
  }

  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '9px 0',
        borderTop: '1px solid var(--border)', overflow: 'hidden',
        animation: removing ? 'ltSwipeOut .24s cubic-bezier(0.4,0,1,1) forwards' : 'none',
      }}
    >
      <span style={{ width: 26, height: 26, borderRadius: 8, background: 'var(--paid-weak)', color: 'var(--paid)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
        <Icon name="check" size={14} strokeWidth={2.8} />
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 700 }}>{fmtDate(payment.paidAt)}</div>
        <div style={{ fontSize: 11.5, color: 'var(--text-faint)', fontWeight: 600 }}>{index + 1}º pagamento</div>
      </div>
      <Money value={Number(payment.amount)} size={15} weight={800} color="var(--paid)" />
      {onDelete && (
        <button
          type="button"
          onClick={handleDelete}
          disabled={removing || isDeleting}
          aria-label="Excluir pagamento"
          style={{
            flexShrink: 0, display: 'grid', placeItems: 'center',
            width: 30, height: 30, borderRadius: 8, border: 'none',
            background: 'transparent', cursor: removing || isDeleting ? 'not-allowed' : 'pointer',
            color: 'var(--overdue)', transition: 'background .15s',
            opacity: isDeleting ? 0.4 : 1,
          }}
          onMouseEnter={(e) => { if (!removing && !isDeleting) e.currentTarget.style.background = 'var(--overdue-weak)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
        >
          <Icon name="trash" size={15} />
        </button>
      )}
    </div>
  )
}

export function PaymentSheet({ open, onClose, context, onConfirm, onDeletePayment, deletingPaymentId, loading }: PaymentSheetProps) {
  const inst = context?.installment ?? null
  const fullAmount = inst ? Number(inst.amount) : 0
  const alreadyPaid = inst ? Number(inst.paidAmount ?? '0') : 0
  const remainingBefore = Math.max(0, Math.round((fullAmount - alreadyPaid) * 100) / 100)
  const payments: Payment[] = inst?.payments ?? []

  const [amountCents, setAmountCents] = useState('')
  const [dateISO, setDateISO] = useState('')
  const [err, setErr] = useState('')
  const [quick, setQuick] = useState<'half' | 'total' | 'custom'>('total')
  const [histOpen, setHistOpen] = useState(false)

  useEffect(() => {
    if (open && inst) {
      setAmountCents(toCents(remainingBefore))
      setDateISO(todayISO())
      setErr('')
      setQuick('total')
    }
  }, [open, inst?.id, inst?.paidAmount])

  useEffect(() => {
    if (open && inst) {
      setHistOpen(remainingBefore <= 0)
    }
  }, [open, inst?.id])

  if (!context || !inst) return null

  const amount = parseInt(amountCents || '0', 10) / 100
  const remainingAfter = Math.max(0, Math.round((remainingBefore - amount) * 100) / 100)
  const willFullyPay = amount > 0 && amount >= remainingBefore - 0.005
  const overpay = amount > remainingBefore + 0.005
  const readOnly = remainingBefore <= 0

  function setHalf() {
    setAmountCents(toCents(Math.round(remainingBefore / 2 * 100) / 100))
    setQuick('half'); setErr('')
  }
  function setTotal() {
    setAmountCents(toCents(remainingBefore)); setQuick('total'); setErr('')
  }
  function handleAmountChange(v: string) {
    const digits = parseCurrencyDigits(v)
    const remainingCents = Math.round(remainingBefore * 100)
    const capped = parseInt(digits || '0', 10) > remainingCents ? String(remainingCents) : digits
    setAmountCents(capped)
    setQuick('custom')
    setErr('')
  }

  function handleConfirm() {
    if (!inst) return
    if (!(amount > 0)) return setErr('Informe um valor maior que zero.')
    if (overpay) return setErr(`O valor não pode ser maior que o restante (${money(remainingBefore)}).`)
    if (!dateISO) return setErr('Informe a data do pagamento.')
    onConfirm(inst.id, amount, dateISO)
  }

  const title = readOnly ? 'Pagamentos da parcela' : 'Registrar pagamento'

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        readOnly ? (
          <Button full size="lg" variant="secondary" onClick={onClose}>Fechar</Button>
        ) : (
          <>
            <Button variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button full size="lg" icon="check" onClick={handleConfirm} disabled={loading}>
              {loading ? 'Registrando…' : willFullyPay ? 'Quitar parcela' : 'Registrar'}
            </Button>
          </>
        )
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 2 }}>
        {/* Balance summary */}
        <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '15px 16px' }}>
          <div style={{ display: 'flex', gap: 12 }}>
            <SummaryStat label="Valor da parcela" value={fullAmount} color="var(--text)" />
            <div style={{ width: 1, background: 'var(--border)' }} />
            <SummaryStat label="Já pago" value={alreadyPaid} color={alreadyPaid > 0 ? 'var(--paid)' : 'var(--text-muted)'} />
            <div style={{ width: 1, background: 'var(--border)' }} />
            <SummaryStat label="Restante" value={remainingBefore} color={remainingBefore > 0 ? 'var(--overdue)' : 'var(--paid)'} />
          </div>

        </div>

        {/* Payment history accordion */}
        {payments.length > 0 && (
          <div style={{ border: '1px solid var(--border)', borderRadius: 'calc(var(--radius)*0.7)', overflow: 'hidden' }}>
            <button
              type="button"
              onClick={() => setHistOpen((o) => !o)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 9, padding: '12px 14px',
                background: histOpen ? 'var(--surface-2)' : 'var(--surface)',
                border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', transition: 'background .15s',
              }}
            >
              <Icon name="clock" size={16} color="var(--text-muted)" />
              <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text)' }}>Histórico de pagamentos</span>
              <span style={{ fontSize: 11.5, fontWeight: 800, color: 'var(--paid)', background: 'var(--paid-weak)', padding: '1px 8px', borderRadius: 99 }}>
                {payments.length}
              </span>
              <span style={{ flex: 1 }} />
              <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-muted)' }}>{money(alreadyPaid)}</span>
              <Icon name="chevronDown" size={16} color="var(--text-faint)" style={{ transform: histOpen ? 'rotate(180deg)' : 'none', transition: 'transform .25s' }} />
            </button>
            {histOpen && (
              <div style={{ padding: '4px 14px 10px', maxHeight: 220, overflowY: 'auto' }}>
                {payments.map((p, i) => (
                  <PaymentHistoryRow
                    key={p.id}
                    payment={p}
                    index={i}
                    onDelete={onDeletePayment ? () => onDeletePayment(inst.id, p.id) : undefined}
                    isDeleting={deletingPaymentId === p.id}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Amount input */}
        {!readOnly && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }}>
              <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-muted)' }}>
                Valor recebido <span style={{ color: 'var(--primary)' }}>*</span>
              </span>
              <div style={{ display: 'flex', gap: 6 }}>
                <QuickChip active={quick === 'half'} onClick={setHalf} disabled={remainingBefore <= 0}>Metade</QuickChip>
                <QuickChip active={quick === 'total'} onClick={setTotal} disabled={remainingBefore <= 0}>Total</QuickChip>
              </div>
            </div>
            <Input
              value={formatCents(amountCents)}
              onChange={handleAmountChange}
              placeholder="0,00"
              prefix="R$"
              inputMode="numeric"
              error={err}
            />
          </div>
        )}

        {/* Date input */}
        {!readOnly && (
          <DateInput label="Data do pagamento" value={dateISO} onChange={setDateISO} required />
        )}

        {/* Live result preview */}
        {!readOnly && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 11,
            background: willFullyPay ? 'var(--paid-weak)' : 'var(--partial-weak)',
            borderRadius: 'calc(var(--radius)*0.7)', padding: '13px 15px',
          }}>
            <span style={{
              width: 34, height: 34, borderRadius: 10,
              background: willFullyPay ? 'var(--paid)' : 'var(--partial)',
              display: 'grid', placeItems: 'center', flexShrink: 0,
            }}>
              <Icon name={willFullyPay ? 'check' : 'clock'} size={18} color="#fff" strokeWidth={2.6} />
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 800, fontSize: 14, color: willFullyPay ? 'var(--paid)' : 'var(--partial)' }}>
                {amount <= 0 ? 'Informe um valor' : willFullyPay ? 'Parcela será quitada' : 'Pagamento parcial'}
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--text-muted)', fontWeight: 600 }}>
                {amount > 0 && !willFullyPay
                  ? <>Restante após: <b style={{ color: 'var(--text)' }}>{money(remainingAfter)}</b></>
                  : willFullyPay
                  ? 'Nada mais a receber nesta parcela'
                  : ' '}
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
