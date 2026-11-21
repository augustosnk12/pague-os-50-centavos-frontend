import { Icon } from './Icon'
import { Button } from './Button'

interface ErrorStateProps {
  onRetry: () => void
  /** Default: "Não foi possível carregar". */
  title?: string
  retrying?: boolean
}

/**
 * Load failure inside the screen (improvement 47). Says plainly that nothing
 * was lost — an empty list here used to look like "no data".
 */
export function ErrorState({ onRetry, title = 'Não foi possível carregar', retrying }: ErrorStateProps) {
  return (
    <div
      role="alert"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--r-lg)',
        padding: '22px 18px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        gap: 10,
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      <span style={{ width: 46, height: 46, borderRadius: 'var(--r-md)', background: 'var(--overdue-weak)', display: 'grid', placeItems: 'center' }}>
        <Icon name="alert" size={24} color="var(--overdue)" />
      </span>
      <div style={{ fontWeight: 800, fontSize: '1rem' }}>{title}</div>
      <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.875rem', lineHeight: 1.5, maxWidth: 340 }}>
        Verifique a conexão e tente de novo. Seus dados continuam salvos.
      </p>
      <Button variant="secondary" icon="refresh" onClick={onRetry} disabled={retrying}>
        {retrying ? 'Tentando…' : 'Tentar de novo'}
      </Button>
    </div>
  )
}
