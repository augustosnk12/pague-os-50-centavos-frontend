import { describe, it, expect } from 'vitest'
import { maskPhone, phoneProblem } from './phone'

describe('Telefone (S9)', () => {
  it('masks while typing: landline and mobile', () => {
    expect(['1', '11', '119', '11987', '1198765', '11987654321'].map(maskPhone)).toEqual([
      '(1', '(11', '(11) 9', '(11) 987', '(11) 9876-5', '(11) 98765-4321',
    ])
    expect(maskPhone('1134567890')).toBe('(11) 3456-7890')
    expect(maskPhone('(11) 98765-43219999')).toBe('(11) 98765-4321')
  })

  it('stored values: digits only or with the country code show as the local number; "+…" stays', () => {
    expect(maskPhone('11999990000')).toBe('(11) 99999-0000')
    expect(maskPhone('5511987654321')).toBe('(11) 98765-4321')
    expect(maskPhone('+351 912 345 678')).toBe('+351 912 345 678')
  })

  it('"Telefone incompleto" only when it cannot be a number', () => {
    expect(phoneProblem('')).toBeNull()
    expect(phoneProblem('(11) 98765-4321')).toBeNull()
    expect(phoneProblem('(11) 3456-7890')).toBeNull()
    expect(phoneProblem('(11) 9876')).toBe('Telefone incompleto')
    expect(phoneProblem('+351 912 345 678')).toBeNull()
    expect(phoneProblem('+35')).toBe('Telefone incompleto')
  })
})
