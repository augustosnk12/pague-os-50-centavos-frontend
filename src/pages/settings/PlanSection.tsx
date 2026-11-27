import { Icon } from '../../components/ui/Icon'
import { SectionHeader } from '../../components/ui/ListGroup'
import { LimitMeter, LimitRequestButton } from '../../components/shared/LimitSheet'
import { useLimitRequest } from '../../hooks/plan/useLimitRequest'
import type { MyPlan } from '../../api/plan.api'
import { FREE_WHY, fmtCount, isFreePlan, showPlanSection } from '../../lib/planLimits'

/**
 * "Seus limites" (Grátis, só ao atingir um limite) / "Seu plano" (planos com
 * "mostrar o uso sempre", como o Pro) em Configurações — melhoria 62.
 */
export function PlanSection({ plan }: { plan: MyPlan | undefined }) {
  const r = useLimitRequest(plan)
  if (!plan || !showPlanSection(plan)) return null
  const free = isFreePlan(plan)
  const limits = `Até ${fmtCount(plan.debtors.limit ?? 0)} pessoas e ${fmtCount(plan.debts.limit ?? 0)} dívidas`
  return (
    <>
      <SectionHeader variant="plain">{free ? 'Seus limites' : 'Seu plano'}</SectionHeader>
      <div className="lt-set-card lt-lim-card">
        <div className="lt-lim-head">
          <span className="lt-set-ic" aria-hidden="true"><Icon name={free ? 'info' : 'zap'} size={16} /></span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="lt-set-t">{free ? limits : `Plano ${plan.plan!.name}`}</div>
            <div className="lt-set-s" style={{ lineHeight: 1.5 }}>{free ? FREE_WHY : limits}</div>
          </div>
        </div>
        <LimitMeter kind="debtors" usage={plan.debtors} />
        <LimitMeter kind="debts" usage={plan.debts} />
        <p className="lt-set-note" style={{ margin: 0 }}>Toda dívida criada entra na conta, mesmo depois de quitada ou excluída. Pessoas dos dois lados e arquivadas também contam.</p>
        <div className="lt-lim-cta">
          <p role="status">{r.note}</p>
          <LimitRequestButton size="sm" sent={r.sent} pending={r.pending} onClick={r.send} />
        </div>
      </div>
    </>
  )
}
