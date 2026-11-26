import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type ReactElement } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAccountSummary } from '../../hooks/account/useAccountSummary'
import { useReopenPayment } from '../../hooks/useReopenPayment'
import { ErrorState } from '../../components/ui/ErrorState'
import { EmptyState } from '../../components/ui/EmptyState'
import { Icon } from '../../components/ui/Icon'
import { Amount } from '../../components/ui/Amount'
import { IconButton } from '../../components/ui/IconButton'
import { Avatar } from '../../components/ui/Avatar'
import { ListGroup } from '../../components/ui/ListGroup'
import { Tabs } from '../../components/ui/Tabs'
import { InstallmentLine } from '../../components/shared/InstallmentLine'
import { PaymentSheet } from '../../components/shared/PaymentSheet'
import { RemindSheet } from '../../components/shared/RemindSheet'
import { useDebtors } from '../../hooks/debtors/useDebtors'
import { useInstallmentsPeriod } from '../../hooks/installments/useInstallmentsPeriod'
import { localToday } from '../../lib/date'
import { scrollBehavior } from '../../lib/scroll'
import { paymentTarget, type PaymentTarget } from '../../lib/paymentTarget'
import {
  buildView, dayLabel, dayLabelLong, dayOf, isCurrentPeriod, isOverdue, isPaid, periodLabel, readUrlState, relativeLabel,
  shiftPeriod, weekDays, writeUrlState, type DayGroup, type InstallmentsView, type Period, type Tab,
} from '../../lib/installmentsView'
import { DebtorFilterSheet } from './DebtorFilterSheet'
import type { InstallmentEnriched } from '../../types/installment'

const PERIODS: [Period, string][] = [['day', 'Dia'], ['week', 'Semana'], ['month', 'Mês']]
const TABS: [Tab, string][] = [['open', 'A receber'], ['overdue', 'Atrasadas'], ['paid', 'Pagas']]
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
 * Parcelas (S3, simplified by improvement 61 — proposal D): the period in a
 * chip next to the debtor filter; a frame with the period and, always in
 * sight, what is left to receive in it (its arrow opens the breakdown);
 * 3 tabs (count only on Atrasadas); days without subtotals; lean rows.
 * Period, tab and debtor filter live in the URL.
 */
export function InstallmentsPage() {
  const today = localToday()
  const [params, setParams] = useSearchParams()
  const url = readUrlState(params, today)
  const { period, anchor, tab, debtorIds } = url

  const [totalsOpen, setTotalsOpen] = useState(() => url.summary || readTotalsOpen())
  const [limit, setLimit] = useState(PAGE)
  const [filterOpen, setFilterOpen] = useState(false)
  const [payTarget, setPayTarget] = useState<PaymentTarget | null>(null)
  const [remindId, setRemindId] = useState<string | null>(null)

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
  const navigate = useNavigate()
  // Nothing at all in this period: maybe an account with no debt yet (confirmed with /me/summary).
  const nothing = !!query.data && items.length === 0
  const summary = useAccountSummary({ enabled: nothing })
  const firstUse = nothing && summary.data?.debts === 0
  const [lastKey, setLastKey] = useState(viewKey)
  if (lastKey !== viewKey) {
    setLastKey(viewKey)
    setLimit(PAGE)
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
  useReopenPayment(setPayTarget)
  // Swipe left = WhatsApp reminder (improvement 27). Without a phone the reminder
  // sheet asks for it (and saves it), so every debtor can be reminded.
  const remindFor = (inst: InstallmentEnriched) => {
    const id = inst.debt?.debtor?.id ?? inst.debt?.debtorId
    return id ? () => setRemindId(id) : undefined
  }
  const tabName = TABS.find((t) => t[0] === tab)?.[1] ?? ''

  // Compact bar once the frame and tabs have scrolled away (improvement 15).
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
    window.scrollTo({ top: 0, behavior: scrollBehavior() })
    top.current?.focus({ preventScroll: true })
  }

  const loading = query.isLoading && !query.data
  const failed = query.isError && !query.data
  const where = period === 'day' ? 'neste dia' : period === 'week' ? 'nesta semana' : 'neste mês'

  return (
    <main className="lt-page lt-anim-fade lt-ip" data-compact={compact || undefined}>
      {compact && (
        <div className="lt-ip-bar" role="region" aria-label="Período e filtros">
          <div className="lt-ip-bar-in">
            <IconButton name="chevronLeft" size={16} label="Período anterior" onClick={() => update({ anchor: shiftPeriod(period, anchor, -1) })} />
            <button type="button" className="lt-ipb-lbl" onClick={scrollToTop} aria-label={`${periodLabel(period, anchor)}. Voltar ao topo`}>
              {periodLabel(period, anchor)}
            </button>
            <IconButton name="chevronRight" size={16} label="Próximo período" onClick={() => update({ anchor: shiftPeriod(period, anchor, 1) })} />
            <span className="lt-ipb-sep" aria-hidden="true" />
            <button type="button" className="lt-ipb-f" onClick={scrollToTop} aria-label={`${tabName}${tab === 'overdue' ? `, ${view.counts.overdue}` : ''}. Voltar ao topo`}>
              {tabName}
              {tab === 'overdue' && <span className="lt-cnt" data-late={view.counts.overdue > 0 || undefined}>{view.counts.overdue}</span>}
              {debtorIds.length > 0 && <span className="lt-ipb-nf">· {filterLabel}</span>}
            </button>
            <IconButton name="user" size={16} label={`Filtrar por devedor: ${filterSpoken}`} onClick={() => setFilterOpen(true)} />
          </div>
        </div>
      )}

      <div className="lt-ip-head">
        <h1 ref={top} className="lt-h1" tabIndex={-1}>Parcelas</h1>
        <span style={{ flex: 1 }} />
        <PeriodMenu value={period} onChange={(p) => update({ period: p })} />
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
              {selectedDebtors.slice(0, 2).map((d) => <Avatar key={d.id} name={d.name} size={24} hue={d.avatarHue} emoji={d.avatarEmoji} />)}
            </span>
          ) : (
            <Icon name="user" size={16} />
          )}
          <span className="lt-dfilter-lbl">{filterLabel}</span>
          <Icon name="chevronDown" size={16} />
        </button>
      </div>

      <section className="lt-ipd-frame" aria-label="Período e total">
        <div className="lt-pnav">
          <IconButton name="chevronLeft" size={20} label="Período anterior" onClick={() => update({ anchor: shiftPeriod(period, anchor, -1) })} />
          <div className="lt-pnav-lbl">
            <div className="lt-pnav-t" aria-live="polite">{periodLabel(period, anchor)}</div>
            <div className="lt-pnav-s">
              {isNow ? (
                relativeLabel(period, anchor, today)
              ) : (
                <button type="button" className="lt-s-today" onClick={() => update({ anchor: today })}>Voltar para hoje</button>
              )}
            </div>
          </div>
          <IconButton name="chevronRight" size={20} label="Próximo período" onClick={() => update({ anchor: shiftPeriod(period, anchor, 1) })} />
        </div>
        {period === 'day' && <WeekStrip anchor={anchor} today={today} items={items} debtorIds={debtorIds} onPick={(d) => update({ anchor: d })} />}
        {!loading && !failed && <PeriodTotal view={view} where={where} open={totalsOpen} onToggle={toggleTotals} />}
      </section>

      <Tabs
        items={TABS.map(([id, label]) => ({ id, label, count: id === 'overdue' && !loading && !failed ? view.counts.overdue : null, late: id === 'overdue' }))}
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
        ) : view.groups.length ? (
          <DayGroups groups={view.groups} today={today} limit={limit} lateTab={tab === 'overdue'} onMore={() => setLimit((l) => l + PAGE)} onOpen={openPayment} remindFor={remindFor} />
        ) : firstUse ? (
          <EmptyState
            icon="calendar"
            title="Nenhuma parcela ainda"
            sub="As parcelas aparecem aqui quando você registra uma dívida."
            action={
              <button type="button" className="lt-btn-lg" data-variant="primary" style={{ width: 'auto', padding: '0 20px' }} onClick={() => navigate('/debts/new')}>
                <Icon name="plus" size={16} /> Nova dívida
              </button>
            }
          />
        ) : (
          <>
            <EmptyState
              icon={tab === 'paid' ? 'wallet' : 'check'}
              title={tab === 'overdue' ? 'Nenhuma parcela atrasada' : tab === 'paid' ? `Nada recebido ${where}` : `Nada a receber ${where}`}
              sub={debtorIds.length ? 'Tente remover o filtro de devedor.' : tab === 'overdue' ? undefined : 'Use as setas para navegar entre períodos.'}
            />
            {debtorIds.length > 0 && (
              <div style={{ textAlign: 'center' }}>
                <button type="button" className="lt-chip" onClick={() => update({ debtorIds: [] })}>Limpar filtro</button>
              </div>
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
    </main>
  )
}

/** "Mês ▾": Dia · Semana · Mês in a small menu, the chosen one with ✓ (improvement 61). */
function PeriodMenu({ value, onChange }: { value: Period; onChange: (p: Period) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const id = useId()
  const label = PERIODS.find((p) => p[0] === value)?.[1] ?? ''

  useEffect(() => {
    if (!open) return
    const outside = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', outside)
    requestAnimationFrame(() => ref.current?.querySelector<HTMLElement>('[aria-checked="true"]')?.focus())
    return () => document.removeEventListener('mousedown', outside)
  }, [open])

  const close = (focus: boolean) => {
    setOpen(false)
    if (focus) trigger.current?.focus()
  }
  const onKeyDown = (e: KeyboardEvent) => {
    const items = Array.from(ref.current?.querySelectorAll<HTMLElement>('[role="menuitemradio"]') ?? [])
    const i = items.indexOf(document.activeElement as HTMLElement)
    const go = (n: number) => {
      e.preventDefault()
      items[(n + items.length) % items.length]?.focus()
    }
    if (e.key === 'ArrowDown') go(i + 1)
    else if (e.key === 'ArrowUp') go(i - 1)
    else if (e.key === 'Home') go(0)
    else if (e.key === 'End') go(items.length - 1)
    else if (e.key === 'Escape') {
      e.preventDefault()
      close(true)
    } else if (e.key === 'Tab') setOpen(false)
  }

  return (
    <div ref={ref} className="lt-pmenu-wrap">
      <button
        ref={trigger}
        type="button"
        className="lt-chip lt-dfilter"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        aria-label={`Ver por: ${label}`}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="lt-dfilter-lbl">{label}</span>
        <Icon name="chevronDown" size={16} />
      </button>
      {open && (
        // Menu pattern: arrows/Home/End/Esc are handled by the menu itself.
        // eslint-disable-next-line jsx-a11y/interactive-supports-focus
        <div id={id} role="menu" aria-label="Ver por" className="lt-pmenu" onKeyDown={onKeyDown}>
          {PERIODS.map(([p, l]) => (
            <button
              key={p}
              type="button"
              role="menuitemradio"
              aria-checked={p === value}
              className="lt-menu-item"
              onClick={() => {
                if (p !== value) onChange(p)
                close(true)
              }}
            >
              <span style={{ flex: 1 }}>{l}</span>
              {p === value && <Icon name="check" size={16} />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * Base of the frame, always in sight: "A receber · R$ X" of the period.
 * Its arrow opens the 3-colour bar, Recebido · Atrasado · A vencer and
 * "R$ Y previsto … · Z% recebido" (remembered on the device).
 */
function PeriodTotal({ view, where, open, onToggle }: { view: InstallmentsView; where: string; open: boolean; onToggle: () => void }) {
  const { expected, received, overdue, pending, due } = view.totals
  const pct = expected ? Math.floor((received / expected) * 100) : 0
  const w = (v: number) => `${expected ? (v / expected) * 100 : 0}%`
  const id = useId()
  const legend: [string, number, string][] = [
    ['Recebido', received, 'var(--paid)'],
    ['Atrasado', overdue, 'var(--overdue)'],
    ['A vencer', pending, 'var(--pending)'],
  ]
  return (
    <>
      <button type="button" className="lt-ipd-total" aria-expanded={open} aria-controls={id} onClick={onToggle} title={open ? 'Ocultar detalhes' : 'Ver detalhes'}>
        <span className="lt-ipd-k">A receber</span>
        <Amount className="lt-ipd-v" value={due / 100} />
        {/* Only the arrow: aria-expanded already says open/closed to screen readers. */}
        <span className="lt-ipd-info" aria-hidden="true">
          <Icon name="chevronDown" size={16} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform var(--dur) var(--ease-std)' }} />
        </span>
      </button>
      {open && (
        <div id={id} className="lt-ipd-det">
          <span className="lt-ipd-bar" aria-hidden="true">
            {legend.map(([k, v, c]) => (v > 0 ? <span key={k} style={{ width: w(v), background: c }} /> : null))}
          </span>
          <dl className="lt-ipd-leg">
            {legend.map(([k, v, c]) => (
              <div key={k}>
                <dt><span className="lt-dot" style={{ background: c }} />{k}</dt>
                <dd data-zero={v === 0 || undefined}><Amount value={v / 100} /></dd>
              </div>
            ))}
          </dl>
          <div className="lt-ipd-exp"><Amount value={expected / 100} /> previsto {where}{expected ? ` · ${pct}% recebido` : ''}</div>
        </div>
      )}
    </>
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

/** One list per day, the header with the date only (improvement 61). */
function DayGroups({ groups, today, limit, lateTab, onMore, onOpen, remindFor }: {
  groups: DayGroup[]
  today: string
  limit: number
  lateTab: boolean
  onMore: () => void
  onOpen: (i: InstallmentEnriched) => void
  remindFor: (i: InstallmentEnriched) => (() => void) | undefined
}) {
  let used = 0
  let total = 0
  const out: ReactElement[] = []
  for (const g of groups) {
    total += g.items.length
    if (used >= limit) continue
    const shown = g.items.slice(0, limit - used)
    used += shown.length
    const label = dayLabel(g.day, today)
    out.push(
      <section key={g.day} className="lt-day" id={g.day === today ? 'dia-hoje' : undefined} aria-labelledby={`dia-${g.day}`}>
        <h2 className="lt-dhead" id={`dia-${g.day}`}>
          <span aria-hidden="true">{label}</span>
          {/* One string for screen readers: "Hoje, quinta, 5 de novembro, 2 parcelas". */}
          <span className="lt-sr-only">
            {['Hoje', 'Amanhã', 'Ontem'].includes(label) ? `${label}, ${dayLabelLong(g.day)}` : dayLabelLong(g.day)}
            {g.items.length > 1 ? `, ${g.items.length} parcelas` : ''}
          </span>
        </h2>
        <ListGroup>
          {shown.map((i) => (
            <InstallmentLine key={i.id} inst={i} today={today} onOpen={onOpen} showDate={lateTab && dayOf(i) !== g.day} swipe lean onRemind={remindFor(i)} />
          ))}
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
          el?.scrollIntoView({ behavior: scrollBehavior(), block: 'start' })
          el?.querySelector<HTMLButtonElement>('.lt-lrow-hit')?.focus({ preventScroll: true })
        }}
      >
        Hoje <Icon name="chevronDown" size={16} style={state.today === 'up' ? { transform: 'rotate(180deg)' } : undefined} />
      </button>
    )
  }
  if (state.top) {
    return (
      <button type="button" className="lt-float" onClick={onTop} aria-label="Voltar ao topo">
        <Icon name="chevronDown" size={16} style={{ transform: 'rotate(180deg)' }} /> Topo
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
          <div className="lt-skel" style={{ height: 120, borderRadius: 'var(--r-lg)' }} />
        </div>
      ))}
    </div>
  )
}
