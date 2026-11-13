import { useEffect, useId, useMemo, useRef, useState, type ReactElement } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ErrorState } from '../../components/ui/ErrorState'
import { EmptyState } from '../../components/ui/EmptyState'
import { Icon } from '../../components/ui/Icon'
import { IconButton } from '../../components/ui/IconButton'
import { Avatar } from '../../components/ui/Avatar'
import { Money } from '../../components/ui/Money'
import { ListGroup } from '../../components/ui/ListGroup'
import { Tabs } from '../../components/ui/Tabs'
import { InstallmentLine } from '../../components/shared/InstallmentLine'
import { PaymentSheet } from '../../components/shared/PaymentSheet'
import { RemindSheet } from '../../components/shared/RemindSheet'
import { ReceiptSheet } from '../../components/shared/ReceiptSheet'
import type { ReceiptRequest } from '../../lib/receipt'
import { whatsappLink } from '../../lib/whatsapp'
import { Detail } from '../../contexts/PreferencesContext'
import { useDebtors } from '../../hooks/debtors/useDebtors'
import { useInstallmentsPeriod } from '../../hooks/installments/useInstallmentsPeriod'
import { localToday } from '../../lib/date'
import { fmtMoney } from '../../lib/format'
import { paymentTarget, type PaymentTarget } from '../../lib/paymentTarget'
import {
  buildView, dayLabel, dayLabelLong, dayOf, isCurrentPeriod, isOverdue, isPaid, periodLabel, readUrlState, relativeLabel,
  shiftPeriod, weekDays, writeUrlState, type DayGroup, type InstallmentsView, type Period, type Tab,
} from '../../lib/installmentsView'
import { DebtorFilterSheet } from './DebtorFilterSheet'
import type { InstallmentEnriched } from '../../types/installment'

const PERIODS: [Period, string][] = [['day', 'Dia'], ['week', 'Semana'], ['month', 'Mês']]
const TABS: [Tab, string][] = [['all', 'Todas'], ['open', 'Em aberto'], ['overdue', 'Atrasadas'], ['paid', 'Pagas']]
/** Rows rendered at a time ("Mostrar mais 40", improvement 42). */
const PAGE = 40
const TOTALS_KEY = 'pague50_parcelas_resumo'

const readTotalsOpen = () => {
  try {
    return localStorage.getItem(TOTALS_KEY) === '1'
  } catch {
    return false
  }
}
const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? name
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

/**
 * Parcelas (S3, improvements 13, 14, 15, 25, 27 and 42). Period, tab and
 * debtor filter live in the URL; the list is grouped by day; overdue
 * installments from before the period are always one tap away.
 */
export function InstallmentsPage() {
  const today = localToday()
  const [params, setParams] = useSearchParams()
  const url = readUrlState(params, today)
  const { period, anchor, tab, debtorIds } = url

  const [totalsOpen, setTotalsOpen] = useState(() => url.summary || readTotalsOpen())
  const [showPrevious, setShowPrevious] = useState(false)
  const [paidOpen, setPaidOpen] = useState<Record<string, boolean>>({})
  const [limit, setLimit] = useState(PAGE)
  const [filterOpen, setFilterOpen] = useState(false)
  const [payTarget, setPayTarget] = useState<PaymentTarget | null>(null)
  const [remindId, setRemindId] = useState<string | null>(null)
  const [receipt, setReceipt] = useState<ReceiptRequest | null>(null)

  // Day mode loads the whole week: the strip shows a dot on every day with installments.
  const query = useInstallmentsPeriod({ period: period === 'day' ? 'week' : period, date: anchor, today })
  const { data: debtors = [] } = useDebtors()
  const items = useMemo(() => query.data ?? [], [query.data])
  const debtorKey = debtorIds.join(',')
  const view = useMemo(
    () => buildView(items, { period, anchor, today, tab, debtorIds: debtorKey ? debtorKey.split(',') : [] }),
    [items, period, anchor, today, tab, debtorKey],
  )

  // A new period, tab or filter starts from the first rows again.
  const viewKey = `${period}|${anchor}|${tab}|${debtorKey}`
  const [lastKey, setLastKey] = useState(viewKey)
  if (lastKey !== viewKey) {
    setLastKey(viewKey)
    setLimit(PAGE)
    setPaidOpen({})
    setShowPrevious(false)
  }

  const update = (next: Partial<{ period: Period; anchor: string; tab: Tab; debtorIds: string[] }>) =>
    setParams(writeUrlState({ period, anchor, tab, debtorIds, ...next }, today), { replace: true })

  const toggleTotals = () => {
    setTotalsOpen((o) => {
      try {
        localStorage.setItem(TOTALS_KEY, o ? '0' : '1')
      } catch {
        // storage unavailable: keep for this visit
      }
      return !o
    })
  }

  const selectedDebtors = debtorIds.map((id) => debtors.find((d) => d.id === id)).filter((d): d is NonNullable<typeof d> => !!d)
  const filterLabel = !debtorIds.length ? 'Todos' : debtorIds.length === 1 ? firstName(selectedDebtors[0]?.name ?? '1 devedor') : `${debtorIds.length} devedores`
  const filterSpoken = !debtorIds.length ? 'todos os devedores' : selectedDebtors.map((d) => d.name).join(', ') || filterLabel

  const isNow = isCurrentPeriod(period, anchor, today) && (period !== 'day' || anchor === today)
  const openPayment = (inst: InstallmentEnriched) => setPayTarget(paymentTarget(inst))
  // Swipe left = WhatsApp reminder, only for debtors with a phone WhatsApp accepts (improvement 27).
  const reachable = useMemo(() => new Set(debtors.filter((d) => whatsappLink(d.phone)).map((d) => d.id)), [debtors])
  const receiptFor = (inst: InstallmentEnriched) => {
    const debtorId = inst.debt?.debtor?.id ?? inst.debt?.debtorId
    return debtorId ? (paymentId: string) => setReceipt({ debtorId, paymentId }) : undefined
  }
  const remindFor = (inst: InstallmentEnriched) => {
    const id = inst.debt?.debtor?.id ?? inst.debt?.debtorId
    return id && reachable.has(id) ? () => setRemindId(id) : undefined
  }
  const tabName = TABS.find((t) => t[0] === tab)?.[1] ?? ''

  // Compact bar once the period card and tabs have scrolled away (improvement 15).
  const sentinel = useRef<HTMLDivElement>(null)
  const [compact, setCompact] = useState(false)
  useEffect(() => {
    const el = sentinel.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(([e]) => setCompact(!e.isIntersecting && e.boundingClientRect.top < 0), { threshold: 0 })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  const top = useRef<HTMLHeadingElement>(null)
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
    top.current?.focus({ preventScroll: true })
  }

  const loading = query.isLoading && !query.data
  const failed = query.isError && !query.data

  return (
    <main className="lt-page lt-anim-fade lt-ip" data-compact={compact || undefined}>
      {compact && (
        <div className="lt-ip-bar" role="region" aria-label="Período e filtros">
          <div className="lt-ip-bar-in">
            <IconButton name="chevronLeft" size={17} label="Período anterior" onClick={() => update({ anchor: shiftPeriod(period, anchor, -1) })} />
            <button type="button" className="lt-ipb-lbl" onClick={scrollToTop} aria-label={`${periodLabel(period, anchor)}. Voltar ao topo`}>
              {periodLabel(period, anchor)}
            </button>
            <IconButton name="chevronRight" size={17} label="Próximo período" onClick={() => update({ anchor: shiftPeriod(period, anchor, 1) })} />
            <span className="lt-ipb-sep" aria-hidden="true" />
            <button type="button" className="lt-ipb-f" onClick={scrollToTop} aria-label={`${tabName}, ${view.counts[tab]}. Voltar ao topo`}>
              {tabName}
              <span className="lt-cnt" data-late={(tab === 'overdue' && view.counts.overdue > 0) || undefined}>{view.counts[tab]}</span>
              {debtorIds.length > 0 && <span className="lt-ipb-nf">· {filterLabel}</span>}
            </button>
            <IconButton name="user" size={16} label={`Filtrar por devedor: ${filterSpoken}`} onClick={() => setFilterOpen(true)} />
          </div>
        </div>
      )}

      <div className="lt-ip-head">
        <h1 ref={top} className="lt-h1" tabIndex={-1}>Parcelas</h1>
        <button
          type="button"
          className="lt-chip lt-dfilter"
          aria-haspopup="dialog"
          aria-label={`Filtrar por devedor: ${filterSpoken}`}
          data-on={debtorIds.length > 0 || undefined}
          onClick={() => setFilterOpen(true)}
        >
          {selectedDebtors.length ? (
            <span className="lt-av-stack" aria-hidden="true">
              {selectedDebtors.slice(0, 2).map((d) => <Avatar key={d.id} name={d.name} size={22} hue={d.avatarHue} emoji={d.avatarEmoji} />)}
            </span>
          ) : (
            <Icon name="user" size={15} />
          )}
          <span className="lt-dfilter-lbl">{filterLabel}</span>
          <Icon name="chevronDown" size={13} />
        </button>
      </div>

      <div className="lt-pcard">
        <div className="lt-seg" role="group" aria-label="Agrupar por">
          {PERIODS.map(([p, l]) => (
            <button key={p} type="button" aria-pressed={period === p} onClick={() => update({ period: p })}>{l}</button>
          ))}
        </div>
        <div className="lt-pnav">
          <IconButton name="chevronLeft" size={19} label="Período anterior" onClick={() => update({ anchor: shiftPeriod(period, anchor, -1) })} />
          <div className="lt-pnav-lbl">
            <div className="lt-pnav-t" aria-live="polite">{periodLabel(period, anchor)}</div>
            <div className="lt-pnav-s">
              <Detail>{relativeLabel(period, anchor, today)}</Detail>
              {!isNow && (
                <>
                  <Detail>{' · '}</Detail>
                  <button type="button" className="lt-s-today" onClick={() => update({ anchor: today })} aria-label="Ir para o período atual">Hoje</button>
                </>
              )}
            </div>
          </div>
          <IconButton name="chevronRight" size={19} label="Próximo período" onClick={() => update({ anchor: shiftPeriod(period, anchor, 1) })} />
        </div>
      </div>

      {period === 'day' && <WeekStrip anchor={anchor} today={today} items={items} debtorIds={debtorIds} onPick={(d) => update({ anchor: d })} />}

      {!loading && !failed && (
        <Totals view={view} period={period} tab={tab} open={totalsOpen} onToggle={toggleTotals} onFilter={(t) => update({ tab: t })} />
      )}

      <Tabs
        items={TABS.map(([id, label]) => ({ id, label, count: loading || failed ? null : view.counts[id], late: id === 'overdue' }))}
        value={tab}
        onChange={(t) => update({ tab: t })}
        label="Situação"
        panelId="parcelas-lista"
        idPrefix="tab"
      />
      <div ref={sentinel} aria-hidden="true" />

      <div role="tabpanel" id="parcelas-lista" aria-labelledby={`tab-${tab}`}>
        {failed ? (
          <ErrorState onRetry={() => void query.refetch()} retrying={query.isFetching} />
        ) : loading ? (
          <ListSkeleton />
        ) : (
          <>
            {view.previous.length > 0 && (tab === 'all' || tab === 'open') && (
              <PreviousLine
                items={view.previous}
                cents={view.previousCents}
                open={showPrevious}
                onToggle={() => setShowPrevious((o) => !o)}
                today={today}
                onOpen={openPayment}
                remindFor={remindFor}
              />
            )}
            {view.groups.length ? (
              <DayGroups
                groups={view.groups}
                today={today}
                limit={limit}
                collapsePaid={tab === 'all'}
                paidOpen={paidOpen}
                onTogglePaid={(day) => setPaidOpen((o) => ({ ...o, [day]: !o[day] }))}
                onMore={() => setLimit((l) => l + PAGE)}
                onOpen={openPayment}
                remindFor={remindFor}
                receiptFor={receiptFor}
              />
            ) : (
              <>
                <EmptyState
                  icon={tab === 'paid' ? 'wallet' : 'check'}
                  title={tab === 'overdue' ? 'Nenhuma parcela atrasada' : tab === 'paid' ? 'Nada recebido neste período' : 'Nenhuma parcela neste período'}
                  sub={debtorIds.length ? 'Tente remover o filtro de devedor.' : 'Use as setas para navegar entre períodos.'}
                />
                {debtorIds.length > 0 && (
                  <div style={{ textAlign: 'center' }}>
                    <button type="button" className="lt-chip" onClick={() => update({ debtorIds: [] })}>Limpar filtro</button>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      <FloatingNav hasToday={view.groups.some((g) => g.day === today)} onTop={scrollToTop} />

      <DebtorFilterSheet
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        debtors={debtors}
        selected={debtorIds}
        onChange={(ids) => update({ debtorIds: ids })}
      />
      <PaymentSheet target={payTarget} onClose={() => setPayTarget(null)} />
      <RemindSheet debtorId={remindId} onClose={() => setRemindId(null)} />
      <ReceiptSheet request={receipt} onClose={() => setReceipt(null)} />
    </main>
  )
}

/** Day mode: the 7 days of the week with a dot (overdue / due / paid) on days with installments. */
function WeekStrip({ anchor, today, items, debtorIds, onPick }: { anchor: string; today: string; items: InstallmentEnriched[]; debtorIds: string[]; onPick: (day: string) => void }) {
  const ofDebtor = (i: InstallmentEnriched) => !debtorIds.length || debtorIds.includes(i.debt?.debtor?.id ?? i.debt?.debtorId ?? '')
  return (
    <div className="lt-wstrip" role="group" aria-label="Dias da semana">
      {weekDays(anchor).map((day) => {
        const its = items.filter((i) => dayOf(i) === day && ofDebtor(i))
        const tone = !its.length ? undefined : its.some((i) => isOverdue(i, today)) ? 'overdue' : its.every(isPaid) ? 'paid' : 'pending'
        return (
          <button
            key={day}
            type="button"
            className="lt-wday"
            aria-pressed={day === anchor}
            aria-current={day === today ? 'date' : undefined}
            aria-label={`${dayLabelLong(day)}${its.length ? `, ${plural(its.length, 'parcela', 'parcelas')}` : ''}`}
            onClick={() => onPick(day)}
          >
            <span className="lt-wd" aria-hidden="true">{dayLabelLong(day).slice(0, 3)}</span>
            <span className="lt-dn" aria-hidden="true">{Number(day.slice(8, 10))}</span>
            <span className="lt-wdot" data-tone={tone} aria-hidden="true" />
          </button>
        )
      })}
    </div>
  )
}

/** Totals in one folded line: to receive · 3-colour bar · % received (improvement 15). */
function Totals({ view, period, tab, open, onToggle, onFilter }: {
  view: InstallmentsView
  period: Period
  tab: Tab
  open: boolean
  onToggle: () => void
  onFilter: (t: Tab) => void
}) {
  const { expected, received, overdue, pending, due } = view.totals
  const pct = expected ? Math.floor((received / expected) * 100) : 0
  const w = (v: number) => `${expected ? (v / expected) * 100 : 0}%`
  const id = useId()
  const where = period === 'day' ? 'neste dia' : period === 'week' ? 'nesta semana' : 'neste mês'
  return (
    <div className="lt-tot" data-open={open || undefined}>
      <button type="button" className="lt-tot-line" aria-expanded={open} aria-controls={id} onClick={onToggle}>
        <span className="lt-tot-v">
          <Money value={due / 100} size={15} /> <span className="lt-tot-k">a receber</span>
        </span>
        <span className="lt-tot-bar" aria-hidden="true">
          <span style={{ width: w(received), background: 'var(--paid)' }} />
          <span style={{ width: w(overdue), background: 'var(--overdue)' }} />
          <span style={{ width: w(pending), background: 'var(--pending)' }} />
        </span>
        <span className="lt-tot-pct">{pct}%</span>
        <span className="lt-tot-chev" aria-hidden="true"><Icon name="chevronDown" size={15} /></span>
      </button>
      {open && (
        <div id={id} className="lt-tot-det">
          <div className="lt-tot-exp">{fmtMoney(expected / 100)} previsto {where} · {pct}% recebido</div>
          <div className="lt-tot-leg">
            <button type="button" aria-pressed={tab === 'paid'} onClick={() => onFilter(tab === 'paid' ? 'all' : 'paid')}>
              <span className="lt-lk"><span className="lt-dot" style={{ background: 'var(--paid)' }} />Recebido</span>
              <span className="lt-lv">{fmtMoney(received / 100)}</span>
            </button>
            <button type="button" aria-pressed={tab === 'overdue'} onClick={() => onFilter(tab === 'overdue' ? 'all' : 'overdue')}>
              <span className="lt-lk"><span className="lt-dot" style={{ background: 'var(--overdue)' }} />Atrasado</span>
              <span className="lt-lv">{fmtMoney(overdue / 100)}</span>
            </button>
            <div className="lt-tot-static">
              <span className="lt-lk"><span className="lt-dot" style={{ background: 'var(--pending)' }} />A vencer</span>
              <span className="lt-lv">{fmtMoney(pending / 100)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function PreviousLine({ items, cents, open, onToggle, today, onOpen, remindFor }: {
  items: InstallmentEnriched[]
  cents: number
  open: boolean
  onToggle: () => void
  today: string
  onOpen: (i: InstallmentEnriched) => void
  remindFor: (i: InstallmentEnriched) => (() => void) | undefined
}) {
  return (
    <>
      <button type="button" className="lt-prevline" aria-expanded={open} onClick={onToggle}>
        <Icon name="alert" size={16} />
        <span style={{ flex: 1, textAlign: 'left' }}>{plural(items.length, 'atrasada', 'atrasadas')} de antes deste período</span>
        <span>{fmtMoney(cents / 100)}</span>
        <Icon name="chevronDown" size={16} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform var(--dur) var(--ease-std)' }} />
      </button>
      {open && (
        <div style={{ marginTop: 8 }}>
          <ListGroup label="Atrasadas de antes deste período">
            {items.map((i) => <InstallmentLine key={i.id} inst={i} today={today} onOpen={onOpen} swipe onRemind={remindFor(i)} />)}
          </ListGroup>
        </div>
      )}
    </>
  )
}

/** One card per day; in "Todas" the paid ones of each day fold into one line (improvements 13 and 42). */
function DayGroups({ groups, today, limit, collapsePaid, paidOpen, onTogglePaid, onMore, onOpen, remindFor, receiptFor }: {
  groups: DayGroup[]
  today: string
  limit: number
  collapsePaid: boolean
  paidOpen: Record<string, boolean>
  onTogglePaid: (day: string) => void
  onMore: () => void
  onOpen: (i: InstallmentEnriched) => void
  remindFor: (i: InstallmentEnriched) => (() => void) | undefined
  receiptFor: (i: InstallmentEnriched) => ((paymentId: string) => void) | undefined
}) {
  let used = 0
  let total = 0
  const out: ReactElement[] = []
  for (const g of groups) {
    const count = g.open.length + g.paid.length
    total += count
    if (used >= limit) continue
    const folded = collapsePaid && g.paid.length > 0 && !paidOpen[g.day]
    const rows = folded ? g.open : [...g.open, ...g.paid]
    const shown = rows.slice(0, limit - used)
    used += shown.length + (folded && shown.length === rows.length ? g.paid.length : 0)
    const complete = shown.length === rows.length
    const label = dayLabel(g.day, today)
    out.push(
      <section key={g.day} className="lt-day" id={g.day === today ? 'dia-hoje' : undefined} aria-labelledby={`dia-${g.day}`}>
        <h2 className="lt-dhead" id={`dia-${g.day}`}>
          <span>
            <span aria-hidden="true">
              {label}
              {count > 1 && <span className="lt-dh-n">{count}</span>}
            </span>
            {/* One string for screen readers: "Hoje, quinta, 5 de novembro, 2 parcelas". */}
            <span className="lt-sr-only">
              {['Hoje', 'Amanhã', 'Ontem'].includes(label) ? `${label}, ${dayLabelLong(g.day)}` : dayLabelLong(g.day)}
              {count > 1 ? `, ${count} parcelas` : ''}
            </span>
          </span>
          <Detail>
            <span className="lt-dh-sum">
              {g.open.length ? (
                <>
                  {fmtMoney(g.dueCents / 100)} a receber
                  {g.paid.length > 0 && <span style={{ color: 'var(--paid)' }}> · {plural(g.paid.length, 'paga', 'pagas')}</span>}
                </>
              ) : (
                <span style={{ color: 'var(--paid)' }}>✓ {fmtMoney(g.paidCents / 100)} recebido</span>
              )}
            </span>
          </Detail>
        </h2>
        <ListGroup>
          {shown.map((i) => <InstallmentLine key={i.id} inst={i} today={today} onOpen={onOpen} showDate={dayOf(i) !== g.day} swipe onRemind={remindFor(i)} onReceipt={receiptFor(i)} />)}
          {collapsePaid && g.paid.length > 0 && complete && (
            <li className="lt-lrow">
              <div className="lt-lrow-in lt-paid-sum">
                <button
                  type="button"
                  className="lt-lrow-hit"
                  aria-expanded={!!paidOpen[g.day]}
                  aria-label={`${plural(g.paid.length, 'paga', 'pagas')}, ${fmtMoney(g.paidCents / 100)}. ${paidOpen[g.day] ? 'Recolher' : 'Mostrar'}`}
                  onClick={() => onTogglePaid(g.day)}
                />
                <span style={{ color: 'var(--paid)', display: 'inline-flex' }}><Icon name="check" size={16} strokeWidth={2.6} /></span>
                <span className="lt-paid-sum-t">{paidOpen[g.day] ? 'Recolher pagas' : `${plural(g.paid.length, 'paga', 'pagas')} · ${fmtMoney(g.paidCents / 100)}`}</span>
                <Icon name="chevronDown" size={15} style={{ color: 'var(--text-faint)', transform: paidOpen[g.day] ? 'rotate(180deg)' : 'none' }} />
              </div>
            </li>
          )}
        </ListGroup>
      </section>,
    )
  }
  const rest = total - used
  return (
    <>
      {out}
      {rest > 0 && (
        <button type="button" className="lt-btn-lg lt-more" data-variant="secondary" onClick={onMore}>
          Mostrar mais {Math.min(PAGE, rest)} <span style={{ color: 'var(--text-muted)', fontWeight: 700 }}>· faltam {rest}</span>
        </button>
      )}
    </>
  )
}

/**
 * One floating button (improvement 42): "Hoje ↓/↑" when today's group is off
 * screen, otherwise "↑ Topo" after scrolling a screen and a half.
 */
function FloatingNav({ hasToday, onTop }: { hasToday: boolean; onTop: () => void }) {
  const [state, setState] = useState<{ today: 'up' | 'down' | null; top: boolean }>({ today: null, top: false })
  useEffect(() => {
    const check = () => {
      const el = hasToday ? document.getElementById('dia-hoje') : null
      let today: 'up' | 'down' | null = null
      if (el) {
        const r = el.getBoundingClientRect()
        if (r.bottom < 0) today = 'up'
        else if (r.top > window.innerHeight) today = 'down'
      }
      const top = window.scrollY > window.innerHeight * 1.5
      setState((s) => (s.today === today && s.top === top ? s : { today, top }))
    }
    check()
    window.addEventListener('scroll', check, { passive: true })
    window.addEventListener('resize', check)
    return () => {
      window.removeEventListener('scroll', check)
      window.removeEventListener('resize', check)
    }
  }, [hasToday])

  if (state.today) {
    return (
      <button
        type="button"
        className="lt-float"
        onClick={() => {
          const el = document.getElementById('dia-hoje')
          el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
          el?.querySelector<HTMLButtonElement>('.lt-lrow-hit')?.focus({ preventScroll: true })
        }}
      >
        Hoje <Icon name="chevronDown" size={15} style={state.today === 'up' ? { transform: 'rotate(180deg)' } : undefined} />
      </button>
    )
  }
  if (state.top) {
    return (
      <button type="button" className="lt-float" onClick={onTop} aria-label="Voltar ao topo">
        <Icon name="chevronDown" size={15} style={{ transform: 'rotate(180deg)' }} /> Topo
      </button>
    )
  }
  return null
}

function ListSkeleton() {
  return (
    <div aria-busy="true">
      <span className="lt-sr-only">Carregando parcelas…</span>
      {[0, 1].map((k) => (
        <div key={k}>
          <div className="lt-skel" style={{ height: 12, width: 120, margin: '18px 3px 10px' }} />
          <div className="lt-skel" style={{ height: 120, borderRadius: 16 }} />
        </div>
      ))}
    </div>
  )
}
