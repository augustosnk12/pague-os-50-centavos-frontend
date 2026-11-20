import type { CSSProperties, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Icon, type IconSize } from './Icon'

interface ListRowProps {
  /** What a screen reader says for the whole row (the visible parts are hidden from it). */
  label: string
  onClick: () => void
  /** Row content: avatar/icon, <RowText>, amount, trailing icon… */
  children: ReactNode
  /** For rows that open or fold something below them. */
  expanded?: boolean
  /** Rendered after the row, inside the same <li> (e.g. what it unfolds). */
  after?: ReactNode
  id?: string
  className?: string
  innerClassName?: string
  onPointerEnter?: () => void
}

/**
 * One row of a <ListGroup> (improvement 31): a single stretched button covers
 * the row, so the whole row is one tap target and one stop for the keyboard.
 * Interactive things inside (an avatar link, a ⋯) sit above it.
 */
export function ListRow({ label, onClick, children, expanded, after, id, className = 'lt-lrow', innerClassName, onPointerEnter }: ListRowProps) {
  return (
    <li id={id} className={className}>
      <div className={innerClassName ? `lt-lrow-in ${innerClassName}` : 'lt-lrow-in'}>
        <button type="button" className="lt-lrow-hit" onClick={onClick} onPointerEnter={onPointerEnter} aria-label={label} aria-expanded={expanded} />
        {children}
      </div>
      {after}
    </li>
  )
}

/**
 * A row that is a real link (Devedores, search hits): middle-click, "open in
 * new tab" and screen readers treat it as one. `label` is its accessible name.
 */
export function LinkRow({ to, label, children }: { to: string; label: string; children: ReactNode }) {
  return (
    <li className="lt-lrow">
      <Link to={to} className="lt-lrow-in lt-link-row" aria-label={label}>
        {children}
      </Link>
    </li>
  )
}

/** Title and subtitle of a row (hidden from screen readers: the row's label says it). */
export function RowText({ title, sub, titleStyle }: { title: ReactNode; sub?: ReactNode; titleStyle?: CSSProperties }) {
  return (
    <div className="lt-lrow-main" aria-hidden="true">
      <div className="lt-lrow-name" style={titleStyle}>{title}</div>
      {sub != null && sub !== '' && <div className="lt-lrow-sub">{sub}</div>}
    </div>
  )
}

/** A row that goes somewhere (Configurações): icon tile, title, subtitle and ›. */
export function NavRow({ icon, iconSize = 16, title, sub, label, onClick, onPointerEnter, danger, iconClassName }: {
  icon: string
  iconSize?: IconSize
  title: string
  sub?: string
  /** Defaults to the title. */
  label?: string
  onClick: () => void
  onPointerEnter?: () => void
  danger?: boolean
  iconClassName?: string
}) {
  return (
    <ListRow label={label ?? title} onClick={onClick} onPointerEnter={onPointerEnter}>
      <span className={iconClassName ? `lt-set-ic ${iconClassName}` : 'lt-set-ic'} data-danger={danger || undefined} aria-hidden="true">
        <Icon name={icon} size={iconSize} />
      </span>
      <RowText title={title} sub={sub} titleStyle={danger ? { color: 'var(--overdue)' } : undefined} />
      <Icon name="chevronRight" size={16} />
    </ListRow>
  )
}
