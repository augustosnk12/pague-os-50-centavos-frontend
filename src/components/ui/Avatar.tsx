import { avatarHue } from '../../lib/utils'

interface AvatarProps {
  name: string
  size?: number
  className?: string
}

export function Avatar({ name, size = 44, className }: AvatarProps) {
  const initials = (name || '?')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()

  const hue = avatarHue(name)

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
        background: `oklch(0.62 0.13 ${hue})`,
        color: '#fff',
        fontWeight: 800,
        fontSize: size * 0.36,
        letterSpacing: '-0.02em',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      {initials}
    </div>
  )
}
