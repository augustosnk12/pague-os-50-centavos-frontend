import { describe, it, expect } from 'vitest'
import { brCode, crc16 } from './pix'

describe('Pix BR Code', () => {
  it('matches the example of the Central Bank manual (known answer)', () => {
    expect(
      brCode({ key: '123e4567-e12b-12d1-a456-426655440000', name: 'Fulano de Tal', city: 'BRASILIA' }),
    ).toBe('00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-4266554400005204000053039865802BR5913Fulano de Tal6008BRASILIA62070503***63041D3D')
  })

  it('CRC16-CCITT (0x1021, init 0xFFFF): standard check value', () => {
    expect(crc16('123456789')).toBe('29B1')
  })

  it('carries the exact amount and a valid CRC', () => {
    const code = brCode({ key: '+5511912345678', name: 'Augusto Silva', amount: 250 })
    expect(code).toContain('5406250.00')
    expect(code.slice(-4)).toBe(crc16(code.slice(0, -4)))
  })

  it('plain ASCII name and city, capped at 25 / 15 characters', () => {
    const code = brCode({ key: 'a@b.co', name: 'José Conceição de Araújo Albuquerque', city: 'São José dos Campos' })
    expect(code).toContain('5924Jose Conceicao de Araujo6015')
    expect(code).toContain('6015Sao Jose dos Ca')
  })
})
