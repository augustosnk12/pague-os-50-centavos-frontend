import { Icon } from './Icon'
import { STATUS_META } from '../../lib/utils'
import type { InstallmentStatus } from '../../types/installment'

export interface ToastAction {
  label: string
  onClick: () => void
}

export interface ToastData {
  msg: string
  icon?: string
  status?: InstallmentStatus
  /** e.g. "Desfazer" (improvement 7). Toasts with an action stay longer. */
  action?: ToastAction
}

interface ToastProps {
  toast: (ToastData & { id: number }) | null
  leaving: boolean
  onAction: () => void
  onPause: (paused: boolean) => void
}

/**
 * The visible toast. The live region that announces it is rendered by
 * ToastProvider (one persistent region, see ToastContext).
 */
export function Toast({ toast, leaving, onAction, onPause }: ToastProps) {
  if (!toast) return null
  const m = toast.status ? STATUS_META[toast.status] : null
  return (
    // Hover pauses the timer; keyboard users get the same through focus (onFocus/onBlur).
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions
    <div
      key={toast.id}
      className="lt-toast"
      data-leaving={leaving || undefined}
      onMouseEnter={() => onPause(true)}
      onMouseLeave={() => onPause(false)}
      onFocus={() => onPause(true)}
      onBlur={() => onPause(false)}
      style={{
        position: 'fixed',
        left: '50%',
        bottom: 26,
        zIndex: 400,
        background: 'var(--text)',
        color: 'var(--bg)',
        padding: toast.action ? '9px 9px 9px 18px' : '13px 20px',
        borderRadius: 99,
        fontWeight: 700,
        fontSize: 14.5,
        boxShadow: 'var(--shadow-lg)',
        display: 'flex',
        alignItems: 'center',
        gap: 9,
        maxWidth: '92vw',
      }}
    >
      <Icon name={toast.icon ?? 'check'} size={18} strokeWidth={2.6} color={m ? m.color : 'var(--primary)'} />
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{toast.msg}</span>
      {toast.action && (
        <button
          type="button"
          onClick={onAction}
          style={{
            marginLeft: 4,
            flexShrink: 0,
            border: 'none',
            borderRadius: 99,
            padding: '7px 13px',
            background: 'color-mix(in oklch, var(--bg) 18%, transparent)',
            color: 'var(--bg)',
            fontWeight: 800,
            fontSize: 13.5,
            cursor: 'pointer',
          }}
        >
          {toast.action.label}
        </button>
      )}
    </div>
  )
}
