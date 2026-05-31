import type React from 'react'
import { Modal } from '../ui/Modal'
import { Avatar } from '../ui/Avatar'
import { Icon } from '../ui/Icon'
import { useAuth } from '../../contexts/AuthContext'
import { useTheme } from '../../contexts/ThemeContext'

interface AccountSheetProps {
  open: boolean
  onClose: () => void
}

export function AccountSheet({ open, onClose }: AccountSheetProps) {
  const { lender, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()

  if (!lender) return null

  const rowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 13,
    padding: 14,
    borderRadius: 13,
    border: '1px solid var(--border)',
    cursor: 'pointer',
    textAlign: 'left',
    background: 'var(--surface)',
    fontFamily: 'inherit',
    fontWeight: 700,
    fontSize: 15,
    width: '100%',
  }

  return (
    <Modal open={open} onClose={onClose} title="Conta">
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 13,
          background: 'var(--surface-2)',
          borderRadius: 'calc(var(--radius)*0.7)',
          padding: 14,
          marginBottom: 14,
        }}
      >
        <Avatar name={lender.name ?? lender.email} size={48} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: 16, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {lender.name ?? '—'}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {lender.email}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <button
          onClick={() => { toggleTheme(); onClose() }}
          style={{ ...rowStyle, color: 'var(--text)' }}
        >
          <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={20} />
          {theme === 'dark' ? 'Tema claro' : 'Tema escuro'}
        </button>

        <button
          onClick={() => { logout(); onClose() }}
          style={{ ...rowStyle, color: 'var(--overdue)' }}
        >
          <Icon name="logout" size={20} />
          Sair
        </button>
      </div>

      <div style={{ marginTop: 14, textAlign: 'center', fontSize: 12, color: 'var(--text-faint)', letterSpacing: '0.02em' }}>
        v{__APP_VERSION__}
      </div>
    </Modal>
  )
}
