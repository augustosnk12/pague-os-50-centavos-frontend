import { describe, it, expect } from 'vitest'
import { routePattern, vitalsPayload } from './vitals'

describe('web vitals payload (improvement 43)', () => {
  it('sends the route pattern, never an id or a query string', () => {
    expect(routePattern('/debtors/cm3x9k2l10000abcd?divida=cm3zz')).toBe('/debtors/:id')
    expect(routePattern('/installments')).toBe('/installments')
    expect(routePattern('/dashboard#x')).toBe('/dashboard')
    expect(routePattern('/auth/callback')).toBe('/auth/callback')
  })

  it('last value per metric, rounded; matches the API schema', () => {
    const body = JSON.parse(
      vitalsPayload(
        '/debtors/cm3x9k2l10000abcd',
        [
          { name: 'CLS', value: 0.0123456, rating: 'good' },
          { name: 'LCP', value: 1800.7, rating: 'good' },
          { name: 'CLS', value: 0.0456789, rating: 'good' },
        ],
        '1.1.0',
      ),
    )
    expect(body).toEqual({
      path: '/debtors/:id',
      version: '1.1.0',
      metrics: [
        { name: 'CLS', value: 0.0457, rating: 'good' },
        { name: 'LCP', value: 1801, rating: 'good' },
      ],
    })
  })
})
