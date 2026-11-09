import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from 'react'

interface LinkButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'style'> {
  children: ReactNode
  style?: CSSProperties
}

/**
 * An action that looks like a link ("Reenviar", "Ver tudo"…). Replaces
 * <a onClick> without href, which keyboards cannot reach and screen readers
 * announce as a link (improvement 20).
 */
export function LinkButton({ children, style, type = 'button', disabled, ...rest }: LinkButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled}
      {...rest}
      style={{
        background: 'none',
        border: 'none',
        padding: 0,
        font: 'inherit',
        color: disabled ? 'var(--text-faint)' : 'var(--primary)',
        fontWeight: 700,
        cursor: disabled ? 'default' : 'pointer',
        textAlign: 'inherit',
        ...style,
      }}
    >
      {children}
    </button>
  )
}

interface PlainButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'style'> {
  children: ReactNode
  style?: CSSProperties
}

/**
 * A button with no look of its own, to make existing visual elements
 * (avatar, name, card header) clickable AND keyboard-accessible instead of
 * a <div onClick>.
 */
export function PlainButton({ children, style, type = 'button', ...rest }: PlainButtonProps) {
  return (
    <button
      type={type}
      {...rest}
      style={{
        background: 'none',
        border: 'none',
        padding: 0,
        margin: 0,
        font: 'inherit',
        color: 'inherit',
        textAlign: 'inherit',
        cursor: rest.disabled ? 'default' : 'pointer',
        ...style,
      }}
    >
      {children}
    </button>
  )
}
