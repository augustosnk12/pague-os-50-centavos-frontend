import type { ReactNode } from 'react'
import { Icon } from '../ui/Icon'
import { Money } from '../ui/Money'
import { ListRow, RowText } from '../ui/ListRow'

/**
 * A received payment (Recebimentos, payment timeline of the profile): ✓, what
 * it was, the amount in green and the receipt icon; the row opens the receipt.
 */
export function PaymentRow({ label, title, sub, amount, onClick }: { label: string; title: ReactNode; sub: ReactNode; amount: string | number; onClick: () => void }) {
  return (
    <ListRow label={label} onClick={onClick}>
      <span className="lt-hist-ok" style={{ width: 30, height: 30 }} aria-hidden="true"><Icon name="check" size={13} strokeWidth={2.8} /></span>
      <RowText title={title} sub={sub} />
      <span aria-hidden="true"><Money value={amount} size={14.5} color="var(--paid)" /></span>
      <span className="lt-rcpt-ic" aria-hidden="true"><Icon name="receipt" size={17} /></span>
    </ListRow>
  )
}
