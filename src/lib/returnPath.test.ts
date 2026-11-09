import { describe, it, expect, beforeEach } from 'vitest'
import { isSafeReturnPath, rememberReturnPath, takeReturnPath } from './returnPath'

describe('return path after an expired session', () => {
  beforeEach(() => localStorage.clear())

  it('keeps only same-site app paths (no open redirect)', () => {
    for (const ok of ['/installments', '/debtors/abc?tab=pays', '/dashboard']) expect(isSafeReturnPath(ok), ok).toBe(true)
    for (const bad of ['https://evil.com', '//evil.com/x', '/\\evil.com', 'javascript:alert(1)', '/login', '/auth/callback?x', '', 42, null]) {
      expect(isSafeReturnPath(bad), String(bad)).toBe(false)
    }
  })

  it('is used once', () => {
    rememberReturnPath('/installments?period=week')
    expect(takeReturnPath()).toBe('/installments?period=week')
    expect(takeReturnPath()).toBeNull()
  })

  it('ignores tampered or stale values', () => {
    localStorage.setItem('pague50_return_to', JSON.stringify({ path: '//evil.com', at: Date.now() }))
    expect(takeReturnPath()).toBeNull()
    localStorage.setItem('pague50_return_to', JSON.stringify({ path: '/dashboard', at: Date.now() - 2 * 86400000 }))
    expect(takeReturnPath()).toBeNull()
    localStorage.setItem('pague50_return_to', 'not json')
    expect(takeReturnPath()).toBeNull()
  })
})
