import { Icon } from './Icon'

export type BadgeTone = 'paid' | 'overdue' | 'pending' | 'muted'

/**
 * A short status pill (improvement 31): "Recebido", "R$ 60,00 em atraso",
 * "Arquivado". Colour comes from the tone; the text always says it too.
 */
export function StatusBadge({ tone, icon, children, small }: { tone: BadgeTone; icon?: string; children: React.ReactNode; small?: boolean }) {
  return (
    <span className="lt-badge" data-tone={tone} data-small={small || undefined}>
      {icon && <Icon name={icon} size={11} strokeWidth={tone === 'muted' ? 2 : 3} />}
      {children}
    </span>
  )
}
