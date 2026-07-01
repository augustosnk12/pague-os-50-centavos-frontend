import { useCalculator, type CalcOp } from '../../hooks/useCalculator'
import { Icon } from '../ui/Icon'

const PALETTES = {
  num: { bg: 'var(--surface)',       fg: 'var(--text)',       bd: 'var(--border)' },
  fn:  { bg: 'var(--surface-2)',     fg: 'var(--text-muted)', bd: 'var(--border)' },
  op:  { bg: 'var(--primary-weak)',  fg: 'var(--primary)',    bd: 'transparent'   },
  eq:  { bg: 'var(--primary)',       fg: 'var(--on-primary)', bd: 'transparent'   },
} as const

type KeyKind = keyof typeof PALETTES

interface CalcKeyProps {
  label?: string
  icon?: string
  kind?: KeyKind
  span?: number
  ariaLabel?: string
  onPress: () => void
}

function CalcKey({ label, icon, kind = 'num', span, ariaLabel, onPress }: CalcKeyProps) {
  const p = PALETTES[kind]
  return (
    <button
      type="button"
      onClick={onPress}
      aria-label={ariaLabel ?? label}
      className="lt-calc-key"
      style={{
        gridColumn: span ? `span ${span}` : 'auto',
        border: `1px solid ${p.bd}`,
        borderRadius: 'calc(var(--radius) * 0.7)',
        background: p.bg,
        color: p.fg,
        fontSize: 22,
        fontWeight: 700,
        cursor: 'pointer',
        display: 'grid',
        placeItems: 'center',
        transition: 'transform .08s',
        boxShadow: kind === 'eq' ? 'var(--shadow-primary)' : 'var(--shadow-sm)',
        fontFamily: 'inherit',
        WebkitTapHighlightColor: 'transparent',
      }}
      onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.93)' }}
      onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)' }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)' }}
      onTouchStart={(e) => { e.currentTarget.style.transform = 'scale(0.93)' }}
      onTouchEnd={(e) => { e.currentTarget.style.transform = 'scale(1)' }}
    >
      {icon ? <Icon name={icon} size={22} strokeWidth={2.2} /> : label}
    </button>
  )
}

export function Calculator() {
  const { display, expr, isErr, inputDigit, inputDot, clearAll, backspace, toggleSign, percent, chooseOp, equals } = useCalculator()

  const digit = (d: string) => <CalcKey key={d} label={d} onPress={() => inputDigit(d)} />
  const op = (label: string, o: CalcOp, aria: string) => <CalcKey label={label} kind="op" onPress={() => chooseOp(o)} ariaLabel={aria} />

  return (
    <div style={{ paddingTop: 2 }}>
      {/* Display */}
      <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '16px 18px', marginBottom: 14, textAlign: 'right', overflow: 'hidden' }}>
        <div style={{ minHeight: 20, fontSize: 14, color: 'var(--text-faint)', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {expr || ' '}
        </div>
        <div className="lt-calc-display" style={{ fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: isErr ? 'var(--overdue)' : 'var(--text)' }}>
          {display}
        </div>
      </div>

      {/* Keypad */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 9 }}>
        <CalcKey label="C"  kind="fn" onPress={clearAll}    ariaLabel="Limpar" />
        <CalcKey label="±"  kind="fn" onPress={toggleSign}  ariaLabel="Trocar sinal" />
        <CalcKey label="%"  kind="fn" onPress={percent}     ariaLabel="Porcentagem" />
        <CalcKey icon="backspace" kind="fn" onPress={backspace} ariaLabel="Apagar" />

        {digit('7')}{digit('8')}{digit('9')}
        <CalcKey icon="divide" kind="op" onPress={() => chooseOp('/')} ariaLabel="Dividir" />

        {digit('4')}{digit('5')}{digit('6')}
        {op('×', '*', 'Multiplicar')}

        {digit('1')}{digit('2')}{digit('3')}
        {op('−', '-', 'Subtrair')}

        <CalcKey label="0" span={2} onPress={() => inputDigit('0')} />
        <CalcKey label="," onPress={inputDot} ariaLabel="Vírgula decimal" />
        {op('+', '+', 'Somar')}

        <CalcKey label="=" kind="eq" span={4} onPress={equals} ariaLabel="Igual" />
      </div>
    </div>
  )
}
