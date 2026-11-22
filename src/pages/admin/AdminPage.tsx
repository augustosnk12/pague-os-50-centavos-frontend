import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Avatar } from '../../components/ui/Avatar'
import { Icon } from '../../components/ui/Icon'
import { EmptyState } from '../../components/ui/EmptyState'
import { ErrorState } from '../../components/ui/ErrorState'
import { PageHeader } from '../../components/ui/PageHeader'
import { ListGroup, SectionHeader } from '../../components/ui/ListGroup'
import { ListRow, RowText } from '../../components/ui/ListRow'
import { LinkButton } from '../../components/ui/LinkButton'
import { usePlan } from '../../hooks/plan/usePlan'
import { useAdminLenders, useAdminPlans } from '../../hooks/admin/useAdmin'
import type { AdminLender, AdminPlan, UsageItem } from '../../api/plan.api'
import { fmtCount } from '../../lib/planLimits'
import { matchesTerm } from '../../lib/searchMatch'
import { PlanSheet, LenderSheet } from './AdminSheets'

const NEAR = 0.8
type Tone = 'full' | 'near' | undefined
const toneOf = (u: UsageItem): Tone =>
  u.limit === null ? undefined : u.used >= u.limit ? 'full' : u.used >= Math.ceil(u.limit * NEAR) ? 'near' : undefined
const lenderTone = (l: AdminLender): Tone => {
  const t = [toneOf(l.debtors), toneOf(l.debts)]
  return t.includes('full') ? 'full' : t.includes('near') ? 'near' : undefined
}
const hasOwn = (l: AdminLender) => l.maxDebtors !== null || l.maxDebts !== null
const use = (u: UsageItem) => `${fmtCount(u.used)}/${u.limit === null ? '∞' : fmtCount(u.limit)}`

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

/** Administração (melhoria 63): planos e limites das contas. */
export function AdminPage() {
  const navigate = useNavigate()
  const me = usePlan()
  const isAdmin = !!me.data?.isAdmin
  const plans = useAdminPlans(isAdmin)
  const lenders = useAdminLenders(isAdmin)
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState('all')
  const [planSheet, setPlanSheet] = useState<AdminPlan | 'new' | null>(null)
  const [lenderId, setLenderId] = useState<string | null>(null)

  const all = useMemo(() => lenders.data ?? [], [lenders.data])
  const planList = plans.data ?? []
  const filters: [string, string, (l: AdminLender) => boolean][] = [
    ['all', 'Todas', () => true],
    ['full', 'No limite', (l) => lenderTone(l) === 'full'],
    ['near', 'Perto', (l) => lenderTone(l) === 'near'],
    ...planList.map((p): [string, string, (l: AdminLender) => boolean] => [`plan:${p.id}`, p.name, (l) => l.plan?.id === p.id]),
    ['req', 'Pediram mais', (l) => !!l.limitRequestedAt],
    ['own', 'Com ajuste', hasOwn],
  ]
  const active = filters.find((f) => f[0] === filter) ?? filters[0]
  const list = all
    .filter((l) => matchesTerm(l.email, q) || matchesTerm(l.name, q))
    .filter(active[2])
    .sort((a, b) => {
      const rank = (l: AdminLender) => (l.limitRequestedAt ? 0 : lenderTone(l) === 'full' ? 1 : lenderTone(l) === 'near' ? 2 : 3)
      return rank(a) - rank(b) || b.createdAt.localeCompare(a.createdAt)
    })

  if (me.isLoading) return <main className="lt-page" aria-busy="true" />
  if (!isAdmin) return <NotFound />

  const lender = lenderId ? all.find((l) => l.id === lenderId) ?? null : null
  return (
    <main className="lt-page lt-set">
      <PageHeader
        back={{ label: 'Configurações', onClick: () => navigate('/settings') }}
        title="Administração"
        sub="As mudanças valem na hora."
        keepSub
        action={<span className="lt-adm-lock"><Icon name="shield" size={12} /> Só você</span>}
      />

      <div className="lt-adm-strip">
        <div><div className="k">Contas</div><div className="v">{all.length}</div></div>
        <div><div className="k">No limite</div><div className="v" style={{ color: 'var(--overdue)' }}>{all.filter((l) => lenderTone(l) === 'full').length}</div></div>
        <div><div className="k">Pediram mais</div><div className="v">{all.filter((l) => l.limitRequestedAt).length}</div></div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <SectionHeader variant="plain">Planos</SectionHeader>
        <LinkButton onClick={() => setPlanSheet('new')}><Icon name="plus" size={12} /> Novo plano</LinkButton>
      </div>
      {plans.isError ? (
        <ErrorState onRetry={() => void plans.refetch()} retrying={plans.isFetching} />
      ) : !plans.data ? (
        <div className="lt-skel" style={{ height: 120, borderRadius: 'var(--r-lg)' }} aria-busy="true" />
      ) : (
        <ListGroup label="Planos">
          {planList.map((p) => (
            <ListRow
              key={p.id}
              label={`Plano ${p.name}: ${p.maxDebtors} devedores, ${p.maxDebts} dívidas, ${p.lenders} ${p.lenders === 1 ? 'conta' : 'contas'}${p.isDefault ? ', padrão para novas contas' : ''}`}
              onClick={() => setPlanSheet(p)}
            >
              <span className="lt-set-ic" aria-hidden="true"><Icon name={p.isDefault ? 'user' : 'zap'} size={16} /></span>
              <RowText
                title={<>{p.name}{p.isDefault && <> <span className="lt-adm-tag" data-tone="own">Padrão</span></>}</>}
                sub={`${fmtCount(p.maxDebtors)} devedores · ${fmtCount(p.maxDebts)} dívidas · ${p.showUsage ? 'mostra o uso sempre' : 'avisa só no limite'}`}
              />
              <span className="lt-set-s lt-adm-use" aria-hidden="true">{p.lenders} {p.lenders === 1 ? 'conta' : 'contas'}</span>
              <Icon name="chevronRight" size={16} color="var(--text-faint)" />
            </ListRow>
          ))}
        </ListGroup>
      )}
      <p className="lt-set-note">O plano <b>Padrão</b> é o de quem acaba de se cadastrar. Mudar um plano vale para todas as contas dele. Baixar um limite não apaga nada: quem já passou só não cadastra mais.</p>

      <SectionHeader variant="plain">Contas</SectionHeader>
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
        {filters.map(([id, label]) => (
          <button key={id} type="button" className="lt-chip" aria-pressed={filter === id} onClick={() => setFilter(id)}>{label}</button>
        ))}
      </div>
      {lenders.isError ? (
        <ErrorState onRetry={() => void lenders.refetch()} retrying={lenders.isFetching} />
      ) : !lenders.data ? (
        <div className="lt-skel" style={{ height: 220, borderRadius: 'var(--r-lg)' }} aria-busy="true" />
      ) : list.length === 0 ? (
        <EmptyState icon="users" title="Nenhuma conta encontrada" sub="Tente outro e-mail ou filtro." />
      ) : (
        <ListGroup label="Contas">
          {list.map((l) => {
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
      )}
      {all.length >= 200 && <p className="lt-set-note">Mostrando as 200 contas mais recentes. Use a busca para achar outras.</p>}

      <PlanSheet plan={planSheet} onClose={() => setPlanSheet(null)} />
      <LenderSheet lender={lender} plans={planList} onClose={() => setLenderId(null)} />
    </main>
  )
}
