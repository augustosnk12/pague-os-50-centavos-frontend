import { useState, type CSSProperties, type ReactNode } from 'react'
import { Icon } from './Icon'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'soft' | 'danger' | 'paid'
export type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps {
  children?: ReactNode
  variant?: ButtonVariant
  size?: ButtonSize
  icon?: string
  iconRight?: string
  full?: boolean
  onClick?: () => void
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
  style?: CSSProperties
  className?: string
}

const VARIANTS: Record<ButtonVariant, CSSProperties> = {
  primary: { background: 'var(--primary)', color: 'var(--on-primary)', boxShadow: 'var(--shadow-primary)' },
  secondary: { background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border-strong)', boxShadow: 'var(--shadow-sm)' },
  ghost: { background: 'transparent', color: 'var(--text-muted)' },
  soft: { background: 'var(--primary-weak)', color: 'var(--primary)' },
  danger: { background: 'var(--overdue-weak)', color: 'var(--overdue)' },
  paid: { background: 'var(--paid)', color: '#fff' },
}

const HOVER_VARIANTS: Record<ButtonVariant, CSSProperties> = {
  primary: { background: 'var(--primary-hover)' },
  secondary: { background: 'var(--surface-hover)' },
  ghost: { background: 'var(--surface-hover)' },
  soft: {},
  danger: {},
  paid: {},
}

export function Button({ children, variant = 'primary', size = 'md', icon, iconRight, full, onClick, disabled, type, style, className }: ButtonProps) {
  const [hover, setHover] = useState(false)

  const base: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    border: '1px solid transparent',
    borderRadius: 'calc(var(--radius) * 0.66)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontWeight: 700,
    fontSize: size === 'lg' ? 17 : size === 'sm' ? 13.5 : 15,
    letterSpacing: '-0.01em',
    padding: size === 'lg' ? '15px 22px' : size === 'sm' ? '8px 13px' : '12px 18px',
    width: full ? '100%' : 'auto',
    transition: 'transform .12s ease, background .18s ease, box-shadow .2s ease, border-color .18s',
    opacity: disabled ? 0.55 : 1,
    whiteSpace: 'nowrap',
  }

  const hoverStyle = !disabled && hover ? HOVER_VARIANTS[variant] : {}

  return (
    <button
      type={type ?? 'button'}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={className}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onMouseDown={(e) => { if (!disabled) e.currentTarget.style.transform = 'scale(0.97)' }}
      onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)' }}
      style={{ ...base, ...VARIANTS[variant], ...hoverStyle, ...style }}
    >
      {icon && <Icon name={icon} size={size === 'sm' ? 16 : 18} />}
      {children}
      {iconRight && <Icon name={iconRight} size={size === 'sm' ? 16 : 18} />}
    </button>
  )
}
