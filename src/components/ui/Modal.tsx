import { useEffect, type ReactNode } from 'react'
import { IconButton } from './IconButton'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  footer?: ReactNode
}

export function Modal({ open, onClose, title, children, footer }: ModalProps) {
  useEffect(() => {
    if (!open) return
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  return (
    <div
      className="lt-sheet-wrap"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        background: 'oklch(0.2 0.03 var(--accent-h) / 0.5)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        justifyContent: 'center',
        animation: 'ltFade .2s ease',
      }}
    >
      <div
        className="lt-sheet"
        style={{
          background: 'var(--surface)',
          width: '100%',
          maxWidth: 460,
          borderRadius: 'calc(var(--radius) * 1.2) calc(var(--radius) * 1.2) 0 0',
          boxShadow: 'var(--shadow-lg)',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          animation: 'ltScaleIn .28s cubic-bezier(0.22,1,0.36,1)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 18px 12px' }}>
          <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em' }}>{title}</div>
          <IconButton name="x" onClick={onClose} label="Fechar" />
        </div>
        <div style={{ padding: '0 18px 18px', overflowY: 'auto', flex: 1 }}>{children}</div>
        {footer && (
          <div style={{ padding: 18, borderTop: '1px solid var(--border)', display: 'flex', gap: 10 }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
