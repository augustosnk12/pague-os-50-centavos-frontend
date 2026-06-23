import { useReducer, useEffect } from 'react'

export type CalcOp = '+' | '-' | '*' | '/'

const OP_SYM: Record<CalcOp, string> = { '+': '+', '-': '−', '*': '×', '/': '÷' }

interface State {
  cur: string
  acc: number | null
  op: CalcOp | null
  fresh: boolean
  expr: string
}

type Action =
  | { type: 'digit'; d: string }
  | { type: 'dot' }
  | { type: 'clear' }
  | { type: 'backspace' }
  | { type: 'sign' }
  | { type: 'percent' }
  | { type: 'op'; op: CalcOp }
  | { type: 'equals' }

const INIT: State = { cur: '0', acc: null, op: null, fresh: true, expr: '' }
const ERR: State = { ...INIT, cur: 'Erro' }

function round12(n: number): number {
  return parseFloat(n.toFixed(10))
}

export function calcFmt(str: string): string {
  if (!str || str === '-') return '0'
  if (str === 'Erro') return str
  const neg = str.startsWith('-')
  const s = neg ? str.slice(1) : str
  const [intp, decp] = s.split('.')
  const grouped = Number(intp || '0').toLocaleString('pt-BR')
  return (neg ? '-' : '') + grouped + (decp !== undefined ? ',' + decp : '')
}

function compute(a: number, b: number, op: CalcOp): number | 'Erro' {
  switch (op) {
    case '+': return round12(a + b)
    case '-': return round12(a - b)
    case '*': return round12(a * b)
    case '/': return b === 0 ? 'Erro' : round12(a / b)
  }
}

function reducer(s: State, a: Action): State {
  switch (a.type) {
    case 'digit': {
      if (s.cur === 'Erro') return { ...INIT, cur: a.d === '0' ? '0' : a.d, fresh: false }
      if (s.fresh) return { ...s, cur: a.d === '0' ? '0' : a.d, fresh: false }
      if (s.cur === '0') return { ...s, cur: a.d }
      if (s.cur.replace(/[-.]/g, '').length >= 12) return s
      return { ...s, cur: s.cur + a.d }
    }
    case 'dot': {
      if (s.cur === 'Erro') return { ...INIT, cur: '0.', fresh: false }
      if (s.fresh) return { ...s, cur: '0.', fresh: false }
      if (s.cur.includes('.')) return s
      return { ...s, cur: s.cur + '.' }
    }
    case 'clear':
      return INIT
    case 'backspace': {
      if (s.fresh || s.cur === 'Erro') return s
      const next = s.cur.length <= 1 || (s.cur.length === 2 && s.cur.startsWith('-')) ? '0' : s.cur.slice(0, -1)
      return { ...s, cur: next }
    }
    case 'sign': {
      if (s.cur === '0' || s.cur === 'Erro') return s
      return { ...s, cur: s.cur.startsWith('-') ? s.cur.slice(1) : '-' + s.cur }
    }
    case 'percent': {
      if (s.cur === 'Erro') return s
      const v = parseFloat(s.cur) || 0
      const base = s.acc != null && s.op ? s.acc : 1
      return { ...s, cur: String(s.op ? round12(base * v / 100) : round12(v / 100)) }
    }
    case 'op': {
      if (s.cur === 'Erro') return s
      const val = parseFloat(s.cur) || 0
      if (s.op && !s.fresh) {
        const r = compute(s.acc!, val, s.op)
        if (r === 'Erro') return ERR
        return { cur: String(r), acc: r, op: a.op, fresh: true, expr: `${calcFmt(String(r))} ${OP_SYM[a.op]}` }
      }
      return { ...s, acc: val, op: a.op, fresh: true, expr: `${calcFmt(s.cur)} ${OP_SYM[a.op]}` }
    }
    case 'equals': {
      if (s.op == null || s.cur === 'Erro') return s
      const val = parseFloat(s.cur) || 0
      const r = compute(s.acc!, val, s.op)
      if (r === 'Erro') return ERR
      return { cur: String(r), acc: null, op: null, fresh: true, expr: `${calcFmt(String(s.acc!))} ${OP_SYM[s.op]} ${calcFmt(s.cur)} =` }
    }
  }
}

export function useCalculator() {
  const [state, dispatch] = useReducer(reducer, INIT)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.target as HTMLElement).closest?.('input, textarea, select')) return
      const k = e.key
      if (k >= '0' && k <= '9') { dispatch({ type: 'digit', d: k }); e.preventDefault() }
      else if (k === '.' || k === ',') { dispatch({ type: 'dot' }); e.preventDefault() }
      else if (k === '+') { dispatch({ type: 'op', op: '+' }); e.preventDefault() }
      else if (k === '-') { dispatch({ type: 'op', op: '-' }); e.preventDefault() }
      else if (k === '*') { dispatch({ type: 'op', op: '*' }); e.preventDefault() }
      else if (k === '/') { dispatch({ type: 'op', op: '/' }); e.preventDefault() }
      else if (k === 'Enter' || k === '=') { dispatch({ type: 'equals' }); e.preventDefault() }
      else if (k === 'Backspace') { dispatch({ type: 'backspace' }); e.preventDefault() }
      else if (k === '%') { dispatch({ type: 'percent' }); e.preventDefault() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const isErr = state.cur === 'Erro'

  return {
    display: isErr ? 'Erro' : calcFmt(state.cur),
    expr: state.expr,
    isErr,
    inputDigit: (d: string) => dispatch({ type: 'digit', d }),
    inputDot: () => dispatch({ type: 'dot' }),
    clearAll: () => dispatch({ type: 'clear' }),
    backspace: () => dispatch({ type: 'backspace' }),
    toggleSign: () => dispatch({ type: 'sign' }),
    percent: () => dispatch({ type: 'percent' }),
    chooseOp: (op: CalcOp) => dispatch({ type: 'op', op }),
    equals: () => dispatch({ type: 'equals' }),
  }
}
