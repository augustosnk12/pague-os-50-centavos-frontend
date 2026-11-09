import { describe, it, expect, vi, afterEach } from 'vitest'
import { api, OFFLINE_SAVE_ERROR, NETWORK_SAVE_ERROR } from './axios'
import { getApiError } from './api'

const setOnline = (v: boolean) => Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => v })

describe('API client (F4)', () => {
  afterEach(() => {
    setOnline(true)
    api.defaults.adapter = undefined
  })

  it('offline: changes are blocked before being sent, with "nada foi salvo"', async () => {
    const adapter = vi.fn()
    api.defaults.adapter = adapter
    setOnline(false)
    const err = await api.post('/installments/x/payments', { amount: 1 }).catch((e) => e)
    expect(getApiError(err)).toBe(OFFLINE_SAVE_ERROR)
    expect(adapter).not.toHaveBeenCalled()
  })

  it('offline: reads still go out (cached data / retry)', async () => {
    const adapter = vi.fn().mockResolvedValue({ data: [], status: 200, statusText: 'OK', headers: {}, config: {} })
    api.defaults.adapter = adapter
    setOnline(false)
    await api.get('/debtors')
    expect(adapter).toHaveBeenCalledOnce()
  })

  it('a change that fails without a response gets a clear message', async () => {
    api.defaults.adapter = vi.fn().mockRejectedValue(Object.assign(new Error('Network Error'), { isAxiosError: true, config: { method: 'post' } }))
    const err = await api.post('/debts', {}).catch((e) => e)
    expect(getApiError(err)).toBe(NETWORK_SAVE_ERROR)
  })
})
