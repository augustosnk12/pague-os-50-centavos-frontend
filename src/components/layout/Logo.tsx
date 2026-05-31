import iconUrl from '../../assets/svg/icon.svg'

interface LogoProps {
  size?: number
  showText?: boolean
}

export function Logo({ size = 28, showText = true }: LogoProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <img
        src={iconUrl}
        width={size}
        height={size}
        alt="Pague os 50 centavos"
        style={{ flexShrink: 0, borderRadius: '23%', boxShadow: 'var(--shadow-primary)' }}
      />
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
