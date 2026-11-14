import { useEffect, useState } from 'react'
import { Modal } from '../ui/Modal'
import { Avatar } from '../ui/Avatar'
import { Icon } from '../ui/Icon'
import { IconButton } from '../ui/IconButton'
import { PaidOnField } from './PaidOnField'
import { ReceiptSheet } from './ReceiptSheet'
import { useToast } from '../../contexts/ToastContext'
import { useDebtor } from '../../hooks/debtors/useDebtor'
import { useDebtsByDebtor } from '../../hooks/debts/useDebtsByDebtor'
import { usePaymentBatch, useUndoBatch } from '../../hooks/debtors/useDebtorActions'
import { allocate, batchCandidates, dueThisMonth, type BatchCandidate } from '../../lib/batch'
import { amountWidth, formatCents, parseCurrencyDigits } from '../../lib/currency'
import { localToday } from '../../lib/date'
import { fmtList, fmtMoney } from '../../lib/format'
import { installmentPosition } from '../../lib/installmentTag'
import { getApiError } from '../../lib/api'
import { translateApiError } from '../../lib/utils'
import type { ReceiptRequest } from '../../lib/receipt'

const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

interface BatchSheetProps {
  /** Whose installments; null closes the sheet. */
  debtorId: string | null
  /** Installment that must start selected (opened from its payment sheet). */
  preselect?: string | null
  onClose: () => void
}

/**
 * "Receber várias de uma vez" (S7, improvement 49): one amount for several
 * installments of a debtor, across all their debts. Opens with everything due
 * until the end of the month selected; the amount follows the selection and
 * can be edited (less = oldest first, the last one reached stays partial).
 * One batch (API B7): "Desfazer" undoes it all, and one receipt lists them.
 */
export function BatchSheet({ debtorId, preselect, onClose }: BatchSheetProps) {
  const today = localToday()
  const { showToast } = useToast()
  const batch = usePaymentBatch()
  const undo = useUndoBatch()

  // Keep the last debtor while the sheet plays its closing animation.
  const [lastId, setLastId] = useState(debtorId)
  if (debtorId && debtorId !== lastId) setLastId(debtorId)
  const id = debtorId ?? lastId ?? ''
  const { data: debtor } = useDebtor(id)
  const { data: debts } = useDebtsByDebtor(id)

  const [ready, setReady] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [cents, setCents] = useState('')
  const [edited, setEdited] = useState(false)
  const [showLater, setShowLater] = useState(false)
  const [date, setDate] = useState(today)
  const [receipt, setReceipt] = useState<ReceiptRequest | null>(null)

  useEffect(() => {
    if (!debtorId) setReady(false)
  }, [debtorId])

  const candidates = debts ? batchCandidates(debts, today) : []
  // Fresh state each time it opens: this month (and the installment it came from) selected.
  if (debtorId && debts && !ready) {
    const ids = new Set(candidates.filter((c) => dueThisMonth(c, today)).map((c) => c.inst.id))
    const from = candidates.find((c) => c.inst.id === preselect)
    if (from) ids.add(from.inst.id)
    setSelected(ids)
    setCents('')
    setEdited(false)
    setShowLater(!!from && !dueThisMonth(from, today))
    setDate(today)
    setReady(true)
  }

  if (!id) return <ReceiptSheet request={receipt} onClose={() => setReceipt(null)} />

  const name = debtor?.name ?? ''
  const now = candidates.filter((c) => dueThisMonth(c, today))
  const later = candidates.filter((c) => !dueThisMonth(c, today))
  const selTotal = candidates.filter((c) => selected.has(c.inst.id)).reduce((s, c) => s + c.left, 0)
  const amount = edited ? parseInt(cents || '0', 10) : selTotal
  const a = allocate(candidates, selected, amount)
  const count = a.amounts.size
  const ok = selected.size > 0 && amount > 0 && a.over === 0 && a.notCovered === 0 && !!date

  const summary =
    selected.size === 0
      ? 'Marque as parcelas que esse pagamento cobre'
      : a.over > 0
        ? `${fmtMoney(a.over / 100)} a mais do que as marcadas · marque mais parcelas`
        : amount === selTotal
          ? `Quita ${plural(a.full, 'parcela', 'parcelas')}`
          : [
              `Quita ${a.full}`,
              a.partial && `${a.partial.debt.description || 'Dívida'} fica parcial (restam ${fmtMoney((a.partial.left - (a.amounts.get(a.partial.inst.id) ?? 0)) / 100)})`,
              a.notCovered > 0 && `${a.notCovered} sem valor · desmarque ou aumente o valor`,
            ].filter(Boolean).join(' · ')
  const summaryColor = a.over > 0 || a.notCovered > 0 ? 'var(--overdue)' : selected.size ? 'var(--paid)' : 'var(--text-muted)'

  const toggle = (instId: string) =>
    setSelected((s) => {
      const next = new Set(s)
      if (next.has(instId)) next.delete(instId)
      else next.add(instId)
      return next
    })
  /** "Marcar todas" / "Desmarcar todas" of one group (this month, or later). */
  const groupToggle = (group: BatchCandidate[], where: string) => {
    const all = group.every((c) => selected.has(c.inst.id))
    return (
      <button
        type="button"
        className="lt-more-link lt-bt-all"
        aria-label={`${all ? 'Desmarcar' : 'Marcar'} todas ${where}`}
        onClick={() =>
          setSelected((s) => {
            const next = new Set(s)
            for (const c of group) {
              if (all) next.delete(c.inst.id)
              else next.add(c.inst.id)
            }
            return next
          })
        }
      >
        {all ? 'Desmarcar todas' : 'Marcar todas'}
      </button>
    )
  }
  const month = MONTHS[Number(today.slice(5, 7)) - 1]
  const laterOn = later.filter((c) => selected.has(c.inst.id)).length

  const fail = (fallback: string) => (e: unknown) => showToast(translateApiError(getApiError(e), fallback), { icon: 'alert' })

  const confirm = () => {
    if (!ok || batch.isPending) return
    const allocations = [...a.amounts].map(([installmentId, c]) => ({ installmentId, amount: c / 100 }))
    batch.mutate({ debtorId: id, kind: 'BATCH', paidAt: date, allocations }, {
      onSuccess: (r) => {
        onClose()
        showToast(`${fmtMoney(amount / 100)} registrados em ${plural(allocations.length, 'parcela', 'parcelas')}`, {
          icon: 'check',
          status: 'PAID',
          action: {
            label: 'Desfazer',
            onClick: () => undo.mutate(r.batchId, { onSuccess: () => showToast('Pagamentos desfeitos'), onError: fail('Não foi possível desfazer.') }),
          },
          secondary: r.payments[0] ? { label: 'Comprovante', onClick: () => setReceipt({ debtorId: id, paymentId: r.payments[0].id }) } : undefined,
        })
      },
      onError: fail('Erro ao registrar os pagamentos.'),
    })
  }

  const row = (c: BatchCandidate) => {
    const on = selected.has(c.inst.id)
    const got = a.amounts.get(c.inst.id) ?? 0
    const title = `${c.debt.description || 'Dívida'} · ${installmentPosition(c.inst.number, c.debt.installments.length, c.debt.recurrence)}`
    const due = `${c.late ? 'venceu' : 'vence'} ${fmtList(c.inst.dueDate)}`
    const tag = !on ? null : !got ? <span style={{ color: 'var(--text-muted)' }}>não coberta</span> : got === c.left ? <span style={{ color: 'var(--paid)' }}>Quita</span> : <span style={{ color: 'var(--partial)' }}>Parcial · {fmtMoney(got / 100)}</span>
    return (
      <li key={c.inst.id}>
        <button
          type="button"
          role="checkbox"
          aria-checked={on}
          className="lt-bt-row"
          onClick={() => toggle(c.inst.id)}
          aria-label={`${title}, ${due}, ${fmtMoney(c.left / 100)}${c.late ? ', atrasada' : ''}`}
        >
          <span className="lt-check" aria-hidden="true">{on && <Icon name="check" size={13} strokeWidth={3} />}</span>
          <span className="lt-bt-main">
            <span className="lt-bt-t">{title}</span>
            <span className="lt-bt-s" data-late={c.late || undefined}>{due}</span>
          </span>
          <span className="lt-bt-right">
            <span className="lt-bt-v">{fmtMoney(c.left / 100)}</span>
            <span className="lt-bt-tag">{tag}</span>
          </span>
        </button>
      </li>
    )
  }

  return (
    <>
      <ReceiptSheet request={receipt} onClose={() => setReceipt(null)} />
      <Modal
        open={!!debtorId}
        onClose={onClose}
        title={`Receber várias parcelas de ${name}`}
        head={(titleId, close) => (
          <div className="lt-pay-head">
            {debtor && <Avatar name={name} size={40} hue={debtor.avatarHue} emoji={debtor.avatarEmoji} />}
            <div style={{ flex: 1, minWidth: 0 }}>
              <h2 id={titleId} className="lt-pay-name">
                <span className="lt-sr-only">Receber várias parcelas de </span>
                {name}
              </h2>
              <div className="lt-pay-sub">Um pagamento para várias parcelas</div>
            </div>
            <IconButton name="x" onClick={close} label="Fechar" />
          </div>
        )}
        footer={
          <button type="button" className="lt-btn-lg" data-variant="primary" onClick={confirm} disabled={!ok || batch.isPending}>
            <Icon name="check" size={17} />
            {batch.isPending ? 'Registrando…' : count > 0 && amount > 0 ? `Registrar ${fmtMoney(amount / 100)} em ${plural(count, 'parcela', 'parcelas')}` : 'Registrar'}
          </button>
        }
      >
        {!ready ? (
          <div className="lt-skel" style={{ height: 180, borderRadius: 16 }} aria-busy="true" />
        ) : (
          <div className="lt-pay-body">
            <div>
              <div className="lt-bt-label">
                <span>Até o fim de {month}</span>
                {now.length > 1 && groupToggle(now, `até o fim de ${month}`)}
              </div>
              {now.length ? (
                <ul className="lt-lgroup lt-bt-list" aria-label="Parcelas até o fim do mês">{now.map(row)}</ul>
              ) : (
                <p className="lt-bt-empty">Nada vence este mês.</p>
              )}
              {later.length > 0 && (
                <>
                  <div className="lt-bt-label lt-bt-later">
                    <button type="button" className="lt-more-link" aria-expanded={showLater} onClick={() => setShowLater((v) => !v)}>
                      Mais adiante · {later.length}
                      {laterOn > 0 && <span className="lt-bt-on">({laterOn} {laterOn === 1 ? 'marcada' : 'marcadas'})</span>}
                      <Icon name="chevronDown" size={13} style={showLater ? { transform: 'rotate(180deg)' } : undefined} />
                    </button>
                    {showLater && later.length > 1 && groupToggle(later, 'mais adiante')}
                  </div>
                  {showLater && <ul className="lt-lgroup lt-bt-list" aria-label="Próximos meses">{later.map(row)}</ul>}
                </>
              )}
            </div>

            <div className="lt-amt-box">
              <div className="lt-bt-k">Valor recebido</div>
              <label className="lt-amt-input">
                <span className="lt-amt-cur" aria-hidden="true">R$</span>
                <input
                  value={formatCents(amount ? String(amount) : '')}
                  onChange={(e) => {
                    setEdited(true)
                    setCents(parseCurrencyDigits(e.target.value))
                  }}
                  inputMode="numeric"
                  placeholder="0,00"
                  aria-label="Valor recebido"
                  aria-describedby="lt-bt-sum"
                  style={{ width: amountWidth(formatCents(amount ? String(amount) : '')) }}
                />
              </label>
              <div className="lt-amt-chips">
                {edited && amount !== selTotal ? (
                  <button type="button" className="lt-chip" onClick={() => setEdited(false)}>
                    Usar o total das marcadas {fmtMoney(selTotal / 100)}
                  </button>
                ) : (
                  selected.size > 0 && <span className="lt-bt-k">Total das marcadas: {fmtMoney(selTotal / 100)}</span>
                )}
              </div>
              <div id="lt-bt-sum" className="lt-bt-sum" role="status" style={{ color: summaryColor }}>{summary}</div>
            </div>

            {debtorId && <PaidOnField key={debtorId} today={today} onChange={setDate} />}
          </div>
        )}
      </Modal>
    </>
  )
}
