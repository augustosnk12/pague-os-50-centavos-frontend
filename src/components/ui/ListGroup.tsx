import type { ReactNode } from 'react'

/**
 * A titled group of rows (improvement 31): the title is a real heading so
 * screen-reader users can jump between groups; the rows are a list.
 */
export function GroupLabel({ children, color, count, as: Tag = 'h2', id }: {
  children: ReactNode
  /** Status colour of the dot (CSS value); no dot when absent. */
  color?: string
  count?: number
  as?: 'h2' | 'h3'
  id?: string
}) {
  return (
    <Tag className="lt-group-label" id={id}>
      {color && <span className="lt-dot" style={{ background: color }} aria-hidden="true" />}
      <span>
        {children}
        {count != null && <> · {count}</>}
      </span>
      <span className="lt-group-line" aria-hidden="true" />
    </Tag>
  )
}

export function ListGroup({ children, label }: { children: ReactNode; label?: string }) {
  return (
    <ul className="lt-lgroup" aria-label={label}>
      {children}
    </ul>
  )
}
