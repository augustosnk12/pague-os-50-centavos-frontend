import { useState, type CSSProperties } from 'react'
import type React from 'react'

interface InputProps {
  label?: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  type?: string
  required?: boolean
  hint?: string
  error?: string
  prefix?: string
  textarea?: boolean
  autoFocus?: boolean
  inputMode?: 'text' | 'decimal' | 'numeric' | 'tel' | 'email' | 'url' | 'search' | 'none'
  style?: CSSProperties
  className?: string
  name?: string
  disabled?: boolean
  rows?: number
  maxLength?: number
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void
}

export function Input({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  required,
  hint,
  error,
  prefix,
  textarea,
  autoFocus,
  inputMode,
  style,
  className,
  name,
  disabled,
  rows = 3,
  maxLength,
  onKeyDown,
}: InputProps) {
  const [focus, setFocus] = useState(false)
  const ring = error ? 'var(--overdue)' : focus ? 'var(--primary)' : 'var(--border-strong)'

  const fieldStyle: CSSProperties = {
    width: '100%',
    border: 'none',
    outline: 'none',
    background: 'transparent',
    color: 'var(--text)',
    fontSize: 16,
    fontWeight: 500,
    fontFamily: 'inherit',
    resize: 'none',
  }

  return (
    <label style={{ display: 'block', ...style }} className={className}>
      {label && (
        <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 7 }}>
          {label} {required && <span style={{ color: 'var(--primary)' }}>*</span>}
        </div>
      )}
      <div
        style={{
          display: 'flex',
          alignItems: textarea ? 'flex-start' : 'center',
          gap: 8,
          background: 'var(--surface)',
          border: `1.5px solid ${ring}`,
          borderRadius: 'calc(var(--radius) * 0.6)',
          padding: '13px 15px',
          transition: 'border-color .15s, box-shadow .15s',
          boxShadow: focus ? '0 0 0 4px var(--primary-weak)' : 'none',
        }}
      >
        {prefix && <span style={{ color: 'var(--text-faint)', fontWeight: 700, fontSize: 15 }}>{prefix}</span>}
        {textarea ? (
          <textarea
            rows={rows}
            value={value}
            placeholder={placeholder}
            name={name}
            disabled={disabled}
            maxLength={maxLength}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setFocus(true)}
            onBlur={() => setFocus(false)}
            style={fieldStyle}
          />
        ) : (
          <input
            type={type}
            inputMode={inputMode}
            value={value}
            placeholder={placeholder}
            autoFocus={autoFocus}
            name={name}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value)}
            maxLength={maxLength}
            onFocus={() => setFocus(true)}
            onBlur={() => setFocus(false)}
            onKeyDown={onKeyDown}
            style={fieldStyle}
          />
        )}
      </div>
      {(hint ?? error) && (
        <div style={{ fontSize: 12.5, marginTop: 6, color: error ? 'var(--overdue)' : 'var(--text-faint)' }}>
          {error ?? hint}
        </div>
      )}
    </label>
  )
}
