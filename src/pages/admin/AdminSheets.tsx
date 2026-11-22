import { useState } from 'react'
import { Modal } from '../../components/ui/Modal'
import { Icon } from '../../components/ui/Icon'
import { LinkButton } from '../../components/ui/LinkButton'
import { useToast } from '../../contexts/ToastContext'
import { useDeletePlan, useSavePlan, useUpdateLenderPlan } from '../../hooks/admin/useAdmin'
import type { AdminLender, AdminPlan } from '../../api/plan.api'
import { getApiError } from '../../lib/api'
import { translateApiError } from '../../lib/utils'
import { fmtBR } from '../../lib/format'
import { fmtCount } from '../../lib/planLimits'

const MAX = 100_000
const toInt = (s: string) => {
  const n = parseInt(s.replace(/\D/g, ''), 10)
  return Number.isFinite(n) ? n : 0
}

function Stepper({ id, label, value, step, onChange }: { id: string; label: string; value: string; step: number; onChange: (v: string) => void }) {
  const n = toInt(value)
  return (
    <div className="lt-set-row" style={{ padding: '10px 0' }}>
      <label className="lt-set-t" htmlFor={id} style={{ flex: 1 }}>{label}</label>
      <div className="lt-adm-step" role="group" aria-label={label}>
        <button type="button" aria-label={`Diminuir ${label.toLowerCase()}`} disabled={n <= step} onClick={() => onChange(String(Math.max(1, n - step)))}>−</button>
        <input id={id} inputMode="numeric" maxLength={6} value={value} onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))} />
        <button type="button" aria-label={`Aumentar ${label.toLowerCase()}`} onClick={() => onChange(String(Math.min(MAX, n + step)))}>+</button>
      </div>
    </div>
  )
}

function Switch({ on, title, sub, onClick, disabled }: { on: boolean; title: string; sub: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button type="button" className="lt-adm-switch" role="switch" aria-checked={on} aria-label={title} onClick={onClick} disabled={disabled}>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span className="lt-set-t" style={{ display: 'block' }}>{title}</span>
        <span className="lt-set-s">{sub}</span>
      </span>
      <span className="sw" aria-hidden="true" />
    </button>
  )
}

/** Criar / editar plano (melhoria 63). */
export function PlanSheet({ plan, onClose }: { plan: AdminPlan | 'new' | null; onClose: () => void }) {
  const open = plan !== null
  const p = plan && plan !== 'new' ? plan : null
  // Remount per plan so the form starts from it.
  return open ? <PlanForm key={p?.id ?? 'new'} plan={p} onClose={onClose} /> : null
}

function PlanForm({ plan, onClose }: { plan: AdminPlan | null; onClose: () => void }) {
  const { showToast } = useToast()
  const save = useSavePlan()
  const del = useDeletePlan()
  const [name, setName] = useState(plan?.name ?? '')
  const [debtors, setDebtors] = useState(String(plan?.maxDebtors ?? 50))
  const [debts, setDebts] = useState(String(plan?.maxDebts ?? 1000))
  const [showUsage, setShowUsage] = useState(plan?.showUsage ?? true)
  const [isDefault, setIsDefault] = useState(plan?.isDefault ?? false)
  const [err, setErr] = useState('')
  const busy = save.isPending || del.isPending

  const submit = () => {
    const d = toInt(debtors)
    const i = toInt(debts)
    if (!name.trim()) return setErr('Informe o nome')
    if (d < 1 || i < 1 || d > MAX || i > MAX) return setErr(`Os limites vão de 1 a ${fmtCount(MAX)}`)
    setErr('')
    save.mutate(
      { id: plan?.id, data: { name: name.trim(), maxDebtors: d, maxDebts: i, showUsage, ...(isDefault && !plan?.isDefault ? { isDefault: true } : {}) } },
      {
        onSuccess: () => {
          showToast(plan ? `Plano ${name.trim()} salvo · vale para ${plan.lenders} ${plan.lenders === 1 ? 'conta' : 'contas'}` : `Plano ${name.trim()} criado`, { icon: 'check' })
          onClose()
        },
        onError: (e: unknown) => setErr(translateApiError(getApiError(e), 'Não foi possível salvar o plano.')),
      },
    )
  }
  const remove = () =>
    plan &&
    del.mutate(plan.id, {
      onSuccess: () => {
        showToast(`Plano ${plan.name} excluído`, { icon: 'trash' })
        onClose()
      },
      onError: (e: unknown) => setErr(translateApiError(getApiError(e), 'Não foi possível excluir o plano.')),
    })

  return (
    <Modal
      open
      onClose={onClose}
      title={plan ? `Plano ${plan.name}` : 'Novo plano'}
      footer={
        <>
          <button type="button" className="lt-btn-lg" data-variant="secondary" onClick={onClose}>Cancelar</button>
          <button type="button" className="lt-btn-lg" data-variant="primary" aria-disabled={busy || undefined} onClick={() => !busy && submit()}>
            <Icon name="check" size={16} /> {plan ? 'Salvar plano' : 'Criar plano'}
          </button>
        </>
      }
    >
      <div className="lt-df">
        <div>
          <label className="lt-flabel" htmlFor="adm-p-name">Nome</label>
          <input id="adm-p-name" className="lt-adm-input" value={name} maxLength={30} onChange={(e) => setName(e.target.value)} placeholder="Pro" autoComplete="off" />
        </div>
        <div className="lt-set-card" style={{ padding: '0 14px' }}>
          <Stepper id="adm-p-debtors" label="Devedores" value={debtors} step={5} onChange={setDebtors} />
          <Stepper id="adm-p-debts" label="Dívidas" value={debts} step={10} onChange={setDebts} />
        </div>
        <div className="lt-set-card" style={{ padding: '0 14px' }}>
          <Switch on={showUsage} title="Mostrar o uso sempre" sub="Seção “Seu plano” em Configurações. Desligado: só aparece ao atingir um limite" onClick={() => setShowUsage((v) => !v)} />
          <Switch
            on={isDefault}
            title="Padrão para novas contas"
            sub={plan?.isDefault ? 'Este já é o padrão. Para trocar, marque outro plano.' : 'Quem se cadastrar entra neste plano'}
            onClick={() => setIsDefault((v) => !v)}
            disabled={plan?.isDefault}
          />
        </div>
        {plan && <p className="lt-set-note" style={{ margin: 0 }}>{plan.lenders} {plan.lenders === 1 ? 'conta usa' : 'contas usam'} este plano. A mudança vale para todas elas.</p>}
        {plan && !plan.isDefault && (plan.lenders === 0
          ? <LinkButton onClick={remove} style={{ alignSelf: 'flex-start', color: 'var(--overdue)' }}><Icon name="trash" size={12} /> Excluir plano</LinkButton>
          : <p className="lt-set-note" style={{ margin: 0 }}>Para excluir, mova antes as contas para outro plano.</p>)}
        {err && <p className="lt-field-error" role="alert" style={{ margin: 0 }}>{err}</p>}
      </div>
    </Modal>
  )
}

/** Plano e ajuste de uma conta (melhoria 63). */
export function LenderSheet({ lender, plans, onClose }: { lender: AdminLender | null; plans: AdminPlan[]; onClose: () => void }) {
  return lender ? <LenderForm key={lender.id} lender={lender} plans={plans} onClose={onClose} /> : null
}

function LenderForm({ lender, plans, onClose }: { lender: AdminLender; plans: AdminPlan[]; onClose: () => void }) {
  const { showToast } = useToast()
  const update = useUpdateLenderPlan()
  const [planId, setPlanId] = useState(lender.plan?.id ?? plans.find((p) => p.isDefault)?.id ?? '')
  const [adj, setAdj] = useState(lender.maxDebtors !== null || lender.maxDebts !== null)
  const [ownDebtors, setOwnDebtors] = useState(lender.maxDebtors !== null ? String(lender.maxDebtors) : '')
  const [ownDebts, setOwnDebts] = useState(lender.maxDebts !== null ? String(lender.maxDebts) : '')
  const [err, setErr] = useState('')
  const P = plans.find((p) => p.id === planId)
  const def = plans.find((p) => p.isDefault)

  const save = () => {
    const own = (s: string) => (adj && toInt(s) > 0 ? Math.min(MAX, toInt(s)) : null)
    update.mutate(
      // The default plan is saved as "no plan": the account follows whatever plan is the default.
      { id: lender.id, data: { planId: planId === def?.id ? null : planId, maxDebtors: own(ownDebtors), maxDebts: own(ownDebts) } },
      {
        onSuccess: (l) => {
          showToast(`${(l.name ?? l.email).split(' ')[0]} · plano ${l.plan?.name ?? '—'}${l.maxDebtors !== null || l.maxDebts !== null ? ' com ajuste' : ''}`, { icon: 'check' })
          onClose()
        },
        onError: (e: unknown) => setErr(translateApiError(getApiError(e), 'Não foi possível salvar.')),
      },
    )
  }

  const own = (label: string, id: string, value: string, set: (v: string) => void, used: number, planLimit: number | undefined) => (
    <div>
      <label className="lt-flabel" htmlFor={id}>{label} · usa {fmtCount(used)} · plano {planLimit !== undefined ? fmtCount(planLimit) : '—'}</label>
      <input id={id} className="lt-adm-input" inputMode="numeric" maxLength={6} value={value} onChange={(e) => set(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="Vazio = o do plano" />
    </div>
  )

  return (
    <Modal
      open
      onClose={onClose}
      title={lender.name ?? lender.email}
      footer={
        <>
          <button type="button" className="lt-btn-lg" data-variant="secondary" onClick={onClose}>Cancelar</button>
          <button type="button" className="lt-btn-lg" data-variant="primary" aria-disabled={update.isPending || undefined} onClick={() => !update.isPending && save()}>
            <Icon name="check" size={16} /> Salvar
          </button>
        </>
      }
    >
      <div className="lt-df">
        <p className="lt-set-s" style={{ margin: 0 }}>{lender.email} · desde {fmtBR(lender.createdAt.slice(0, 10))}</p>
        {lender.limitRequestedAt && (
          <div className="lt-lim-tip" style={{ display: 'flex', gap: 8 }}>
            <Icon name="send" size={16} />
            <span>Pediu mais limite em {fmtBR(lender.limitRequestedAt.slice(0, 10))}. Ao salvar, o pedido some daqui; responda pelo e-mail que você recebeu.</span>
          </div>
        )}
        <div>
          <div className="lt-flabel" id="adm-plan-l">Plano</div>
          <div className="lt-adm-group" role="radiogroup" aria-labelledby="adm-plan-l">
            {plans.map((p) => (
              <button key={p.id} type="button" role="radio" aria-checked={planId === p.id} aria-label={`${p.name}${p.isDefault ? " (padrão)" : ""}: ${p.maxDebtors} devedores, ${p.maxDebts} dívidas`} className="lt-adm-radio" onClick={() => setPlanId(p.id)}>
                <span className="dot" aria-hidden="true" />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span className="lt-set-t" style={{ display: 'block' }}>{p.name}{p.isDefault && ' (padrão)'}</span>
                  <span className="lt-set-s">{fmtCount(p.maxDebtors)} devedores · {fmtCount(p.maxDebts)} dívidas</span>
                </span>
              </button>
            ))}
          </div>
        </div>
        <Switch on={adj} title="Ajuste só desta conta" sub="Para um caso pontual, sem criar um plano novo. Vale por cima do plano." onClick={() => setAdj((v) => !v)} />
        {adj && (
          <>
            {own('Devedores', 'adm-own-debtors', ownDebtors, setOwnDebtors, lender.debtors.used, P?.maxDebtors)}
            {own('Dívidas', 'adm-own-debts', ownDebts, setOwnDebts, lender.debts.used, P?.maxDebts)}
          </>
        )}
        <p className="lt-set-note" style={{ margin: 0 }}>Se a conta já passou do novo limite, ela não perde nada: só não cadastra mais. A pessoa vê a mudança na próxima vez que abrir o app.</p>
        {err && <p className="lt-field-error" role="alert" style={{ margin: 0 }}>{err}</p>}
      </div>
    </Modal>
  )
}
