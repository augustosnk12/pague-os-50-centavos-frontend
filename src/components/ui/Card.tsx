import { useState, type CSSProperties, type ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  onClick?: () => void
  style?: CSSProperties
  hover?: boolean
  pad?: number
  className?: string
}

export function Card({ children, onClick, style, hover: enableHover, pad = 18, className }: CardProps) {
  const [hover, setHover] = useState(false)
  return (
    <div
      onClick={onClick}
      className={className}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        padding: pad,
        boxShadow: enableHover && hover ? 'var(--shadow-md)' : 'var(--shadow-sm)',
        transition: 'box-shadow .2s, transform .15s, border-color .2s',
        cursor: onClick ? 'pointer' : 'default',
        transform: enableHover && hover ? 'translateY(-2px)' : 'none',
        borderColor: enableHover && hover ? 'var(--border-strong)' : 'var(--border)',
        ...style,
      }}
    >
      {children}
    </div>
  )
}
