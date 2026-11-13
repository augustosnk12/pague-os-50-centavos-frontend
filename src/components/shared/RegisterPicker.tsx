import { useMemo, useState } from 'react'
import { Modal } from '../ui/Modal'
import { Icon } from '../ui/Icon'
import { ListGroup } from '../ui/ListGroup'
import { InstallmentLine } from './InstallmentLine'
import { PaymentSheet } from './PaymentSheet'
import { useInstallmentsPeriod } from '../../hooks/installments/useInstallmentsPeriod'
import { localToday } from '../../lib/date'
import { remainingCents, daysUntil } from '../../lib/installmentTag'
import { paymentTarget, type PaymentTarget } from '../../lib/paymentTarget'
import type { InstallmentEnriched } from '../../types/installment'

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

interface RegisterPickerProps {
  open: boolean
  onClose: () => void
}

/**
 * "Registrar pagamento" (improvements 28 and 29): every open installment of
 * this month and every overdue one, overdue first, with a filter by name or
 * debt; picking one opens the payment sheet.
 */
export function RegisterPicker({ open, onClose }: RegisterPickerProps) {
  const today = localToday()
  const [q, setQ] = useState('')
  const [target, setTarget] = useState<PaymentTarget | null>(null)
  const query = useInstallmentsPeriod({ period: 'month', date: today, today })

  const list = useMemo(() => {
    const open = (query.data ?? []).filter((i) => remainingCents(i) > 0)
    const term = norm(q.trim())
    const match = (i: InstallmentEnriched) => !term || norm(`${i.debt?.debtor?.name ?? ''} ${i.debt?.description ?? ''}`).includes(term)
    const late = (i: InstallmentEnriched) => daysUntil(i.dueDate, today) < 0
    return open
      .filter(match)
      .sort((a, b) => Number(late(b)) - Number(late(a)) || (a.dueDate < b.dueDate ? -1 : a.dueDate > b.dueDate ? 1 : 0))
  }, [query.data, q, today])

  const close = () => {
    setQ('')
    onClose()
  }

  return (
    <>
      <Modal open={open} onClose={close} title="Registrar pagamento">
        <div className="lt-search-field">
          <Icon name="search" size={17} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nome ou dívida…" aria-label="Buscar parcela por nome ou dívida" />
        </div>
        {query.isLoading ? (
          <div aria-busy="true">
            <span className="lt-sr-only">Carregando parcelas…</span>
            <div className="lt-skel" style={{ height: 160, borderRadius: 16 }} />
          </div>
        ) : list.length ? (
          <div className="lt-pick-scroll">
            <ListGroup label="Parcelas em aberto">
              {list.map((i) => (
                <InstallmentLine
                  key={i.id}
                  inst={i}
                  today={today}
                  onOpen={(inst) => {
                    setTarget(paymentTarget(inst))
                    close()
                  }}
                />
              ))}
            </ListGroup>
          </div>
        ) : (
          <p className="lt-pick-empty">{q.trim() ? 'Nenhuma parcela em aberto com esse nome.' : 'Nada em aberto neste mês. 🎉'}</p>
        )}
      </Modal>
      <PaymentSheet target={target} onClose={() => setTarget(null)} />
    </>
  )
}
