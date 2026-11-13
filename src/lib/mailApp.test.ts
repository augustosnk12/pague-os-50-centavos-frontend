import { describe, it, expect } from 'vitest'
import { inboxUrl, maskEmail } from './mailApp'

describe('mail app shortcut', () => {
  it('opens the inbox of the big webmails, nothing for others', () => {
    expect(inboxUrl('ana@gmail.com')).toBe('https://mail.google.com/mail/u/0/#inbox')
    expect(inboxUrl('Ana@Hotmail.com')).toBe('https://outlook.live.com/mail/0/')
    expect(inboxUrl('ana@yahoo.com.br')).toBe('https://mail.yahoo.com/')
    expect(inboxUrl('ana@empresa.com.br')).toBeNull()
    expect(inboxUrl('sem-arroba')).toBeNull()
  })

  it('masks the address', () => {
    expect(maskEmail('augusto@email.com')).toBe('au•••@email.com')
    expect(maskEmail('ab@x.co')).toBe('ab•@x.co')
  })
})
