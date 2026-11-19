import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Icon } from '../../components/ui/Icon'
import { Money } from '../../components/ui/Money'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { DateInput } from '../../components/ui/DateInput'
import { EmptyState } from '../../components/ui/EmptyState'
import { ErrorState } from '../../components/ui/ErrorState'
import { ReceiptSheet } from '../../components/shared/ReceiptSheet'
import { useToast } from '../../contexts/ToastContext'
import { fetchAllPayments, usePaymentsSummary, useRecentPayments } from '../../hooks/payments/usePaymentsReport'
import type { ReceiptRequest } from '../../lib/receipt'
import { localToday } from '../../lib/date'
import { fmtList, fmtMoney } from '../../lib/format'
import { backLabel } from '../../lib/navOrigin'
import {
  initialPeriod,
  monthLabel,
  periodBounds,
  periodInvalid,
  periodLabel,
  PERIODS,
  receivablesCsv,
  receivablesFileName,
  type PeriodChoice,
} from '../../lib/receivables'

const SHOWN = 8
const plural = (n: number) => `${n} pagamento${n === 1 ? '' : 's'}`

/** The four period buttons + the two dates of "Período" (screen and export sheet). */
function PeriodPicker({ value, onChange, today, idPrefix }: { value: PeriodChoice; onChange: (p: PeriodChoice) => void; today: string; idPrefix: string }) {
  const bad = periodInvalid(value)
  return (
    <>
      <div className="lt-seg" role="radiogroup" aria-label="Período">
        {PERIODS.map((p) => (
          <button key={p.id} type="button" role="radio" aria-checked={value.kind === p.id} onClick={() => value.kind !== p.id && onChange({ ...value, kind: p.id })}>
            {p.label}
          </button>
        ))}
      </div>
      {value.kind === 'range' && (
        <>
          <div className="lt-rep-range" id={`${idPrefix}-range`}>
            <DateInput label="De" value={value.from} max={today} onChange={(from) => onChange({ ...value, from })} />
            <DateInput label="Até" value={value.to} max={today} onChange={(to) => onChange({ ...value, to })} />
          </div>
          {bad && <div className="lt-rep-bad" role="alert">⚠ A data inicial é depois da final</div>}
        </>
      )}
    </>
  )
}

/** "Exportar planilha": its own period (starts as the screen's) and a CSV of every payment in it. */
function ExportSheet({ open, start, onClose }: { open: boolean; start: PeriodChoice; onClose: () => void }) {
  const today = localToday()
  const { showToast } = useToast()
  const [p, setP] = useState(start)
  const [busy, setBusy] = useState(false)
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) setP(start)
  }
  const bounds = periodBounds(p, today)
  const summary = usePaymentsSummary(bounds, today, { enabled: open })
  const s = bounds ? summary.data : undefined
  const bad = periodInvalid(p)

  const go = async () => {
    if (!bounds || busy) return
    setBusy(true)
    try {
      const rows = await fetchAllPayments(bounds)
      if (!rows.length) return
      const name = receivablesFileName(p, rows)
      const url = URL.createObjectURL(new Blob([receivablesCsv(rows)], { type: 'text/csv;charset=utf-8' }))
      const a = document.createElement('a')
      a.href = url
      a.download = name
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      onClose()
      showToast(`${name} · ${plural(rows.length)}`, { icon: 'check' })
    } catch {
      showToast('Não foi possível exportar agora. Tente de novo.', { icon: 'alert' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Exportar planilha"
      footer={
        <button type="button" className="lt-btn-lg" data-variant="primary" onClick={() => void go()} disabled={busy || !s || s.count === 0}>
          <Icon name="export" size={16} /> {busy ? 'Preparando…' : 'Exportar CSV'}
        </button>
      }
    >
      <div className="lt-df" style={{ gap: 12 }}>
        <PeriodPicker value={p} onChange={setP} today={today} idPrefix="csv" />
        {!bad && (
          <div className="lt-rep-sum" aria-live="polite">
            {!bounds ? 'Escolha as datas' : s ? `${plural(s.count)} · ${fmtMoney(s.total)}` : 'Contando…'}
          </div>
        )}
        <p className="lt-set-note" style={{ margin: 0, textAlign: 'center' }}>Data, devedor, dívida, parcela e valor. Abre no Excel e no Google Planilhas.</p>
      </div>
    </Modal>
  )
}

/**
 * Recebimentos (S12, improvement 38): how much came in over a period, one bar
 * per month, the latest payments (each opens its receipt) and the CSV export.
 */
export function ReceivablesPage() {
  const today = localToday()
  const navigate = useNavigate()
  const location = useLocation()
  const [period, setPeriod] = useState(() => initialPeriod(today))
  const [exportOpen, setExportOpen] = useState(false)
  const [receipt, setReceipt] = useState<ReceiptRequest | null>(null)

  const bounds = periodBounds(period, today)
  const summary = usePaymentsSummary(bounds, today)
  const recent = useRecentPayments(bounds, SHOWN)
  const s = bounds ? summary.data : undefined
  const rows = bounds ? recent.data : undefined

  // "‹ Configurações", "‹ Painel"…: where Voltar goes (improvement 24).
  const hasHistory = location.key !== 'default' && !!(window.history.state as { idx?: number } | null)?.idx
  const origin = hasHistory ? backLabel() : 'Configurações'
  const back = () => (hasHistory ? navigate(-1) : navigate('/settings'))

  const year = Number(today.slice(0, 4))
  const months = s?.months ?? []
  const max = Math.max(1, ...months.map((m) => Number(m.total)))
  const failed = (summary.isError && !summary.data) || (recent.isError && !recent.data)

  return (
    <main className="lt-page lt-rep">
      <button type="button" className="lt-back" onClick={back} aria-label={`Voltar para ${origin ?? 'a tela anterior'}`}>
        <Icon name="chevronLeft" size={17} /> {origin ?? 'Voltar'}
      </button>
      <div className="lt-rep-head">
        <h1 className="lt-h1">Recebimentos</h1>
        <Button variant="secondary" size="sm" icon="export" onClick={() => setExportOpen(true)}>
          <span aria-hidden="true">Exportar</span>
          <span className="lt-sr-only">Exportar planilha (CSV) do período</span>
        </Button>
      </div>
      <p className="lt-sub">{periodLabel(period, period.kind === 'all' ? (s?.months[0]?.month ?? null) : null)}</p>

      <PeriodPicker value={period} onChange={setPeriod} today={today} idPrefix="rep" />

      {!bounds ? null : failed ? (
        <ErrorState
          onRetry={() => {
            void summary.refetch()
            void recent.refetch()
          }}
          retrying={summary.isFetching || recent.isFetching}
        />
      ) : !s || !rows ? (
        <>
          <div className="lt-skel" style={{ height: 180, borderRadius: 16 }} aria-busy="true" />
          <div className="lt-skel" style={{ height: 200, borderRadius: 16, marginTop: 18 }} aria-hidden="true" />
        </>
      ) : (
        <>
          <section className="lt-set-card lt-rep-card" aria-label="Resumo do período">
            <div className="lt-rep-k">Total recebido</div>
            <div style={{ margin: '2px 0' }}><Money value={s.total} size={26} /></div>
            <div className="lt-rep-n">
              {plural(s.count)}
              {months.length > 1 ? ` · média de ${fmtMoney(s.averagePerMonth)} por mês` : ''}
            </div>
            {months.length > 1 && (
              <ul className="lt-rep-bars" aria-label="Recebido por mês">
                {months.map((m) => (
                  <li key={m.month} className="lt-rep-row">
                    <span className="lt-rep-m">{monthLabel(m.month, year)}</span>
                    <span className="lt-rep-bar" aria-hidden="true"><span style={{ width: `${(Number(m.total) / max) * 100}%` }} /></span>
                    <span className="lt-rep-v">{fmtMoney(m.total)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <h2 className="lt-set-h">{s.count > SHOWN ? 'Últimos pagamentos do período' : 'Pagamentos do período'}</h2>
          {rows.length ? (
            <>
              <ul className="lt-lgroup" aria-label="Pagamentos do período">
                {rows.map((p) => {
                  const debt = p.debtDescription || 'Dívida'
                  return (
                    <li key={p.id} className="lt-lrow">
                      <div className="lt-lrow-in">
                        <button
                          type="button"
                          className="lt-lrow-hit"
                          onClick={() => setReceipt({ debtorId: p.debtorId, paymentId: p.id })}
                          aria-label={`Comprovante: ${p.debtorName}, ${debt}, ${fmtMoney(p.amount)} em ${fmtList(p.paidAt)}`}
                        />
                        <span className="lt-hist-ok" style={{ width: 30, height: 30 }} aria-hidden="true"><Icon name="check" size={13} strokeWidth={2.8} /></span>
                        <div className="lt-lrow-main" aria-hidden="true">
                          <div className="lt-lrow-name lt-ellipsis">{p.debtorName}</div>
                          <div className="lt-lrow-sub lt-ellipsis">{debt} · {fmtList(p.paidAt)}</div>
                        </div>
                        <span aria-hidden="true"><Money value={p.amount} size={14.5} color="var(--paid)" /></span>
                        <span className="lt-rcpt-ic" aria-hidden="true"><Icon name="receipt" size={17} /></span>
                      </div>
                    </li>
                  )
                })}
              </ul>
              {s.count > SHOWN && <p className="lt-rep-more">e mais {s.count - SHOWN} no período · todos vão na exportação</p>}
            </>
          ) : (
            <EmptyState icon="history" title="Nenhum pagamento no período" sub="Escolha outro período acima." />
          )}
        </>
      )}

      <ExportSheet open={exportOpen} start={period} onClose={() => setExportOpen(false)} />
      <ReceiptSheet request={receipt} onClose={() => setReceipt(null)} />
    </main>
  )
}
