import { describe, it, expect } from 'vitest'
import { whatsappLink } from './whatsapp'

describe('whatsappLink', () => {
  it('adds the country code to Brazilian numbers typed with DDD', () => {
    expect(whatsappLink('(11) 91234-5678')).toBe('https://wa.me/5511912345678')
    expect(whatsappLink('11 3456-7890')).toBe('https://wa.me/551134567890')
  })

  it('keeps numbers already in international form', () => {
    expect(whatsappLink('+55 11 91234-5678')).toBe('https://wa.me/5511912345678')
    expect(whatsappLink('5511912345678')).toBe('https://wa.me/5511912345678')
    expect(whatsappLink('+351 912 345 678')).toBe('https://wa.me/351912345678')
  })

  it('no link for missing or impossible numbers', () => {
    expect(whatsappLink(null)).toBeNull()
    expect(whatsappLink('')).toBeNull()
    expect(whatsappLink('12345')).toBeNull()
    expect(whatsappLink('441234567890')).toBeNull()
  })

  it('encodes the message', () => {
    expect(whatsappLink('11912345678', 'Oi, João! R$ 10,00 & tal')).toBe(
      'https://wa.me/5511912345678?text=Oi%2C%20Jo%C3%A3o!%20R%24%2010%2C00%20%26%20tal',
    )
  })
})
