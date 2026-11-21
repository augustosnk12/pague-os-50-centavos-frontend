import type { ReactNode } from 'react'

interface SectionHeaderProps {
  children: ReactNode
  /** Status colour of the dot (CSS value); no dot when absent. */
  color?: string
  count?: number
  as?: 'h2' | 'h3'
  id?: string
  /**
   * "line": small caps with a rule to the right, above lists (Painel,
   * Devedores). "plain": small caps only, above cards (Configurações).
   */
  variant?: 'line' | 'plain'
  className?: string
  /** Brief highlight (Devedores: jumping to a letter). */
  flash?: boolean
}

/**
 * The one section title of the app (improvement 31): a real heading, so
 * screen-reader users can jump between sections.
 */
export function SectionHeader({ children, color, count, as: Tag = 'h2', id, variant = 'line', className, flash }: SectionHeaderProps) {
  if (variant === 'plain') {
    return (
      <Tag className={className ? `lt-set-h ${className}` : 'lt-set-h'} id={id}>
        {children}
        {count != null && <> · {count}</>}
      </Tag>
    )
  }
  return (
    <Tag className={className ? `lt-group-label ${className}` : 'lt-group-label'} id={id} data-flash={flash || undefined}>
      {color && <span className="lt-dot" style={{ background: color }} aria-hidden="true" />}
      <span>
        {children}
        {count != null && <> · {count}</>}
      </span>
      <span className="lt-group-line" aria-hidden="true" />
    </Tag>
  )
}

/** A card of rows with dividers (improvement 31); rows are <ListRow>. */
export function ListGroup({ children, label, className, style }: { children: ReactNode; label?: string; className?: string; style?: React.CSSProperties }) {
  return (
    <ul className={className ? `lt-lgroup ${className}` : 'lt-lgroup'} aria-label={label} style={style}>
      {children}
    </ul>
  )
}
