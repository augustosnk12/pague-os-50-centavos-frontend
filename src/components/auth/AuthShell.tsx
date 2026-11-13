import { useRef, useState, type CSSProperties, type MouseEvent, type ReactNode } from 'react'
import { Logo } from '../layout/Logo'
import { PixelPig } from './PixelPig'

/** Taps on the ✓ coin that make the pig leap. */
const EGG_TAPS = 10

interface Leap {
  id: number
  x: number
  y: number
  dx: number
}

/**
 * Frame of the access screens (Entrar, Criar conta, Confira seu e-mail, link
 * expirado) — improvement 59, option A "Aurora": soft colour clouds in the
 * brand hues, a faint dot grid, floating glass coins and a frosted card with
 * the app's promise. Only CSS; motion off with "reduce motion"; the
 * decoration is hidden from screen readers.
 *
 * Easter egg: 10 taps on the ✓ coin and a pixel pig leaps off the screen.
 */
export function AuthShell({ children }: { children: ReactNode }) {
  const taps = useRef(0)
  const [squish, setSquish] = useState(0)
  const [leaps, setLeaps] = useState<Leap[]>([])
  const [said, setSaid] = useState('')

  const tap = (e: MouseEvent<HTMLButtonElement>) => {
    setSquish((n) => n + 1)
    taps.current += 1
    if (taps.current < EGG_TAPS) return
    taps.current = 0
    const r = e.currentTarget.getBoundingClientRect()
    const x = r.left + r.width / 2
    const leap = { id: Date.now(), x, y: r.top + r.height / 2, dx: (x < window.innerWidth / 2 ? 1 : -1) * Math.round(window.innerWidth * 0.35) }
    setLeaps((l) => [...l, leap])
    setSaid('')
    setTimeout(() => setSaid('Oinc! Um porquinho fugiu da tela.'), 50)
    setTimeout(() => setLeaps((l) => l.filter((p) => p.id !== leap.id)), 2000)
  }

  return (
    <div className="lt-auth" data-bg="aurora">
      <div className="lt-au-coins" aria-hidden="true">
        <span className="lt-au-coin">50¢</span>
        <span className="lt-au-coin">R$</span>
        <span className="lt-au-coin">50¢</span>
        {/* Decorative: out of the tab order and hidden from screen readers. */}
        <button key={squish} type="button" className="lt-au-coin lt-au-egg" data-squish={squish > 0 || undefined} tabIndex={-1} aria-hidden="true" onClick={tap}>
          ✓
        </button>
      </div>
      <main className="lt-auth-main lt-anim-up">
        <div className="lt-auth-logo">
          <Logo size={32} />
        </div>
        <div className="lt-auth-card">
          {children}
          <p className="lt-auth-tag">Quem te deve, quanto e quando. Sem planilha.</p>
        </div>
      </main>
      {leaps.map((p) => (
        <div key={p.id} aria-hidden="true">
          <div className="lt-pig" style={{ left: p.x - 48, top: p.y - 36, '--dx': `${p.dx}px` } as CSSProperties}>
            <PixelPig flip={p.dx < 0} />
          </div>
          {Array.from({ length: 8 }, (_, i) => {
            const a = (i / 8) * Math.PI * 2
            return (
              <span
                key={i}
                className="lt-pig-puff"
                style={{ left: p.x, top: p.y, '--px': `${Math.round(Math.cos(a) * 46)}px`, '--py': `${Math.round(Math.sin(a) * 46)}px` } as CSSProperties}
              />
            )
          })}
        </div>
      ))}
      <div className="lt-sr-only" role="status" aria-live="polite">{said}</div>
    </div>
  )
}
