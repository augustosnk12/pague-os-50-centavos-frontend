import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { scrollTopIfActive } from '../../lib/scroll'
import { preloadRoute } from '../../router/routes'
import { Logo } from './Logo'
import { Button } from '../ui/Button'
import { IconButton } from '../ui/IconButton'
import { Icon } from '../ui/Icon'
import { useTheme } from '../../contexts/ThemeContext'
import { useAuth } from '../../contexts/AuthContext'
import { Avatar } from '../ui/Avatar'
import { NAV } from '../../constants/nav'

function UserMenu({ onCalc }: { onCalc: () => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const { theme, toggleTheme } = useTheme()
  const { logout, lender } = useAuth()

  const close = (returnFocus: boolean) => {
    setOpen(false)
    if (returnFocus) trigger.current?.focus()
  }

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    // Focus the first item (menu pattern).
    // Focus the first VISIBLE item (Calculadora is hidden on desktop).
    requestAnimationFrame(() => {
      const items = Array.from(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])
      items.find((el) => el.offsetParent !== null)?.focus()
    })
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // Arrows / Home / End move between items; Esc closes and returns to the button (improvement 20).
  const onKeyDown = (e: React.KeyboardEvent) => {
    const all = Array.from(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])
    const items = all.filter((el) => el.offsetParent !== null || el === document.activeElement)
    const i = items.indexOf(document.activeElement as HTMLElement)
    const go = (n: number) => {
      e.preventDefault()
      items[(n + items.length) % items.length]?.focus()
    }
    if (e.key === 'ArrowDown') go(i + 1)
    else if (e.key === 'ArrowUp') go(i - 1)
    else if (e.key === 'Home') go(0)
    else if (e.key === 'End') go(items.length - 1)
    else if (e.key === 'Escape') {
      e.preventDefault()
      close(true)
    } else if (e.key === 'Tab') setOpen(false)
  }

  const item = (key: string, icon: string, text: string, onSelect: () => void, color = 'var(--text)') => (
    <button key={key} type="button" role="menuitem" className="lt-menu-item" data-gesture={key} style={{ color }} onClick={onSelect}>
      <span className="lt-menu-ic">
        <Icon name={icon} size={17} />
      </span>
      {text}
    </button>
  )

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <IconButton
        ref={trigger}
        name="user"
        label="Conta"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? 'user-menu' : undefined}
        onClick={() => setOpen((v) => !v)}
      />

      {open && (
        <div
          id="user-menu"
          ref={menuRef}
          role="menu"
          aria-label="Conta"
          tabIndex={-1}
          onKeyDown={onKeyDown}
          className="lt-user-menu"
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
            outline: 'none',
          }}
        >
          {lender && (
            <>
              <div role="presentation" style={{ display: 'flex', alignItems: 'center', gap: 11, background: 'var(--surface-2)', borderRadius: 'calc(var(--radius)*0.6)', padding: '10px 12px', marginBottom: 4 }}>
                <Avatar name={lender.name ?? lender.email} size={38} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{lender.name ?? '—'}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{lender.email}</div>
                </div>
              </div>
              <div role="separator" style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
            </>
          )}

          <div className="lt-mobile-only" role="none">
            {item('calc', 'calc', 'Calculadora', () => {
              close(false)
              onCalc()
            })}
            <div role="separator" style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
          </div>

          {item('theme', theme === 'dark' ? 'sun' : 'moon', theme === 'dark' ? 'Tema claro' : 'Tema escuro', () => {
            toggleTheme()
            close(true)
          })}

          <div role="separator" style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />

          {item('logout', 'logout', 'Sair', () => {
            close(false)
            logout()
          }, 'var(--overdue)')}

          <div role="none" style={{ padding: '6px 4px 2px', textAlign: 'center', fontSize: 11, color: 'var(--text-faint)', letterSpacing: '0.02em' }}>
            v{__APP_VERSION__}
          </div>
        </div>
      )}
    </div>
  )
}

interface HeaderProps {
  onCalc: () => void
}

export function Header({ onCalc }: HeaderProps) {
  const navigate = useNavigate()
  const location = useLocation()

  const activeRoute = NAV.find((n) => location.pathname.startsWith(n.path))?.path

  // Its height as --app-head-h, so sticky bars inside pages sit right below it.
  const headerRef = useRef<HTMLElement>(null)
  useEffect(() => {
    const el = headerRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => document.documentElement.style.setProperty('--app-head-h', `${el.offsetHeight}px`))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return (
    <header
      ref={headerRef}
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
        <Link to="/dashboard" aria-label="Pague os 50 centavos — ir para o Painel" style={{ display: 'flex', alignItems: 'center' }}>
          <Logo size={26} />
        </Link>

        <nav aria-label="Principal" className="lt-desktop-nav" style={{ marginLeft: 18, gap: 4 }}>
          {NAV.map((n) => (
            <Link
              key={n.path}
              to={n.path}
              aria-current={activeRoute === n.path ? 'page' : undefined}
              onClick={scrollTopIfActive(activeRoute === n.path)}
              onMouseEnter={() => preloadRoute(n.path)}
              onFocus={() => preloadRoute(n.path)}
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
            </Link>
          ))}
        </nav>

        <div style={{ flex: 1 }} />

        <span className="lt-desktop-only" style={{ marginRight: 2 }}>
          <Button size="sm" icon="plus" onClick={() => navigate('/debts/new')}>Nova dívida</Button>
        </span>

        <span className="lt-desktop-only">
          <IconButton name="calc" onClick={onCalc} label="Calculadora" />
        </span>

        <UserMenu onCalc={onCalc} />

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
