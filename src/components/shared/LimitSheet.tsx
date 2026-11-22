import { Modal } from '../ui/Modal'
import { Icon } from '../ui/Icon'
import { useLimitRequest } from '../../hooks/plan/useLimitRequest'
import type { MyPlan, UsageItem } from '../../api/plan.api'
import { FREE_WHY, LIMIT_TIPS, LIMIT_WORDS, fmtCount, isFreePlan, limitLead, meterPct, type LimitKind } from '../../lib/planLimits'

/** "11 de 10" + bar + "Limite atingido" / "Restam 39". */
export function LimitMeter({ kind, usage }: { kind: LimitKind; usage: UsageItem }) {
  if (usage.limit === null) return null
  return (
    <div className="lt-lim-m">
      <div className="lt-lim-top">
        <span className="lt-set-t">{LIMIT_WORDS[kind].title}</span>
        <span className="lt-set-t" data-full={usage.full || undefined}>{fmtCount(usage.used)} de {fmtCount(usage.limit)}</span>
      </div>
      <div className="lt-lim-bar" aria-hidden="true"><span data-full={usage.full || undefined} style={{ width: `${meterPct(usage)}%` }} /></div>
      <div className="lt-set-s" data-full={usage.full || undefined}>{usage.full ? 'Limite atingido' : `Restam ${fmtCount(Math.max(0, usage.limit - usage.used))}`}</div>
    </div>
  )
}

export function LimitRequestButton({ sent, pending, onClick, size = 'lg' }: { sent: boolean; pending: boolean; onClick: () => void; size?: 'lg' | 'sm' }) {
  return (
    <button
      type="button"
      className={size === 'lg' ? 'lt-btn-lg' : 'lt-lim-btn'}
      data-variant={sent ? 'secondary' : 'primary'}
      aria-disabled={sent || pending || undefined}
      onClick={onClick}
    >
      <Icon name={sent ? 'check' : 'send'} size={16} /> {sent ? 'Pedido enviado' : pending ? 'Enviando…' : 'Pedir mais limite'}
    </button>
  )
}

/** Opens when a limit stops a new debtor or debt (melhoria 62). */
export function LimitSheet({ open, onClose, kind, plan }: { open: boolean; onClose: () => void; kind: LimitKind; plan: MyPlan | undefined }) {
  const r = useLimitRequest(plan)
  if (!plan) return null
  const free = isFreePlan(plan)
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={free ? 'Limite atingido' : `Limite do plano ${plan.plan?.name ?? ''}`}
      footer={
        <>
          <button type="button" className="lt-btn-lg" data-variant="secondary" onClick={onClose}>{r.sent ? 'Fechar' : 'Agora não'}</button>
          <LimitRequestButton sent={r.sent} pending={r.pending} onClick={r.send} />
        </>
      }
    >
      <div className="lt-df lt-lim-sheet">
        <span className="lt-lim-ic" aria-hidden="true"><Icon name={LIMIT_WORDS[kind].icon} size={24} /></span>
        <p className="lt-lim-lead">{limitLead(plan, kind)}</p>
        {free && <p className="lt-lim-why">{FREE_WHY}</p>}
        <LimitMeter kind={kind} usage={plan[kind]} />
        <p className="lt-lim-tip">{LIMIT_TIPS[kind]}</p>
        <p className="lt-lim-note" data-sent={r.sent || undefined} role="status">{r.sent && <Icon name="check" size={12} />} {r.note}</p>
      </div>
    </Modal>
  )
}
