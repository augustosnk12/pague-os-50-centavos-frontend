import { useState, type ButtonHTMLAttributes, type CSSProperties, type Ref } from 'react'
import { Icon } from './Icon'

interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'style' | 'children' | 'name'> {
  name: string
  /** Required: an icon-only button has no other accessible name (improvement 20). */
  label: string
  size?: number
  active?: boolean
  style?: CSSProperties
  ref?: Ref<HTMLButtonElement>
}

export function IconButton({ name, onClick, size = 20, label, active, style, className, ref, type = 'button', ...rest }: IconButtonProps) {
  const [hover, setHover] = useState(false)
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={rest.title ?? label}
      onClick={onClick}
      className={className ? `lt-icon-btn ${className}` : 'lt-icon-btn'}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      {...rest}
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
