import { useRef, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react'

export interface SegmentedOption<T extends string> {
  value: T
  /** Visible text, or custom content (then pass `ariaLabel`). */
  label: ReactNode
  ariaLabel?: string
}

interface SegmentedProps<T extends string> {
  value: T
  options: SegmentedOption<T>[]
  onChange: (value: T) => void
  /** Name of the group: `label` (aria-label) or the id of a visible label. */
  label?: string
  labelledBy?: string
  /** Compact, side by side with a label (Aparência). */
  mini?: boolean
  className?: string
  style?: CSSProperties
}

/**
 * One choice among a few (improvement 31): always a radio group, so screen
 * readers say "1 de 4, selecionado". Arrows / Home / End move and choose,
 * and only the chosen option is in the Tab order (roving tabindex).
 */
export function Segmented<T extends string>({ value, options, onChange, label, labelledBy, mini, className, style }: SegmentedProps<T>) {
  const ref = useRef<HTMLDivElement>(null)
  const index = Math.max(0, options.findIndex((o) => o.value === value))

  const onKeyDown = (e: KeyboardEvent) => {
    const keys: Record<string, number> = { ArrowRight: index + 1, ArrowDown: index + 1, ArrowLeft: index - 1, ArrowUp: index - 1, Home: 0, End: options.length - 1 }
    if (!(e.key in keys)) return
    e.preventDefault()
    const next = (keys[e.key] + options.length) % options.length
    onChange(options[next].value)
    ref.current?.querySelectorAll<HTMLButtonElement>('[role="radio"]')[next]?.focus()
  }

  return (
    <div
      ref={ref}
      className={['lt-seg', mini && 'lt-seg-mini', className].filter(Boolean).join(' ')}
      role="radiogroup"
      aria-label={label}
      aria-labelledby={labelledBy}
      style={style}
    >
      {options.map((o, k) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={k === index}
          aria-label={o.ariaLabel}
          tabIndex={k === index ? 0 : -1}
          onKeyDown={onKeyDown}
          onClick={() => o.value !== value && onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
