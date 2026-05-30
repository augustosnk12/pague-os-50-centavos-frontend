import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Logo } from './Logo'
import { Button } from '../ui/Button'
import { IconButton } from '../ui/IconButton'
import { Icon } from '../ui/Icon'
import { useTheme } from '../../contexts/ThemeContext'
import { useAuth } from '../../contexts/AuthContext'
import { Avatar } from '../ui/Avatar'
import { NAV } from '../../constants/nav'

function UserMenu() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const { theme, toggleTheme } = useTheme()
  const { logout, lender } = useAuth()

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const itemStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '11px 14px',
    borderRadius: 10,
    border: 'none',
    cursor: 'pointer',
    background: 'transparent',
    fontFamily: 'inherit',
    fontWeight: 700,
    fontSize: 14,
    width: '100%',
    textAlign: 'left',
    whiteSpace: 'nowrap',
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <IconButton name="user" onClick={() => setOpen((v) => !v)} label="Conta" />

      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'calc(var(--radius) * 0.7)',
            boxShadow: 'var(--shadow-lg)',
            padding: 6,
            minWidth: 190,
            zIndex: 200,
            animation: 'ltScaleIn .18s cubic-bezier(0.22,1,0.36,1)',
          }}
        >
          {lender && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 11, background: 'var(--surface-2)', borderRadius: 'calc(var(--radius)*0.6)', padding: '10px 12px', marginBottom: 4 }}>
                <Avatar name={lender.name ?? lender.email} size={38} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{lender.name ?? '—'}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{lender.email}</div>
                </div>
              </div>
              <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
            </>
          )}

          <button
            style={{ ...itemStyle, color: 'var(--text)' }}
            onClick={() => { toggleTheme(); setOpen(false) }}
          >
            <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={17} />
            {theme === 'dark' ? 'Tema claro' : 'Tema escuro'}
          </button>

          <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />

          <button
            style={{ ...itemStyle, color: 'var(--overdue)' }}
            onClick={() => { logout(); setOpen(false) }}
          >
            <Icon name="logout" size={17} />
            Sair
          </button>
        </div>
      )}
    </div>
  )
}

export function Header() {
  const navigate = useNavigate()
  const location = useLocation()

  const activeRoute = NAV.find((n) => location.pathname.startsWith(n.path))?.path

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 90,
        background: 'color-mix(in oklch, var(--bg) 86%, transparent)',
        backdropFilter: 'blur(14px)',
        borderBottom: '1px solid var(--border)',
      }}
    >
      <div
        style={{
          maxWidth: 1080,
          margin: '0 auto',
          padding: '11px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <div onClick={() => navigate('/dashboard')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          <Logo size={26} />
        </div>

        <nav className="lt-desktop-nav" style={{ marginLeft: 18, gap: 4 }}>
          {NAV.map((n) => (
            <button
              key={n.path}
              onClick={() => navigate(n.path)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '9px 14px',
                borderRadius: 11,
                border: 'none',
                cursor: 'pointer',
                background: activeRoute === n.path ? 'var(--primary-weak)' : 'transparent',
                color: activeRoute === n.path ? 'var(--primary)' : 'var(--text-muted)',
                fontWeight: 700,
                fontSize: 14.5,
                fontFamily: 'inherit',
                transition: 'background .15s, color .15s',
              }}
            >
              {n.label}
            </button>
          ))}
        </nav>

        <div style={{ flex: 1 }} />

        <span className="lt-desktop-only" style={{ marginRight: 2 }}>
          <Button size="sm" icon="plus" onClick={() => navigate('/debts/new')}>Nova cobrança</Button>
        </span>

        <UserMenu />

        {/* notification bell — temporarily disabled
        <div style={{ position: 'relative' }}>
          <IconButton name="bell" label="Atrasados" onClick={() => navigate('/installments')} />
          ...
        </div>
        */}
      </div>
    </header>
  )
}
