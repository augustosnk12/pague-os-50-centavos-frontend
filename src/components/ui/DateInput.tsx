import { useState, useRef, useEffect, type CSSProperties } from 'react'
import type React from 'react'
import { MESLONG } from '../../lib/utils'
import { Icon } from './Icon'

interface DateInputProps {
  label?: string
  value: string
  onChange: (value: string) => void
  required?: boolean
  style?: CSSProperties
}

const DAYS_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

function toDisplay(iso: string): string {
  if (!iso || iso.length !== 10) return ''
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

function applyMask(digits: string): string {
  const d = digits.slice(0, 8)
  let r = d.slice(0, 2)
  if (d.length > 2) r += '/' + d.slice(2, 4)
  if (d.length > 4) r += '/' + d.slice(4, 8)
  return r
}

function toISO(display: string): string {
  const digits = display.replace(/\D/g, '')
  if (digits.length !== 8) return ''
  const d = digits.slice(0, 2), m = digits.slice(2, 4), y = digits.slice(4, 8)
  const date = new Date(`${y}-${m}-${d}T12:00:00Z`)
  if (isNaN(date.getTime())) return ''
  const dd = parseInt(d, 10), mm = parseInt(m, 10)
  if (mm < 1 || mm > 12 || dd < 1 || dd > new Date(parseInt(y, 10), mm, 0).getDate()) return ''
  return `${y}-${m}-${d}`
}

const navBtnStyle: CSSProperties = {
  background: 'none', border: 'none', cursor: 'pointer',
  fontSize: 18, lineHeight: 1, color: 'var(--text-muted)',
  padding: '2px 8px', borderRadius: 6,
}

export function DateInput({ label, value, onChange, required, style }: DateInputProps) {
  const [display, setDisplay] = useState(() => toDisplay(value))
  const [invalid, setInvalid] = useState(false)
  const [calOpen, setCalOpen] = useState(false)
  const [dropUp, setDropUp] = useState(false)
  const [viewDate, setViewDate] = useState<Date>(() => {
    if (value) return new Date(value + 'T12:00:00Z')
    const n = new Date()
    return new Date(Date.UTC(n.getFullYear(), n.getMonth(), 1))
  })
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (value) { setDisplay(toDisplay(value)); setInvalid(false) }
  }, [value])

  useEffect(() => {
    if (!calOpen) return
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node))
        setCalOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [calOpen])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, '')
    const masked = applyMask(digits)
    setDisplay(masked)
    const complete = digits.length === 8
    const iso = toISO(masked)
    if (iso) {
      setInvalid(false)
      onChange(iso)
      setViewDate(new Date(iso + 'T12:00:00Z'))
    } else {
      if (complete) setInvalid(true)
      else setInvalid(false)
      if (complete) onChange('')
    }
  }

  const handleDayClick = (day: number) => {
    const y = viewDate.getUTCFullYear()
    const m = viewDate.getUTCMonth() + 1
    const iso = `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    setDisplay(toDisplay(iso))
    onChange(iso)
    setCalOpen(false)
  }

  const year = viewDate.getUTCFullYear()
  const month = viewDate.getUTCMonth()
  const firstDow = new Date(Date.UTC(year, month, 1)).getUTCDay()
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()

  const selDay = value ? parseInt(value.slice(8, 10), 10) : 0
  const selMonth = value ? parseInt(value.slice(5, 7), 10) - 1 : -1
  const selYear = value ? parseInt(value.slice(0, 4), 10) : 0

  const cells: (number | null)[] = [
    ...Array<null>(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  return (
    <div ref={containerRef} style={{ position: 'relative', ...style }}>
      {label && (
        <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 7 }}>
          {label} {required && <span style={{ color: 'var(--primary)' }}>*</span>}
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', background: 'var(--surface)', border: `1.5px solid ${invalid ? 'var(--overdue)' : 'var(--border-strong)'}`, borderRadius: 'calc(var(--radius) * 0.6)', padding: '13px 15px', gap: 8 }}>
        <input
          type="text"
          value={display}
          onChange={handleChange}
          placeholder="dd/mm/aaaa"
          maxLength={10}
          inputMode="numeric"
          style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', color: 'var(--text)', fontSize: 16, fontWeight: 500, fontFamily: 'inherit' }}
        />
        <button
          type="button"
          onClick={() => {
            if (!calOpen && containerRef.current) {
              const rect = containerRef.current.getBoundingClientRect()
              const spaceBelow = window.innerHeight - rect.bottom
              setDropUp(spaceBelow < 300)
            }
            setCalOpen(o => !o)
          }}
          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', color: calOpen ? 'var(--primary)' : 'var(--text-faint)' }}
          aria-label="Abrir calendário"
        >
          <Icon name="calendar" size={18} />
        </button>
      </div>

      {invalid && (
        <div style={{ fontSize: 12.5, marginTop: 6, color: 'var(--overdue)' }}>Data inválida.</div>
      )}

      {calOpen && (
        <div style={{
          position: 'absolute',
          ...(dropUp ? { bottom: 'calc(100% + 6px)' } : { top: 'calc(100% + 6px)' }),
          left: 0, zIndex: 300,
          background: 'var(--surface)', border: '1.5px solid var(--border)',
          borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-lg)', padding: 14, width: 270,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <button onClick={() => setViewDate(d => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - 1, 1)))} style={navBtnStyle}>‹</button>
            <span style={{ fontWeight: 800, fontSize: 14 }}>{MESLONG[month]} {year}</span>
            <button onClick={() => setViewDate(d => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1)))} style={navBtnStyle}>›</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 4 }}>
            {DAYS_SHORT.map(d => (
              <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: 'var(--text-faint)', padding: '2px 0' }}>{d}</div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
            {cells.map((day, i) => {
              const isSel = day !== null && day === selDay && month === selMonth && year === selYear
              return (
                <button
                  key={i}
                  type="button"
                  disabled={day === null}
                  onClick={() => day && handleDayClick(day)}
                  style={{
                    aspectRatio: '1', border: 'none', borderRadius: 7,
                    fontSize: 13, fontWeight: isSel ? 800 : 500,
                    cursor: day ? 'pointer' : 'default',
                    background: isSel ? 'var(--primary)' : 'transparent',
                    color: day === null ? 'transparent' : isSel ? '#fff' : 'var(--text)',
                    transition: 'background .1s',
                  }}
                  onMouseEnter={e => { if (day && !isSel) e.currentTarget.style.background = 'var(--surface-2)' }}
                  onMouseLeave={e => { if (!isSel) e.currentTarget.style.background = 'transparent' }}
                >
                  {day ?? ''}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
