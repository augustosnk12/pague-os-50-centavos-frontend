import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ErrorState } from '../../components/ui/ErrorState'
import { EmptyState } from '../../components/ui/EmptyState'
import { Icon } from '../../components/ui/Icon'
import { Money } from '../../components/ui/Money'
import { GroupLabel, ListGroup } from '../../components/ui/ListGroup'
import { InstallmentLine } from '../../components/shared/InstallmentLine'
import { PaymentSheet } from '../../components/shared/PaymentSheet'
import { paymentTarget, type PaymentTarget } from '../../lib/paymentTarget'
import { useDashboardOverview } from '../../hooks/dashboard/useDashboardOverview'
import { useAccountSummary } from '../../hooks/account/useAccountSummary'
import { useAuth } from '../../contexts/AuthContext'
import { Detail, usePreferences } from '../../contexts/PreferencesContext'
import { localToday } from '../../lib/date'
import { fmtMoney, fmtSentence } from '../../lib/format'
import { GettingStarted } from './GettingStarted'
import type { DashboardOverview } from '../../types/dashboard'
import type { InstallmentEnriched } from '../../types/installment'

const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
/** Overdue rows shown on the Painel; the rest is one tap away in Parcelas. */
const OVERDUE_SHOWN = 4

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

/** Nothing due, received or overdue: maybe a brand-new account (confirmed with /me/summary). */
function looksEmpty(o: DashboardOverview) {
  return Number(o.month.expected) === 0 && o.overdue.count === 0 && o.counts.today === 0 && o.counts.next7 === 0
}

/**
 * Painel (S1, improvements 1–5 and 48): what still comes in this month, every
 * overdue amount (any month) in one pill, and the agenda grouped by due date.
 * Everything comes from GET /dashboard/overview, computed for the local "today".
 */
export function DashboardPage() {
  const today = localToday()
  const { lender } = useAuth()
  const { detail } = usePreferences()
  const overview = useDashboardOverview(today)
  const o = overview.data
  const summary = useAccountSummary({ enabled: !!o && looksEmpty(o) })
  const firstUse = !!o && looksEmpty(o) && summary.data?.debts === 0
  const [showWeek, setShowWeek] = useState(false)
  const [payTarget, setPayTarget] = useState<PaymentTarget | null>(null)

  const firstName = lender?.name?.split(' ')[0] ?? 'você'

  const openPayment = (inst: InstallmentEnriched) => setPayTarget(paymentTarget(inst))

  const subtitle = firstUse
    ? 'Vamos começar?'
    : `${cap(fmtSentence(today))} · veja quem precisa te pagar.`

  return (
    <main className="lt-page lt-anim-fade">
      <div style={{ marginBottom: 16 }}>
        <h1 className="lt-h1">Olá, {firstName} 👋</h1>
        <Detail>
          <p className="lt-sub">{subtitle}</p>
        </Detail>
      </div>

      {overview.isError && !o ? (
        <ErrorState onRetry={() => void overview.refetch()} retrying={overview.isFetching} />
      ) : !o || (looksEmpty(o) && summary.isLoading) ? (
        <DashboardSkeleton />
      ) : firstUse ? (
        <GettingStarted />
      ) : (
        <>
          <Hero o={o} />
          <section className="lt-agenda" aria-label="Agenda">
            <Agenda o={o} today={o.today} lean={detail === 'lean'} showWeek={showWeek} onShowWeek={() => setShowWeek(true)} onOpen={openPayment} />
          </section>
        </>
      )}

      <PaymentSheet target={payTarget} onClose={() => setPayTarget(null)} />
    </main>
  )
}

/** "A receber em novembro", the month bar and, only when there is any, the overdue pill (improvements 1–3). */
function Hero({ o }: { o: DashboardOverview }) {
  const { detail } = usePreferences()
  const month = MONTHS[Number(o.month.key.slice(5, 7)) - 1]
  const pct = Math.max(0, Math.min(100, o.month.receivedPct))
  const prev = o.overdue.fromPreviousMonths.count
  const hasOverdue = Number(o.overdue.amount) > 0

  return (
    <section className="lt-hero lt-anim-up" aria-labelledby="hero-k">
      <h2 id="hero-k" className="lt-hero-k">A receber em {month}</h2>
      <div className="lt-hero-value">
        <Money value={o.month.remaining} size={38} color="#fff" />
      </div>
      <Link
        to="/installments?resumo=1"
        className="lt-hero-month"
        aria-label={`${fmtMoney(o.month.received)} recebido de ${fmtMoney(o.month.expected)}, ${pct}%. Ver parcelas de ${month}`}
      >
        <span className="lt-hm-bar" aria-hidden="true">
          <span style={{ width: `${pct}%` }} />
        </span>
        <span className="lt-hm-row" aria-hidden="true" data-lean={detail === 'lean' || undefined}>
          <span>
            <b>{fmtMoney(o.month.received)}</b> recebido de {fmtMoney(o.month.expected)}
          </span>
          <span className="lt-hm-pct">
            {pct}% <Icon name="chevronRight" size={13} />
          </span>
        </span>
      </Link>
      {hasOverdue && (
        <div className="lt-hero-pills">
          <Link to="/installments?aba=atrasadas" className="lt-late-pill">
            <Icon name="alert" size={14} />
            <span>
              {fmtMoney(o.overdue.amount)} em atraso
              {prev > 0 && ` · ${prev} de meses anteriores`}
            </span>
            <Icon name="chevronRight" size={13} />
          </Link>
        </div>
      )}
    </section>
  )
}

interface AgendaProps {
  o: DashboardOverview
  today: string
  lean: boolean
  showWeek: boolean
  onShowWeek: () => void
  onOpen: (inst: InstallmentEnriched) => void
}

/** Em atraso / Hoje / Próximos 7 dias, in due order (improvement 4). */
function Agenda({ o, today, lean, showWeek, onShowWeek, onOpen }: AgendaProps) {
  const { overdue, today: dueToday, next7 } = o.attention
  const moreOverdue = o.counts.overdue - Math.min(overdue.length, OVERDUE_SHOWN)

  if (o.counts.overdue === 0 && o.counts.today === 0 && o.counts.next7 === 0) {
    return <EmptyState icon="check" title="Tudo em dia!" sub="Nada vencido nem vencendo nos próximos 7 dias." />
  }

  const rows = (list: InstallmentEnriched[], label: string) => (
    <ListGroup label={label}>
      {list.map((inst) => (
        <InstallmentLine key={inst.id} inst={inst} today={today} onOpen={onOpen} />
      ))}
    </ListGroup>
  )

  return (
    <>
      {overdue.length > 0 && (
        <>
          <GroupLabel color="var(--overdue)" count={o.counts.overdue}>Em atraso</GroupLabel>
          {rows(overdue.slice(0, OVERDUE_SHOWN), 'Em atraso')}
          {moreOverdue > 0 && (
            <Link to="/installments?aba=atrasadas" className="lt-more-link">
              + {plural(moreOverdue, 'atrasada', 'atrasadas')}
            </Link>
          )}
        </>
      )}
      {dueToday.length > 0 && (
        <>
          <GroupLabel color="var(--pending)" count={o.counts.today}>Hoje</GroupLabel>
          {rows(dueToday, 'Hoje')}
        </>
      )}
      {next7.length > 0 &&
        (lean && !showWeek ? (
          <button type="button" className="lt-more-link" aria-expanded="false" onClick={onShowWeek}>
            Próximos 7 dias · {o.counts.next7} <Icon name="chevronDown" size={13} />
          </button>
        ) : (
          <>
            <GroupLabel color="var(--text-faint)" count={o.counts.next7}>Próximos 7 dias</GroupLabel>
            {rows(next7, 'Próximos 7 dias')}
          </>
        ))}
    </>
  )
}

function DashboardSkeleton() {
  return (
    <div aria-busy="true">
      <span className="lt-sr-only">Carregando o painel…</span>
      <div className="lt-skel" style={{ height: 150, borderRadius: 'calc(var(--radius) * 1.15)' }} />
      <div className="lt-skel" style={{ height: 14, width: 140, margin: '22px 3px 10px' }} />
      <div className="lt-skel" style={{ height: 180, borderRadius: 16 }} />
    </div>
  )
}
