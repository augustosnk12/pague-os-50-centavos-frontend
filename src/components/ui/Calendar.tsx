import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { IconButton } from './IconButton'

const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
const WEEKDAYS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado']
const WEEKDAYS_MIN = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

/** Calendar days as YYYY-MM-DD; all math in UTC so time zones never shift a day. */
const iso = (y: number, m: number, d: number) => new Date(Date.UTC(y, m, d)).toISOString().slice(0, 10)
const parts = (s: string) => {
  const [y, m, d] = s.split('-').map(Number)
  return { y, m: m - 1, d }
}
const addDays = (s: string, n: number) => {
  const { y, m, d } = parts(s)
  return iso(y, m, d + n)
}
const addMonths = (s: string, n: number) => {
  const { y, m, d } = parts(s)
  const last = new Date(Date.UTC(y, m + n + 1, 0)).getUTCDate()
  return iso(y, m + n, Math.min(d, last))
}
const clamp = (s: string, min?: string, max?: string) => (min && s < min ? min : max && s > max ? max : s)

function spokenDate(s: string) {
  const { y, m, d } = parts(s)
  return `${WEEKDAYS[new Date(Date.UTC(y, m, d)).getUTCDay()]}, ${d} de ${MONTHS[m]} de ${y}`
}

interface CalendarProps {
  /** Selected day (YYYY-MM-DD) or ''. */
  value: string
  onSelect: (day: string) => void
  /** Today in the user's time zone (YYYY-MM-DD): marked, and the "Hoje" shortcut. */
  today: string
  min?: string
  max?: string
  /** Move focus to the selected (or today's) day when shown. */
  autoFocus?: boolean
  label?: string
}

/**
 * Month calendar in pt-BR (weeks start on Sunday). A grid of real buttons:
 * arrows move by day/week, PageUp/PageDown by month, Home/End to the start /
 * end of the week, Enter or Space picks. Days outside min/max are disabled.
 */
export function Calendar({ value, onSelect, today, min, max, autoFocus, label = 'Escolher data' }: CalendarProps) {
  const [focusDay, setFocusDay] = useState(() => clamp(value || today, min, max))
  const { y, m } = parts(focusDay)
  const titleId = useId()
  const gridRef = useRef<HTMLTableElement>(null)
  const moved = useRef(!!autoFocus)

  useEffect(() => {
    if (!moved.current) return
    gridRef.current?.querySelector<HTMLButtonElement>(`[data-day="${focusDay}"]`)?.focus()
  }, [focusDay])

  const go = (day: string) => {
    moved.current = true
    setFocusDay(clamp(day, min, max))
  }

  const onKeyDown = (e: KeyboardEvent<HTMLTableElement>) => {
    const { y: fy, m: fm, d: fd } = parts(focusDay)
    const wd = new Date(Date.UTC(fy, fm, fd)).getUTCDay()
    const keys: Record<string, () => string> = {
      ArrowLeft: () => addDays(focusDay, -1),
      ArrowRight: () => addDays(focusDay, 1),
      ArrowUp: () => addDays(focusDay, -7),
      ArrowDown: () => addDays(focusDay, 7),
      PageUp: () => addMonths(focusDay, e.shiftKey ? -12 : -1),
      PageDown: () => addMonths(focusDay, e.shiftKey ? 12 : 1),
      Home: () => addDays(focusDay, -wd),
      End: () => addDays(focusDay, 6 - wd),
    }
    const next = keys[e.key]
    if (!next) return
    e.preventDefault()
    go(next())
  }

  const first = new Date(Date.UTC(y, m, 1)).getUTCDay()
  const days = new Date(Date.UTC(y, m + 1, 0)).getUTCDate()
  const cells: (string | null)[] = [...Array<null>(first).fill(null), ...Array.from({ length: days }, (_, i) => iso(y, m, i + 1))]
  while (cells.length % 7) cells.push(null)
  const weeks = Array.from({ length: cells.length / 7 }, (_, w) => cells.slice(w * 7, w * 7 + 7))
  const prevMonthEnd = iso(y, m, 0)
  const nextMonthStart = iso(y, m + 1, 1)
  const out = (day: string) => (min && day < min) || (max && day > max)

  return (
    <div className="lt-cal" role="group" aria-label={label}>
      <div className="lt-cal-head">
        <IconButton name="chevronLeft" size={18} label="Mês anterior" onClick={() => go(addMonths(focusDay, -1))} disabled={!!min && prevMonthEnd < min} />
        <div id={titleId} className="lt-cal-title" aria-live="polite">
          {MONTHS[m]} {y}
        </div>
        <IconButton name="chevronRight" size={18} label="Próximo mês" onClick={() => go(addMonths(focusDay, 1))} disabled={!!max && nextMonthStart > max} />
      </div>
      {/* Arrow keys come from the focused day button inside (keyboard delegation, no click handler here). */}
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
      <table ref={gridRef} className="lt-cal-grid" aria-labelledby={titleId} onKeyDown={onKeyDown}>
        <thead>
          <tr>
            {WEEKDAYS_MIN.map((w, i) => (
              <th key={i} scope="col" abbr={WEEKDAYS[i]}>
                <span aria-hidden="true">{w}</span>
                <span className="lt-sr-only">{WEEKDAYS[i]}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week, w) => (
            <tr key={w}>
              {week.map((day, i) =>
                day ? (
                  <td key={day}>
                    <button
                      type="button"
                      className="lt-cal-day"
                      data-day={day}
                      tabIndex={day === focusDay ? 0 : -1}
                      aria-label={spokenDate(day)}
                      aria-pressed={day === value}
                      aria-current={day === today ? 'date' : undefined}
                      disabled={!!out(day)}
                      onClick={() => onSelect(day)}
                      onFocus={() => setFocusDay(day)}
                    >
                      {parts(day).d}
                    </button>
                  </td>
                ) : (
                  <td key={`e${i}`} aria-hidden="true" />
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {!out(today) && (
        <div className="lt-cal-foot">
          <button type="button" className="lt-cal-today" onClick={() => onSelect(today)}>
            Hoje
          </button>
        </div>
      )}
    </div>
  )
}
