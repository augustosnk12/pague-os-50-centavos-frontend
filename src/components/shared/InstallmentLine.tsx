import { Link } from 'react-router-dom'
import { Avatar } from '../ui/Avatar'
import { Money } from '../ui/Money'
import { Detail } from '../../contexts/PreferencesContext'
import { installmentPosition, installmentTag, remainingCents, type TagTone } from '../../lib/installmentTag'
import { fmtMoney } from '../../lib/format'
import type { InstallmentEnriched } from '../../types/installment'

const TONE: Record<TagTone, string> = {
  overdue: 'var(--overdue)',
  partial: 'var(--partial)',
  pending: 'var(--pending)',
  paid: 'var(--paid)',
  muted: 'var(--text-faint)',
}

interface InstallmentLineProps {
  inst: InstallmentEnriched
  today: string
  onOpen: (inst: InstallmentEnriched) => void
  showDate?: boolean
}

/**
 * Compact installment row (improvements 4 and 31): the whole row opens the
 * payment sheet (one stretched button), the avatar opens the debtor. Amount
 * shown is what is still owed.
 */
export function InstallmentLine({ inst, today, onOpen, showDate = true }: InstallmentLineProps) {
  const debtor = inst.debt?.debtor
  const name = debtor?.name ?? 'Devedor'
  const debtorId = debtor?.id ?? inst.debt?.debtorId
  const left = remainingCents(inst)
  const paid = left === 0
  const tag = installmentTag(inst, today, { showDate })
  const position = installmentPosition(inst.number, inst.debt?.installmentCount, inst.debt?.recurrence)
  const what = [inst.debt?.description, position].filter(Boolean).join(' · ')
  const value = paid ? Number(inst.amount) : left / 100
  const spokenPosition = position.startsWith('↻') ? 'mensal' : position.includes('/') ? `parcela ${position.replace('/', ' de ')}` : position

  return (
    <li className="lt-lrow" data-paid={paid || undefined}>
      <button
        type="button"
        className="lt-lrow-hit"
        onClick={() => onOpen(inst)}
        aria-label={[name, inst.debt?.description, spokenPosition, fmtMoney(value), tag?.spoken].filter(Boolean).join(', ') + (paid ? '. Ver pagamentos' : '. Registrar pagamento')}
      />
      {debtorId ? (
        <Link to={`/debtors/${debtorId}`} className="lt-av-btn" aria-label={`Abrir ${name}`}>
          <Avatar name={name} size={36} hue={debtor?.avatarHue} emoji={debtor?.avatarEmoji} />
        </Link>
      ) : (
        <Avatar name={name} size={36} hue={debtor?.avatarHue} emoji={debtor?.avatarEmoji} />
      )}
      <div className="lt-lrow-main" aria-hidden="true">
        <div className="lt-lrow-name">{name}</div>
        <Detail>
          <div className="lt-lrow-sub">{what}</div>
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
    </li>
  )
}
