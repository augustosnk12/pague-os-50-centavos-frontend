import { useRef, type KeyboardEvent } from 'react'

export interface TabItem<T extends string> {
  id: T
  label: string
  /** Shown next to the label; null hides it (e.g. while loading). */
  count?: number | null
  /** Red count (only "Atrasadas"). */
  late?: boolean
}

interface TabsProps<T extends string> {
  items: TabItem<T>[]
  value: T
  onChange: (id: T) => void
  /** Accessible name of the tab list ("Situação", "Dívidas"…). */
  label: string
  /** id of the panel the tabs control. */
  panelId: string
  /** Prefix of the tab ids (the panel is labelled by `${idPrefix}-${value}`). */
  idPrefix: string
}

/**
 * Fixed tabs with counts (improvements 11 and 14): role="tablist", one Tab
 * stop, arrows / Home / End move and select.
 */
export function Tabs<T extends string>({ items, value, onChange, label, panelId, idPrefix }: TabsProps<T>) {
  const ref = useRef<HTMLDivElement>(null)
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = items.findIndex((t) => t.id === value)
    const n = items.length
    const next = e.key === 'ArrowRight' ? (i + 1) % n : e.key === 'ArrowLeft' ? (i + n - 1) % n : e.key === 'Home' ? 0 : e.key === 'End' ? n - 1 : -1
    if (next < 0) return
    e.preventDefault()
    onChange(items[next].id)
    requestAnimationFrame(() => ref.current?.querySelector<HTMLButtonElement>(`#${idPrefix}-${items[next].id}`)?.focus())
  }
  return (
    // Arrow keys come from the focused tab inside (tablist keyboard pattern).
    // eslint-disable-next-line jsx-a11y/interactive-supports-focus
    <div ref={ref} className="lt-tabs" role="tablist" aria-label={label} onKeyDown={onKeyDown} style={{ gridTemplateColumns: `repeat(${items.length}, 1fr)` }}>
      {items.map((t) => (
        <button
          key={t.id}
          id={`${idPrefix}-${t.id}`}
          type="button"
          role="tab"
          aria-selected={value === t.id}
          aria-controls={panelId}
          tabIndex={value === t.id ? 0 : -1}
          onClick={() => onChange(t.id)}
        >
          {t.label}
          {t.count != null && (
            <span className="lt-cnt" data-late={(t.late && t.count > 0) || undefined}>
              {t.count}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}
