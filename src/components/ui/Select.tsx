import type { CSSProperties } from 'react'
import { Icon } from './Icon'

interface SelectOption {
  value: string
  label: string
}

interface SelectProps {
  label?: string
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  required?: boolean
  error?: string
  hint?: string
  style?: CSSProperties
  className?: string
}

export function Select({ label, value, onChange, options, required, error, hint, style, className }: SelectProps) {
  return (
    <label style={{ display: 'block', ...style }} className={className}>
      {label && (
        <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 7 }}>
          {label} {required && <span style={{ color: 'var(--primary)' }}>*</span>}
        </div>
      )}
      <div style={{ position: 'relative' }}>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{
            width: '100%',
            appearance: 'none',
            background: 'var(--surface)',
            border: `1.5px solid ${error ? 'var(--overdue)' : 'var(--border-strong)'}`,
            borderRadius: 'calc(var(--radius) * 0.6)',
            padding: '14px 40px 14px 15px',
            fontSize: 16,
            fontWeight: 600,
            color: 'var(--text)',
            fontFamily: 'inherit',
            cursor: 'pointer',
          }}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <Icon
          name="chevronDown"
          size={18}
          color="var(--text-faint)"
          style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
        />
      </div>
      {(hint ?? error) && (
        <div style={{ fontSize: 12.5, marginTop: 6, color: error ? 'var(--overdue)' : 'var(--text-faint)' }}>
          {error ?? hint}
        </div>
      )}
    </label>
  )
}
