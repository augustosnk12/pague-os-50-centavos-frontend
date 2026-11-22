import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Avatar } from '../../components/ui/Avatar'
import { Icon } from '../../components/ui/Icon'
import { EmptyState } from '../../components/ui/EmptyState'
import { ErrorState } from '../../components/ui/ErrorState'
import { PageHeader } from '../../components/ui/PageHeader'
import { ListGroup } from '../../components/ui/ListGroup'
import { ListRow, RowText } from '../../components/ui/ListRow'
import { LinkButton } from '../../components/ui/LinkButton'
import { Tabs } from '../../components/ui/Tabs'
import { usePlan } from '../../hooks/plan/usePlan'
import { useAdminLenders, useAdminPlans, useAdminStats } from '../../hooks/admin/useAdmin'
import type { AdminLender, AdminPlan, LenderQuery, LenderStatus, UsageItem } from '../../api/plan.api'
import { fmtCount } from '../../lib/planLimits'
import { PlanSheet, LenderSheet } from './AdminSheets'

const PAGE_SIZE = 20
const NEAR = 0.8
type Tab = 'contas' | 'planos'
type Tone = 'full' | 'near' | undefined

const toneOf = (u: UsageItem): Tone =>
  u.limit === null ? undefined : u.used >= u.limit ? 'full' : u.used >= Math.ceil(u.limit * NEAR) ? 'near' : undefined
const lenderTone = (l: AdminLender): Tone => {
  const t = [toneOf(l.debtors), toneOf(l.debts)]
  return t.includes('full') ? 'full' : t.includes('near') ? 'near' : undefined
}
const hasOwn = (l: AdminLender) => l.maxDebtors !== null || l.maxDebts !== null
const use = (u: UsageItem) => `${fmtCount(u.used)}/${u.limit === null ? '∞' : fmtCount(u.limit)}`

/** Filter chips of "Contas": a status or a plan (one at a time), all answered by the API. */
const STATUS_FILTERS: { id: LenderStatus; label: string }[] = [
  { id: 'full', label: 'No limite' },
  { id: 'near', label: 'Perto' },
  { id: 'requested', label: 'Pediram mais' },
  { id: 'adjusted', label: 'Com ajuste' },
]
const toQuery = (filter: string): Pick<LenderQuery, 'status' | 'planId'> =>
  filter.startsWith('plan:') ? { planId: filter.slice(5) } : filter === 'all' ? {} : { status: filter as LenderStatus }

/** The search waits for a pause in typing before asking the API. */
function useDebounced<T>(value: T, ms = 300): T {
  const [v, setV] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return v
}

/** Só o e-mail de ADMIN_EMAIL vê esta tela; para os outros, como na API, "não encontrada". */
function NotFound() {
  const navigate = useNavigate()
  return (
    <main className="lt-page">
      <EmptyState
        icon="search"
        title="Página não encontrada"
        sub="O endereço pode estar errado ou a página não existe mais."
        action={<button type="button" className="lt-btn-lg" data-variant="primary" onClick={() => navigate('/dashboard')}>Ir para o Painel</button>}
      />
    </main>
  )
}

/** Administração (melhoria 63): abas Contas (paginada) e Planos. */
export function AdminPage() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const tab: Tab = params.get('aba') === 'planos' ? 'planos' : 'contas'
  const setTab = (t: Tab) => setParams(t === 'planos' ? { aba: 'planos' } : {}, { replace: true })

  const me = usePlan()
  const isAdmin = !!me.data?.isAdmin
  const plans = useAdminPlans(isAdmin)
  const stats = useAdminStats(isAdmin)
  const [planSheet, setPlanSheet] = useState<AdminPlan | 'new' | null>(null)

  if (me.isLoading) return <main className="lt-page" aria-busy="true" />
  if (!isAdmin) return <NotFound />

  const s = stats.data
  return (
    <main className="lt-page lt-set">
      <PageHeader
        back={{ label: 'Configurações', onClick: () => navigate('/settings') }}
        title="Administração"
        sub="As mudanças valem na hora."
        keepSub
        action={<span className="lt-adm-lock"><Icon name="shield" size={12} /> Só você</span>}
      />

      <div className="lt-adm-strip" aria-busy={!s || undefined}>
        <div><div className="k">Contas</div><div className="v">{s ? fmtCount(s.lenders) : '—'}</div></div>
        <div><div className="k">No limite</div><div className="v" style={{ color: 'var(--overdue)' }}>{s ? fmtCount(s.full) : '—'}</div></div>
        <div><div className="k">Pediram mais</div><div className="v">{s ? fmtCount(s.requested) : '—'}</div></div>
      </div>

      <div style={{ marginTop: 16 }}>
        <Tabs<Tab>
          label="Administração"
          idPrefix="adm-tab"
          panelId="adm-panel"
          value={tab}
          onChange={setTab}
          items={[
            { id: 'contas', label: 'Contas', count: s?.lenders ?? null },
            { id: 'planos', label: 'Planos', count: plans.data?.length ?? null },
          ]}
        />
      </div>

      <div id="adm-panel" role="tabpanel" aria-labelledby={`adm-tab-${tab}`} style={{ marginTop: 14 }}>
        {tab === 'contas' ? (
          <LendersTab plans={plans.data ?? []} />
        ) : (
          <PlansTab plans={plans.data} isError={plans.isError} retrying={plans.isFetching} onRetry={() => void plans.refetch()} onOpen={setPlanSheet} />
        )}
      </div>

      <PlanSheet plan={planSheet} onClose={() => setPlanSheet(null)} />
    </main>
  )
}

function PlansTab({ plans, isError, retrying, onRetry, onOpen }: {
  plans: AdminPlan[] | undefined
  isError: boolean
  retrying: boolean
  onRetry: () => void
  onOpen: (p: AdminPlan | 'new') => void
}) {
  if (isError && !plans) return <ErrorState onRetry={onRetry} retrying={retrying} />
  if (!plans) return <div className="lt-skel" style={{ height: 120, borderRadius: 'var(--r-lg)' }} aria-busy="true" />
  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
        <LinkButton onClick={() => onOpen('new')}><Icon name="plus" size={12} /> Novo plano</LinkButton>
      </div>
      <ListGroup label="Planos">
        {plans.map((p) => (
          <ListRow
            key={p.id}
            label={`Plano ${p.name}: ${p.maxDebtors} devedores, ${p.maxDebts} dívidas, ${p.lenders} ${p.lenders === 1 ? 'conta' : 'contas'}${p.isDefault ? ', padrão para novas contas' : ''}`}
            onClick={() => onOpen(p)}
          >
            <span className="lt-set-ic" aria-hidden="true"><Icon name={p.isDefault ? 'user' : 'zap'} size={16} /></span>
            <RowText
              title={<>{p.name}{p.isDefault && <> <span className="lt-adm-tag" data-tone="own">Padrão</span></>}</>}
              sub={`${fmtCount(p.maxDebtors)} devedores · ${fmtCount(p.maxDebts)} dívidas · ${p.showUsage ? 'mostra o uso sempre' : 'avisa só no limite'}`}
            />
            <span className="lt-set-s lt-adm-use" aria-hidden="true">{fmtCount(p.lenders)} {p.lenders === 1 ? 'conta' : 'contas'}</span>
            <Icon name="chevronRight" size={16} color="var(--text-faint)" />
          </ListRow>
        ))}
      </ListGroup>
      <p className="lt-set-note">O plano <b>Padrão</b> é o de quem acaba de se cadastrar. Mudar um plano vale para todas as contas dele. Baixar um limite não apaga nada: quem já passou só não cadastra mais.</p>
    </>
  )
}

function LendersTab({ plans }: { plans: AdminPlan[] }) {
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [lenderId, setLenderId] = useState<string | null>(null)
  const listTop = useRef<HTMLDivElement>(null)
  const search = useDebounced(q.trim())

  // A new search or filter starts again at page 1.
  const [seen, setSeen] = useState({ search, filter })
  if (seen.search !== search || seen.filter !== filter) {
    setSeen({ search, filter })
    setPage(1)
  }

  const query: LenderQuery = { ...(search ? { q: search } : {}), ...toQuery(filter), page, pageSize: PAGE_SIZE }
  const lenders = useAdminLenders(query, true)
  const data = lenders.data
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1
  const from = data && data.total ? (data.page - 1) * data.pageSize + 1 : 0
  const to = data ? Math.min(data.total, data.page * data.pageSize) : 0
  const go = (p: number) => {
    setPage(p)
    listTop.current?.scrollIntoView?.({ block: 'start', behavior: 'smooth' })
  }
  const lender = lenderId ? data?.items.find((l) => l.id === lenderId) ?? null : null
  const filters = [
    { id: 'all', label: 'Todas' },
    ...STATUS_FILTERS,
    ...plans.map((p) => ({ id: `plan:${p.id}`, label: p.name })),
  ]

  return (
    <>
      <input
        className="lt-adm-input"
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Buscar por e-mail ou nome…"
        aria-label="Buscar conta"
        autoComplete="off"
        style={{ borderRadius: 'var(--r-pill)', marginBottom: 10 }}
      />
      <div className="lt-set-chips" role="group" aria-label="Filtrar contas" style={{ marginBottom: 12 }}>
        {filters.map((f) => (
          <button key={f.id} type="button" className="lt-chip" aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}>{f.label}</button>
        ))}
      </div>

      <div ref={listTop} style={{ scrollMarginTop: 'calc(var(--app-head-h, 60px) + 12px)' }} />
      {lenders.isError && !data ? (
        <ErrorState onRetry={() => void lenders.refetch()} retrying={lenders.isFetching} />
      ) : !data ? (
        <div className="lt-skel" style={{ height: 220, borderRadius: 'var(--r-lg)' }} aria-busy="true" />
      ) : data.total === 0 ? (
        <EmptyState icon="users" title="Nenhuma conta encontrada" sub="Tente outro e-mail ou filtro." />
      ) : (
        <>
          {/* Like Gmail: "1–20 de 45 ‹ ›" right above the list. */}
          <nav className="lt-adm-pager" aria-label="Páginas de contas">
            <span className="lt-set-s" aria-live="polite">
              <span className="lt-sr-only">Contas </span>
              {fmtCount(from)}–{fmtCount(to)} de {fmtCount(data.total)}
            </span>
            <button type="button" className="lt-adm-pg" disabled={page <= 1} onClick={() => go(page - 1)} aria-label="Página anterior" title="Página anterior">
              <Icon name="chevronLeft" size={20} />
            </button>
            <button type="button" className="lt-adm-pg" disabled={page >= pages} onClick={() => go(page + 1)} aria-label="Próxima página" title="Próxima página">
              <Icon name="chevronRight" size={20} />
            </button>
          </nav>
          <div aria-busy={lenders.isPlaceholderData || undefined} className="lt-adm-page" data-loading={lenders.isPlaceholderData || undefined}>
            <ListGroup label="Contas">
              {data.items.map((l) => {
                const tone = lenderTone(l)
                return (
                  <ListRow
                    key={l.id}
                    label={`${l.name ?? 'Sem nome'}, ${l.email}, plano ${l.plan?.name ?? 'sem plano'}, ${use(l.debtors)} devedores, ${use(l.debts)} dívidas${tone === 'full' ? ', no limite' : tone === 'near' ? ', perto do limite' : ''}${l.limitRequestedAt ? ', pediu mais limite' : ''}`}
                    onClick={() => setLenderId(l.id)}
                  >
                    <Avatar name={l.name ?? l.email} size={36} />
                    <RowText
                      title={l.name ?? 'Sem nome'}
                      sub={
                        <>
                          <span className="lt-ellipsis" style={{ display: 'block' }}>{l.email}</span>
                          <span className="lt-adm-use">
                            <span data-tone={toneOf(l.debtors)}>{use(l.debtors)} devedores</span> · <span data-tone={toneOf(l.debts)}>{use(l.debts)} dívidas</span>
                            {hasOwn(l) && ' · com ajuste'}
                          </span>
                        </>
                      }
                    />
                    <span className="lt-adm-tags" aria-hidden="true">
                      <span className="lt-adm-tag">{l.plan?.name ?? '—'}</span>
                      {l.limitRequestedAt && <span className="lt-adm-tag" data-tone="own">Pediu mais</span>}
                      {tone === 'full' ? <span className="lt-adm-tag" data-tone="full">No limite</span> : tone === 'near' ? <span className="lt-adm-tag" data-tone="near">Perto</span> : null}
                    </span>
                    <Icon name="chevronRight" size={16} color="var(--text-faint)" />
                  </ListRow>
                )
              })}
            </ListGroup>
          </div>
        </>
      )}

      <LenderSheet lender={lender} plans={plans} onClose={() => setLenderId(null)} />
    </>
  )
}
