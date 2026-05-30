import { Icon } from '../ui/Icon'

interface LogoProps {
  size?: number
  showText?: boolean
}

export function Logo({ size = 28, showText = true }: LogoProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div
        style={{
          width: size,
          height: size,
          borderRadius: '28%',
          background: 'var(--primary)',
          display: 'grid',
          placeItems: 'center',
          boxShadow: 'var(--shadow-primary)',
        }}
      >
        <Icon name="wallet" size={size * 0.6} color="var(--on-primary)" strokeWidth={2.4} />
      </div>
      {showText && (
        <span
          style={{
            fontWeight: 800,
            fontSize: size * 0.62,
            letterSpacing: '-0.03em',
            lineHeight: 1,
            whiteSpace: 'nowrap',
          }}
        >
          Pague os 50 centavos
        </span>
      )}
    </div>
  )
}
