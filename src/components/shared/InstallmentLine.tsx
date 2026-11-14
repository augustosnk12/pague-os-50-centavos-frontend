import { useRef, useState, type PointerEvent } from 'react'
import { Link } from 'react-router-dom'
import { Avatar } from '../ui/Avatar'
import { Icon } from '../ui/Icon'
import { Money } from '../ui/Money'
import { Detail } from '../../contexts/PreferencesContext'
import { installmentPosition, installmentTag, remainingCents, type TagTone } from '../../lib/installmentTag'
import { fmtList, fmtMoney } from '../../lib/format'
import type { InstallmentEnriched } from '../../types/installment'

const TONE: Record<TagTone, string> = {
  overdue: 'var(--overdue)',
  partial: 'var(--partial)',
  pending: 'var(--pending)',
  paid: 'var(--paid)',
  muted: 'var(--text-faint)',
}

/** Distance (px) a swipe must travel before letting go confirms it (improvement 27). */
const SWIPE_CONFIRM = 70
const SWIPE_MAX = 110

interface InstallmentLineProps {
  inst: InstallmentEnriched
  today: string
  onOpen: (inst: InstallmentEnriched) => void
  /** Show the due date when nothing more urgent is shown (off inside day groups). */
  showDate?: boolean
  /** Swipe right (touch) opens "Receber". The row's button does the same for everyone. */
  swipe?: boolean
  /** Swipe left (touch, overdue only) opens the WhatsApp reminder; the payment sheet has the same button. */
  onRemind?: () => void
  /** Paid rows: receipt of the last payment (improvement 37). */
  onReceipt?: (paymentId: string) => void
  /** Inside a debt card of the debtor profile: "Parcela 2/12" + due day, no avatar (S4). */
  inDebt?: boolean
}

/**
 * Compact installment row (improvements 4 and 31): the whole row opens the
 * payment sheet (one stretched button), the avatar opens the debtor. Amount
 * shown is what is still owed.
 */
export function InstallmentLine({ inst, today, onOpen, showDate = true, swipe = false, onRemind, onReceipt, inDebt = false }: InstallmentLineProps) {
  const debtor = inst.debt?.debtor
  const name = debtor?.name ?? 'Devedor'
  const debtorId = debtor?.id ?? inst.debt?.debtorId
  const left = remainingCents(inst)
  const paid = left === 0
  const lastPayment = inst.payments?.[inst.payments.length - 1]
  const tag = installmentTag(inst, today, { showDate })
  const position = installmentPosition(inst.number, inst.debt?.installmentCount, inst.debt?.recurrence)
  const value = paid ? Number(inst.amount) : left / 100
  const spokenPosition = position.startsWith('↻') ? 'mensal' : position.includes('/') ? `parcela ${position.replace('/', ' de ')}` : position

  // Touch swipe: follow the finger horizontally, confirm past SWIPE_CONFIRM.
  const [dx, setDx] = useState(0)
  const start = useRef<{ x: number; y: number; id: number; horizontal: boolean | null } | null>(null)
  const swiped = useRef(false)
  const canSwipe = swipe && !paid
  const canRemind = canSwipe && !!onRemind && tag?.tone === 'overdue'
  const onPointerDown = (e: PointerEvent<HTMLLIElement>) => {
    if (!canSwipe || e.pointerType !== 'touch') return
    start.current = { x: e.clientX, y: e.clientY, id: e.pointerId, horizontal: null }
  }
  const onPointerMove = (e: PointerEvent<HTMLLIElement>) => {
    const s = start.current
    if (!s || s.id !== e.pointerId) return
    const mx = e.clientX - s.x
    const my = e.clientY - s.y
    if (s.horizontal === null && Math.abs(mx) + Math.abs(my) > 8) s.horizontal = Math.abs(mx) > Math.abs(my)
    if (s.horizontal) setDx(Math.max(canRemind ? -SWIPE_MAX : 0, Math.min(SWIPE_MAX, mx)))
  }
  const onPointerEnd = () => {
    const receive = dx >= SWIPE_CONFIRM
    const remind = canRemind && dx <= -SWIPE_CONFIRM
    start.current = null
    setDx(0)
    if (receive || remind) swiped.current = true // the click that follows the gesture must not open it twice
    if (receive) onOpen(inst)
    if (remind) onRemind?.()
  }

  return (
    <li
      className="lt-lrow"
      data-paid={paid || undefined}
      data-swiping={dx !== 0 || undefined}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={() => {
        start.current = null
        setDx(0)
      }}
      style={canSwipe ? { touchAction: 'pan-y' } : undefined}
    >
      {canSwipe && dx >= 0 && (
        <div className="lt-sw-hint" aria-hidden="true" data-ready={dx >= SWIPE_CONFIRM || undefined}>
          <Icon name="wallet" size={16} /> Receber
        </div>
      )}
      {canRemind && dx < 0 && (
        <div className="lt-sw-hint" data-side="remind" aria-hidden="true" data-ready={dx <= -SWIPE_CONFIRM || undefined}>
          Cobrar <Icon name="whatsapp" size={16} />
        </div>
      )}
      <div className="lt-lrow-in" style={dx ? { transform: `translateX(${dx}px)` } : undefined}>
        <button
          type="button"
          className="lt-lrow-hit"
          onClick={() => {
            if (swiped.current) {
              swiped.current = false
              return
            }
            onOpen(inst)
          }}
          aria-label={[name, inst.debt?.description, spokenPosition, fmtMoney(value), tag?.spoken].filter(Boolean).join(', ') + (paid ? '. Ver pagamentos' : '. Registrar pagamento')}
        />
        {!inDebt &&
          (debtorId ? (
            <Link to={`/debtors/${debtorId}`} className="lt-av-btn" aria-label={`Abrir ${name}`}>
              <Avatar name={name} size={36} hue={debtor?.avatarHue} emoji={debtor?.avatarEmoji} />
            </Link>
          ) : (
            <Avatar name={name} size={36} hue={debtor?.avatarHue} emoji={debtor?.avatarEmoji} />
          ))}
        <div className="lt-lrow-main" aria-hidden="true">
          <div className="lt-lrow-name">{inDebt ? (position.startsWith('↻') ? `Mensalidade · ${fmtList(inst.dueDate)}` : `Parcela ${position.replace('parcela ', '')}`) : name}</div>
          <Detail>
            {inDebt ? (
              <div className="lt-lrow-sub">{fmtList(inst.dueDate)}</div>
            ) : (
              // A long description shrinks ("Empréstimo de ag…"); the position stays visible.
              <div className="lt-lrow-sub lt-lrow-what">
                {inst.debt?.description && <span className="lt-lrow-desc">{inst.debt.description}</span>}{' '}
                {position && <span className="lt-lrow-pos">{inst.debt?.description ? `· ${position}` : position}</span>}
              </div>
            )}
          </Detail>
        </div>
        <div className="lt-lrow-end" aria-hidden="true">
          <Money value={value} size={15} />
          {tag && (
            <div className="lt-lrow-tag" style={{ color: TONE[tag.tone] }}>
              {tag.text}
            </div>
          )}
        </div>
        {!paid && (
          <span className="lt-recv" aria-hidden="true">
            Receber
          </span>
        )}
        {paid && onReceipt && lastPayment && (
          <button
            type="button"
            className="lt-rcpt-btn"
            title="Comprovante"
            aria-label={`Comprovante: ${name}, ${spokenPosition}`}
            onClick={() => onReceipt(lastPayment.id)}
          >
            <Icon name="receipt" size={17} />
          </button>
        )}
      </div>
    </li>
  )
}
