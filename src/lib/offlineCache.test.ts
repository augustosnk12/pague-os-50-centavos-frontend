import { afterEach, describe, expect, it, vi } from 'vitest'
import { removeToken } from './cookies'
import { API_CACHE, clearOfflineData } from './offlineCache'

describe('offline data (issue #5)', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('is deleted when the session ends', () => {
    const del = vi.fn().mockResolvedValue(true)
    vi.stubGlobal('caches', { delete: del })
    removeToken()
    expect(del).toHaveBeenCalledWith(API_CACHE)
  })

  it('does nothing where the Cache API does not exist', () => {
    vi.stubGlobal('caches', undefined)
    expect(() => clearOfflineData()).not.toThrow()
  })
})
