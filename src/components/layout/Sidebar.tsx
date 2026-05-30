import { useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Logo } from './Logo'
import { Avatar } from '../ui/Avatar'
import { Icon } from '../ui/Icon'
import { IconButton } from '../ui/IconButton'
import { Button } from '../ui/Button'
import { useTheme } from '../../contexts/ThemeContext'
import { useAuth } from '../../contexts/AuthContext'

const NAV = [
  { path: '/dashboard', label: 'Painel', icon: 'home' },
  { path: '/debtors', label: 'Devedores', icon: 'users' },
  { path: '/installments', label: 'Parcelas', icon: 'calendar' },
]

interface SidebarProps {
  open: boolean
  onClose: () => void
  onNewDebt: () => void
}

export function Sidebar({ open, onClose, onNewDebt }: SidebarProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const { theme, toggleTheme } = useTheme()
  const { lender, logout } = useAuth()

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  const activeRoute = NAV.find((n) => location.pathname.startsWith(n.path))?.path

  const goTo = (path: string) => {
    navigate(path)
    onClose()
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 150,
        background: 'oklch(0.2 0.03 var(--accent-h) / 0.45)',
        backdropFilter: 'blur(2px)',
        animation: 'ltFade .2s ease',
      }}
    >
      <aside
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          bottom: 0,
          width: 290,
          maxWidth: '82vw',
          background: 'var(--surface)',
          borderRight: '1px solid var(--border)',
          boxShadow: 'var(--shadow-lg)',
          display: 'flex',
          flexDirection: 'column',
          animation: 'ltSlideInLeft .3s cubic-bezier(0.22,1,0.36,1)',
          padding: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, paddingLeft: 4 }}>
          <Logo size={28} />
          <IconButton name="x" onClick={onClose} label="Fechar" />
        </div>

        {lender && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              background: 'var(--surface-2)',
              borderRadius: 'calc(var(--radius)*0.7)',
              padding: 12,
              marginBottom: 16,
            }}
          >
            <Avatar name={lender.name ?? lender.email} size={42} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 800, fontSize: 15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {lender.name}
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {lender.email}
              </div>
            </div>
          </div>
        )}

        <nav style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {NAV.map((n) => (
            <button
              key={n.path}
              onClick={() => goTo(n.path)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 13,
                padding: '13px 14px',
                borderRadius: 13,
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
                background: activeRoute === n.path ? 'var(--primary-weak)' : 'transparent',
                color: activeRoute === n.path ? 'var(--primary)' : 'var(--text)',
                fontWeight: 700,
                fontSize: 15.5,
                transition: 'background .15s',
              }}
            >
              <Icon name={n.icon} size={20} />
              {n.label}
            </button>
          ))}
        </nav>

        <div style={{ marginTop: 16 }}>
          <Button
            full
            size="md"
            icon="plus"
            onClick={() => { onNewDebt(); onClose() }}
          >
            Nova cobrança
          </Button>
        </div>

        <div style={{ flex: 1 }} />

        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <button
            onClick={toggleTheme}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 13,
              padding: '12px 14px',
              borderRadius: 13,
              border: 'none',
              cursor: 'pointer',
              textAlign: 'left',
              background: 'transparent',
              color: 'var(--text)',
              fontWeight: 700,
              fontSize: 14.5,
            }}
          >
            <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={19} />
            {theme === 'dark' ? 'Tema claro' : 'Tema escuro'}
          </button>
          <button
            onClick={() => { logout(); onClose() }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 13,
              padding: '12px 14px',
              borderRadius: 13,
              border: 'none',
              cursor: 'pointer',
              textAlign: 'left',
              background: 'transparent',
              color: 'var(--overdue)',
              fontWeight: 700,
              fontSize: 14.5,
            }}
          >
            <Icon name="logout" size={19} />
            Sair
          </button>
        </div>
      </aside>
    </div>
  )
}
