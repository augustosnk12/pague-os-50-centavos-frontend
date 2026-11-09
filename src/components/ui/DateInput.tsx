import { useEffect, useId, useLayoutEffect, useRef, useState, type ChangeEvent, type CSSProperties } from 'react'
import { Icon } from './Icon'
import { Calendar } from './Calendar'
import { localToday } from '../../lib/date'
import { fmtBR, maskBR, parseBR } from '../../lib/format'

interface DateInputProps {
  /** Visible label; or `ariaLabel` when the context already names the field. */
  label?: string
  ariaLabel?: string
  /** YYYY-MM-DD, or '' while empty/incomplete. */
  value: string
  onChange: (value: string) => void
  required?: boolean
  min?: string
  max?: string
  /** Chip-sized field (payment sheet "Outra"). */
  compact?: boolean
  /** Open the calendar as soon as the field appears. */
  autoOpen?: boolean
  style?: CSSProperties
}

const POP_W = 296
const POP_H = 352

/**
 * Date field in the Brazilian format (DD/MM/AAAA): type the digits (the
 * slashes come by themselves) or pick in the calendar. The calendar is a
 * popover in the app's style, never the browser's native picker (which
 * follows the browser language, e.g. MM/DD/YYYY).
 */
export function DateInput({ label, ariaLabel, value, onChange, required, min, max, compact, autoOpen, style }: DateInputProps) {
  const today = localToday()
  const [text, setText] = useState(() => fmtBR(value))
  const [error, setError] = useState('')
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const id = useId()
  const fieldRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const popRef = useRef<HTMLDivElement>(null)

  // Follow outside changes (e.g. a default date) without fighting the typing.
  useEffect(() => {
    if (value && value !== parseBR(text)) {
      setText(fmtBR(value))
      setError('')
    }
  }, [value]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (autoOpen) {
      inputRef.current?.focus()
      setOpen(true)
    }
  }, [autoOpen])

  // Fixed position from the field, inside the viewport (below, or above when there is no room).
  useLayoutEffect(() => {
    if (!open) return
    const place = () => {
      const r = fieldRef.current?.getBoundingClientRect()
      if (!r) return
      const below = window.innerHeight - r.bottom >= POP_H + 8 || r.top < POP_H + 8
      const left = Math.min(Math.max(8, r.right - POP_W), window.innerWidth - POP_W - 8)
      setPos({ top: below ? r.bottom + 6 : r.top - POP_H - 6, left: Math.max(8, left) })
    }
    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [open])

  // A press outside the field and the calendar closes it.
  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node
      if (!fieldRef.current?.contains(t) && !popRef.current?.contains(t)) setOpen(false)
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [open])

  const validate = (iso: string) => {
    if (min && iso < min) return `A data não pode ser antes de ${fmtBR(min)}.`
    if (max && iso > max) return `A data não pode ser depois de ${fmtBR(max)}.`
    return ''
  }

  const onType = (e: ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, '')
    const masked = maskBR(digits)
    setText(masked)
    if (digits.length < 8) {
      setError('')
      return
    }
    const iso = parseBR(masked)
    const problem = iso ? validate(iso) : 'Data inválida. Use DD/MM/AAAA.'
    setError(problem)
    onChange(problem ? '' : iso)
  }

  const pick = (iso: string) => {
    setText(fmtBR(iso))
    setError('')
    onChange(iso)
    setOpen(false)
    inputRef.current?.focus()
  }

  const msgId = `${id}-msg`

  return (
    <div style={{ position: 'relative', ...style }}>
      {label && (
        <label htmlFor={id} className="lt-field-label">
          {label} {required && <span style={{ color: 'var(--primary)' }} aria-hidden="true">*</span>}
        </label>
      )}
      <div ref={fieldRef} className="lt-date-field" data-compact={compact || undefined} data-invalid={!!error || undefined}>
        <input
          ref={inputRef}
          id={id}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder="DD/MM/AAAA"
          maxLength={10}
          value={text}
          onChange={onType}
          aria-label={label ? undefined : ariaLabel}
          aria-required={required || undefined}
          aria-invalid={!!error || undefined}
          aria-describedby={error ? msgId : undefined}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown' && e.altKey) {
              e.preventDefault()
              setOpen(true)
            }
          }}
        />
        <button
          type="button"
          className="lt-date-btn"
          aria-label={open ? 'Fechar calendário' : 'Abrir calendário'}
          aria-expanded={open}
          aria-controls={open ? `${id}-cal` : undefined}
          onClick={() => setOpen((o) => !o)}
        >
          <Icon name="calendar" size={compact ? 15 : 18} />
        </button>
      </div>
      {error && (
        <div id={msgId} role="alert" className="lt-field-error">
          {error}
        </div>
      )}
      {open && pos && (
        // Non-modal dialog (date picker pattern); Esc and focus leaving close it.
        // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
        <div
          ref={popRef}
          id={`${id}-cal`}
          role="dialog"
          aria-label={`Calendário: ${label ?? ariaLabel ?? 'data'}`}
          className="lt-cal-pop"
          style={{ top: pos.top, left: pos.left, width: POP_W }}
          onKeyDown={(e) => {
            // Esc closes only the calendar, never the sheet behind it.
            if (e.key === 'Escape') {
              e.preventDefault()
              e.stopPropagation()
              setOpen(false)
              inputRef.current?.focus()
            }
          }}
          onBlur={(e) => {
            const to = e.relatedTarget as Node | null
            if (to && !popRef.current?.contains(to) && !fieldRef.current?.contains(to)) setOpen(false)
          }}
        >
          <Calendar value={value} onSelect={pick} today={today} min={min} max={max} autoFocus label={`Escolher ${(label ?? ariaLabel ?? 'data').toLowerCase()}`} />
        </div>
      )}
    </div>
  )
}
