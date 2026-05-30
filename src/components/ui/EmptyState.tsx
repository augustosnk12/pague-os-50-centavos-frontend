import type { ReactNode } from 'react'
import { Icon } from './Icon'

interface EmptyStateProps {
  icon?: string
  title: string
  sub?: string
  action?: ReactNode
  className?: string
}

export function EmptyState({ icon = 'wallet', title, sub, action, className }: EmptyStateProps) {
  return (
    <div
      className={className}
      style={{
        textAlign: 'center',
        padding: '48px 24px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: '26%',
          background: 'var(--primary-weak)',
          display: 'grid',
          placeItems: 'center',
          marginBottom: 8,
        }}
      >
        <Icon name={icon} size={28} color="var(--primary)" />
      </div>
      <div style={{ fontWeight: 800, fontSize: 17 }}>{title}</div>
      {sub && <div style={{ color: 'var(--text-muted)', fontSize: 14, maxWidth: 280 }}>{sub}</div>}
      {action && <div style={{ marginTop: 12 }}>{action}</div>}
    </div>
  )
}
