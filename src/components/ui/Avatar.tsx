import { avatarHue } from '../../lib/utils'

interface AvatarProps {
  name: string
  size?: number
  hue?: number | null
  emoji?: string | null
  className?: string
}

export function Avatar({ name, size = 44, hue, emoji, className }: AvatarProps) {
  const initials = (name || '?')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()

  // Explicit preset hue wins; otherwise derive a stable hue from the name.
  // Light tint + dark initials (inverted in dark mode via --av-l/--av-t):
  // white on a mid tone was 3.8:1, below WCAG AA (improvement 20).
  const h = hue != null ? String(hue) : avatarHue(name)
  const background = `oklch(var(--av-l) 0.08 ${h})`
  const color = `oklch(var(--av-t) 0.11 ${h})`

  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        borderRadius: '30%',
        flexShrink: 0,
        display: 'grid',
        placeItems: 'center',
        background,
        color,
        fontWeight: 800,
        fontSize: emoji ? size * 0.5 : size * 0.36,
        letterSpacing: '-0.02em',
        lineHeight: 1,
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      {emoji ? <span style={{ filter: 'saturate(1.05)' }}>{emoji}</span> : initials}
    </div>
  )
}
