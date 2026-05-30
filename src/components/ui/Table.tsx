import type { CSSProperties, ReactNode } from 'react'

interface Column<T> {
  key: string
  header: string
  render: (row: T) => ReactNode
  style?: CSSProperties
}

interface TableProps<T> {
  columns: Column<T>[]
  rows: T[]
  keyFn: (row: T) => string
  className?: string
}

export function Table<T>({ columns, rows, keyFn, className }: TableProps<T>) {
  return (
    <div
      className={className}
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border)' }}>
            {columns.map((col) => (
              <th
                key={col.key}
                style={{
                  padding: '11px 15px',
                  textAlign: 'left',
                  fontWeight: 700,
                  fontSize: 12.5,
                  color: 'var(--text-muted)',
                  background: 'var(--surface-2)',
                  ...col.style,
                }}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={keyFn(row)}
              style={{ borderBottom: '1px solid var(--border)', transition: 'background .12s' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)' }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = '' }}
            >
              {columns.map((col) => (
                <td key={col.key} style={{ padding: '12px 15px', ...col.style }}>
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
