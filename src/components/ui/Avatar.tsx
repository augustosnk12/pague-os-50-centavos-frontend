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
  const background = hue != null ? `oklch(0.62 0.13 ${hue})` : `oklch(0.62 0.13 ${avatarHue(name)})`

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
        color: '#fff',
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
