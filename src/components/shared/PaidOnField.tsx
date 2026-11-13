import { useState } from 'react'
import { Icon } from '../ui/Icon'
import { DateInput } from '../ui/DateInput'
import { fmtTitle } from '../../lib/format'

type Mode = 'today' | 'yesterday' | 'other'

const addDays = (iso: string, n: number) => {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10)
}

interface PaidOnFieldProps {
  today: string
  /** Called with the chosen day (YYYY-MM-DD), or '' while "Outra" is incomplete. */
  onChange: (day: string) => void
}

/**
 * "Pago em" in one line (improvement 7): Hoje (default) / Ontem / Outra —
 * "Outra" turns into a DD/MM/AAAA field (calendar on its icon), never in the future.
 */
export function PaidOnField({ today, onChange }: PaidOnFieldProps) {
  const [mode, setMode] = useState<Mode>('today')
  const [other, setOther] = useState(() => addDays(today, -2))
  const date = mode === 'today' ? today : mode === 'yesterday' ? addDays(today, -1) : other
  const pick = (m: Mode, d: string) => {
    setMode(m)
    onChange(d)
  }
  return (
    <div className="lt-date-row" role="group" aria-label="Data do pagamento">
      <div style={{ minWidth: 0 }}>
        <div className="lt-date-k">Pago em</div>
        <div className="lt-date-v">{date ? fmtTitle(date) : '—'}</div>
      </div>
      <div className="lt-date-chips">
        <button type="button" className="lt-chip" aria-pressed={mode === 'today'} onClick={() => pick('today', today)}>Hoje</button>
        <button type="button" className="lt-chip" aria-pressed={mode === 'yesterday'} onClick={() => pick('yesterday', addDays(today, -1))}>Ontem</button>
        {mode === 'other' ? (
          <DateInput
            compact
            autoFocus
            ariaLabel="Outra data do pagamento"
            value={other}
            max={today}
            onChange={(d) => {
              setOther(d)
              onChange(d)
            }}
          />
        ) : (
          <button type="button" className="lt-chip" onClick={() => pick('other', other)}>
            <Icon name="calendar" size={14} /> Outra
          </button>
        )}
      </div>
    </div>
  )
}
