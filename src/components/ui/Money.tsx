import type { CSSProperties } from 'react'
import { moneyParts } from '../../lib/utils'

interface MoneyProps {
  value: number | string
  size?: number
  weight?: number
  muted?: boolean
  color?: string
  style?: CSSProperties
}

export function Money({ value, size = 28, weight = 800, muted, color, style }: MoneyProps) {
  const p = moneyParts(value)
  return (
    <span
      style={{
        color: color ?? (muted ? 'var(--text-muted)' : 'var(--text)'),
        fontWeight: weight,
        letterSpacing: '-0.02em',
        whiteSpace: 'nowrap',
        display: 'inline-flex',
        alignItems: 'baseline',
        gap: 3,
        ...style,
      }}
    >
      <span style={{ fontSize: size * 0.6, fontWeight: 700, opacity: 0.7 }}>{p.symbol}</span>
      <span style={{ fontSize: size }}>{p.int}</span>
      <span style={{ fontSize: size * 0.55, fontWeight: 700, opacity: 0.7 }}>,{p.dec}</span>
    </span>
  )
}
