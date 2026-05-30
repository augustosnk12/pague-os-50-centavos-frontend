import { useState, type CSSProperties } from 'react'
import { Icon } from './Icon'

interface IconButtonProps {
  name: string
  onClick?: () => void
  size?: number
  label?: string
  active?: boolean
  style?: CSSProperties
  className?: string
}

export function IconButton({ name, onClick, size = 20, label, active, style, className }: IconButtonProps) {
  const [hover, setHover] = useState(false)
  return (
    <button
      aria-label={label}
      onClick={onClick}
      className={className}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'grid',
        placeItems: 'center',
        width: 42,
        height: 42,
        borderRadius: 12,
        cursor: 'pointer',
        background: active ? 'var(--primary-weak)' : hover ? 'var(--surface-hover)' : 'transparent',
        color: active ? 'var(--primary)' : 'var(--text-muted)',
        border: 'none',
        transition: 'background .15s, color .15s',
        ...style,
      }}
    >
      <Icon name={name} size={size} />
    </button>
  )
}
