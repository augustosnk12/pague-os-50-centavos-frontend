interface ProgressProps {
  value: number
  color?: string
  height?: number
  className?: string
}

export function Progress({ value, color = 'var(--primary)', height = 7, className }: ProgressProps) {
  return (
    <div
      className={className}
      style={{ background: 'var(--surface-2)', borderRadius: 99, height, overflow: 'hidden', width: '100%' }}
    >
      <div
        style={{
          width: `${Math.min(100, Math.round(value * 100))}%`,
          height: '100%',
          background: color,
          borderRadius: 99,
          transition: 'width .5s cubic-bezier(0.22,1,0.36,1)',
        }}
      />
    </div>
  )
}
