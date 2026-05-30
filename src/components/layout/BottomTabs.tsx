import { useNavigate, useLocation } from 'react-router-dom'
import { Icon } from '../ui/Icon'
import { NAV } from '../../constants/nav'

interface BottomTabsProps {
  onAccount: () => void
  overdueCount: number
}

export function BottomTabs({ onAccount, overdueCount }: BottomTabsProps) {
  const navigate = useNavigate()
  const location = useLocation()

  const isActive = (path: string) => location.pathname.startsWith(path)

  return (
    <nav
      className="lt-bottom-tabs"
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 95,
        background: 'color-mix(in oklch, var(--surface) 92%, transparent)',
        backdropFilter: 'blur(16px)',
        borderTop: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'stretch',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        boxShadow: '0 -2px 16px oklch(0.4 0.05 var(--accent-h) / 0.06)',
      }}
    >
      {NAV.slice(0, 2).map((n) => (
        <Tab key={n.path} label={n.label} icon={n.icon} active={isActive(n.path)} onClick={() => navigate(n.path)} />
      ))}

      {/* Raised center "+" button */}
      <div style={{ flex: 1, display: 'grid', placeItems: 'center', position: 'relative' }}>
        <button
          onClick={() => navigate('/debts/new')}
          aria-label="Nova cobrança"
          style={{
            position: 'absolute',
            top: -22,
            width: 56,
            height: 56,
            borderRadius: '32%',
            border: '4px solid var(--bg)',
            cursor: 'pointer',
            background: 'var(--primary)',
            color: 'var(--on-primary)',
            display: 'grid',
            placeItems: 'center',
            boxShadow: 'var(--shadow-primary)',
            transition: 'transform .15s',
          }}
          onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.92)' }}
          onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)' }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)' }}
        >
          <Icon name="plus" size={26} strokeWidth={2.6} />
        </button>
      </div>

      <Tab label={NAV[2].label} icon={NAV[2].icon} active={isActive(NAV[2].path)} onClick={() => navigate(NAV[2].path)} badge={overdueCount} />

      {/* Conta */}
      <Tab label="Conta" icon="user" active={false} onClick={onAccount} />
    </nav>
  )
}

interface TabProps {
  label: string
  icon: string
  active: boolean
  onClick: () => void
  badge?: number
}

function Tab({ label, icon, active, onClick, badge = 0 }: TabProps) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 3,
        padding: '8px 0 4px',
        border: 'none',
        background: 'transparent',
        cursor: 'pointer',
        color: active ? 'var(--primary)' : 'var(--text-faint)',
        transition: 'color .15s',
        position: 'relative',
      }}
    >
      <span style={{ position: 'relative', display: 'grid', placeItems: 'center' }}>
        <Icon name={icon} size={23} strokeWidth={active ? 2.4 : 2} />
        {badge > 0 && (
          <span
            style={{
              position: 'absolute',
              top: -4,
              right: -8,
              minWidth: 16,
              height: 16,
              padding: '0 4px',
              borderRadius: 99,
              background: 'var(--overdue)',
              color: '#fff',
              fontSize: 10,
              fontWeight: 800,
              display: 'grid',
              placeItems: 'center',
              border: '2px solid var(--surface)',
            }}
          >
            {badge}
          </span>
        )}
      </span>
      <span style={{ fontSize: 11, fontWeight: active ? 800 : 600, letterSpacing: '-0.01em' }}>{label}</span>
    </button>
  )
}
