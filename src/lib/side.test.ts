import { describe, it, expect, afterEach } from 'vitest'
import { readSide, sideText, storeSide } from './side'
import { setApiKind, withSide } from './apiSide'
import { translateApiError } from './utils'

describe('"Eu devo" (item 75)', () => {
  afterEach(() => {
    setApiKind('DEBTOR')
    localStorage.clear()
  })

  it('words of the side: unchanged on "Me devem"; Credores, Pagamentos, A pagar… on "Eu devo"', () => {
    const cases: [string, string][] = [
      ['Devedores', 'Credores'],
      ['Buscar devedor ou dívida…', 'Buscar credor ou dívida…'],
      ['Recebimentos', 'Pagamentos'],
      ['A receber em novembro', 'A pagar em novembro'],
      ['R$ 10 recebido de R$ 20', 'R$ 10 pago de R$ 20'],
      ['Receber várias de uma vez', 'Pagar várias de uma vez'],
      ['veja quem precisa te pagar.', 'veja quem você precisa pagar.'],
      ['Quem mais vai te pagar', 'Quem mais você vai pagar'],
      ['Deve ', 'Você deve '],
      ['Para quem?', 'Para quem você deve?'],
      ['Adicione a primeira pessoa que te deve.', 'Adicione a primeira pessoa para quem você deve.'],
      ['Cadastre quem te deve', 'Cadastre para quem você deve'],
    ]
    for (const [a, b] of cases) {
      expect(sideText(a, 'in')).toBe(a)
      expect(sideText(a, 'out')).toBe(b)
    }
  })

  it('a name already used on the other side is explained in Portuguese, with what to do', () => {
    expect(translateApiError('Name already used on the other side')).toMatch(/^Esse nome já está no outro lado \(Me devem \/ Eu devo\)\. Por enquanto, use um nome um pouco diferente/)
  })

  it('the side is kept on this device; a new device (or blocked storage) opens in "Me devem"', () => {
    expect(readSide()).toBe('in')
    storeSide('out')
    expect(readSide()).toBe('out')
    storeSide('in')
    expect(localStorage.getItem('pague50_side')).toBeNull()
  })

  it('API calls: untouched on "Me devem"; on "Eu devo", the lists ask for creditors and new people are creditors', () => {
    const get = (url: string, params?: object) => ({ url, method: 'get', params })
    expect(withSide(get('/debtors'))).toEqual(get('/debtors'))
    setApiKind('CREDITOR')
    expect(withSide(get('/debtors')).params).toEqual({ kind: 'CREDITOR' })
    expect(withSide(get('/debtors?archived=true')).params).toEqual({ kind: 'CREDITOR' })
    expect(withSide(get('/installments', { period: 'month' })).params).toEqual({ period: 'month', kind: 'CREDITOR' })
    for (const u of ['/dashboard/overview', '/payments', '/payments/summary', '/search']) expect(withSide(get(u)).params).toEqual({ kind: 'CREDITOR' })
    // By id, settings and the account: no side.
    for (const u of ['/debtors/abc', '/debtors/abc/debts', '/settings', '/me/plan', '/me/summary']) expect(withSide(get(u)).params).toBeUndefined()
    expect(withSide({ url: '/debtors', method: 'post', data: { name: 'Mãe' } }).data).toEqual({ name: 'Mãe', kind: 'CREDITOR' })
    expect(withSide({ url: '/debts', method: 'post', data: { a: 1 } }).data).toEqual({ a: 1 })
  })
})
