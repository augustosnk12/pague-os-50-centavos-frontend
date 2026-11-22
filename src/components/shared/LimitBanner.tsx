import { Icon } from '../ui/Icon'
import { LinkButton } from '../ui/LinkButton'
import { usePlanLimits } from '../../contexts/PlanLimitsContext'
import { limitReachedText, type LimitKind } from '../../lib/planLimits'

/** Red notice, only once a limit is reached (melhoria 62): "Você chegou ao limite de 10 devedores." */
export function LimitBanner({ kinds }: { kinds: LimitKind[] }) {
  const { plan, isFull, openLimit } = usePlanLimits()
  const kind = kinds.find(isFull)
  if (!plan || !kind) return null
  return (
    <div className="lt-lim-banner" role="status">
      <Icon name="alert" size={16} />
      <span>{limitReachedText(plan, kind)}</span>
      <LinkButton onClick={() => openLimit(kind)} style={{ flexShrink: 0 }}>Saiba mais</LinkButton>
    </div>
  )
}
