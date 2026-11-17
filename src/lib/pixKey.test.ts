import { describe, it, expect } from 'vitest'
import { checkPixKey, maskPixKey } from './pixKey'

describe('Chave Pix (S11)', () => {
  it('masks by type, also the normalized key the API returns', () => {
    expect(maskPixKey('CPF', '52998224725')).toBe('529.982.247-25')
    expect(maskPixKey('CNPJ', '11222333000181')).toBe('11.222.333/0001-81')
    expect(maskPixKey('PHONE', '+5511987654321')).toBe('(11) 98765-4321')
    expect(maskPixKey('PHONE', '1198765')).toBe('(11) 9876-5')
    expect(maskPixKey('RANDOM', '123E4567E89B12D3A456426614174000')).toBe('123e4567-e89b-12d3-a456-426614174000')
    expect(maskPixKey('EMAIL', ' Maria@Email.COM ')).toBe('maria@email.com')
  })

  it('validates like the API: check digits, mobile phone, e-mail, UUID', () => {
    expect(checkPixKey('CPF', '529.982.247-2')).toBe('incomplete')
    expect(checkPixKey('CPF', '529.982.247-25')).toBe('valid')
    expect(checkPixKey('CPF', '529.982.247-26')).toBe('invalid')
    expect(checkPixKey('CPF', '111.111.111-11')).toBe('invalid')
    expect(checkPixKey('CNPJ', '11.222.333/0001-81')).toBe('valid')
    expect(checkPixKey('CNPJ', '11.222.333/0001-82')).toBe('invalid')
    expect(checkPixKey('PHONE', '(11) 98765-4321')).toBe('valid')
    expect(checkPixKey('PHONE', '(11) 3456-78901')).toBe('invalid')
    expect(checkPixKey('EMAIL', 'maria@email')).toBe('incomplete')
    expect(checkPixKey('EMAIL', 'maria@email.com')).toBe('valid')
    expect(checkPixKey('RANDOM', '123e4567-e89b-12d3-a456-426614174000')).toBe('valid')
    expect(checkPixKey('CPF', '')).toBe('empty')
  })
})
