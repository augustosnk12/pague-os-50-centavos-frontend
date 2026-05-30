import { Icon } from './Icon'
import { STATUS_META } from '../../lib/utils'
import type { InstallmentStatus } from '../../types/installment'

export interface ToastData {
  msg: string
  icon?: string
  status?: InstallmentStatus
}

interface ToastProps {
  toast: ToastData | null
}

export function Toast({ toast }: ToastProps) {
  if (!toast) return null
  const m = toast.status ? STATUS_META[toast.status] : null
  return (
    <div
      style={{
        position: 'fixed',
        left: '50%',
        bottom: 26,
        transform: 'translateX(-50%)',
        zIndex: 400,
        background: 'var(--text)',
        color: 'var(--bg)',
        padding: '13px 20px',
        borderRadius: 99,
        fontWeight: 700,
        fontSize: 14.5,
        boxShadow: 'var(--shadow-lg)',
        display: 'flex',
        alignItems: 'center',
        gap: 9,
        animation: 'ltPop .35s cubic-bezier(0.22,1,0.36,1)',
        maxWidth: '90vw',
        whiteSpace: 'nowrap',
      }}
    >
      <Icon name={toast.icon ?? 'check'} size={18} strokeWidth={2.6} color={m ? m.color : 'var(--primary)'} />
      {toast.msg}
    </div>
  )
}
