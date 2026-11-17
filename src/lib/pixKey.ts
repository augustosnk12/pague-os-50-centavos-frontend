/**
 * Pix key in Configurações (S11, improvement 33): the type picks the mask and
 * the keyboard; validation mirrors the API (domain/services/pix-key.ts), so a
 * key the field accepts is a key the API accepts.
 */
import type { PixKeyType } from '../api/settings.api'

export const PIX_TYPES: { id: PixKeyType; label: string; placeholder: string; inputMode: 'numeric' | 'tel' | 'email' | 'text'; max: number }[] = [
  { id: 'CPF', label: 'CPF', placeholder: '000.000.000-00', inputMode: 'numeric', max: 14 },
  { id: 'CNPJ', label: 'CNPJ', placeholder: '00.000.000/0000-00', inputMode: 'numeric', max: 18 },
  { id: 'PHONE', label: 'Celular', placeholder: '(00) 00000-0000', inputMode: 'tel', max: 15 },
  { id: 'EMAIL', label: 'E-mail', placeholder: 'voce@email.com', inputMode: 'email', max: 77 },
  { id: 'RANDOM', label: 'Aleatória', placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', inputMode: 'text', max: 36 },
]

const digits = (v: string) => v.replace(/\D/g, '')

function groups(s: string, sizes: number[], seps: string[]): string {
  let out = ''
  let i = 0
  sizes.forEach((g, k) => {
    if (i >= s.length) return
    if (k) out += seps[k - 1]
    out += s.slice(i, i + g)
    i += g
  })
  return out
}

/** Mask while typing (and to show the key the API stored, already normalized). */
export function maskPixKey(type: PixKeyType, value: string): string {
  switch (type) {
    case 'CPF':
      return groups(digits(value).slice(0, 11), [3, 3, 3, 2], ['.', '.', '-'])
    case 'CNPJ':
      return groups(digits(value).slice(0, 14), [2, 3, 3, 4, 2], ['.', '.', '/', '-'])
    case 'PHONE': {
      let d = digits(value)
      if (d.length > 11 && d.startsWith('55')) d = d.slice(2) // "+5511987654321" from the API
      d = d.slice(0, 11)
      if (!d) return ''
      if (d.length <= 2) return `(${d}`
      const rest = d.slice(2)
      const head = d.length === 11 ? 5 : 4
      return `(${d.slice(0, 2)}) ${rest.slice(0, head)}${rest.length > head ? `-${rest.slice(head)}` : ''}`
    }
    case 'RANDOM':
      return groups(value.toLowerCase().replace(/[^0-9a-f]/g, '').slice(0, 32), [8, 4, 4, 4, 12], ['-', '-', '-', '-'])
    case 'EMAIL':
      return value.trim().toLowerCase().slice(0, 77)
  }
}

function validCpf(cpf: string): boolean {
  if (!/^\d{11}$/.test(cpf) || /^(\d)\1{10}$/.test(cpf)) return false
  const check = (len: number) => {
    let sum = 0
    for (let i = 0; i < len; i++) sum += Number(cpf[i]) * (len + 1 - i)
    const r = (sum * 10) % 11
    return r === 10 ? 0 : r
  }
  return check(9) === Number(cpf[9]) && check(10) === Number(cpf[10])
}

function validCnpj(cnpj: string): boolean {
  if (!/^\d{14}$/.test(cnpj) || /^(\d)\1{13}$/.test(cnpj)) return false
  const check = (len: number) => {
    const weights = len === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    const sum = weights.reduce((s, w, i) => s + w * Number(cnpj[i]), 0)
    const r = sum % 11
    return r < 2 ? 0 : 11 - r
  }
  return check(12) === Number(cnpj[12]) && check(13) === Number(cnpj[13])
}

export type PixKeyCheck = 'empty' | 'incomplete' | 'invalid' | 'valid'

/** "incomplete" while typing; "invalid" when complete but wrong (check digits, not a mobile number…). */
export function checkPixKey(type: PixKeyType, value: string): PixKeyCheck {
  const v = value.trim()
  if (!v) return 'empty'
  const d = digits(v)
  switch (type) {
    case 'CPF':
      return d.length < 11 ? 'incomplete' : validCpf(d) ? 'valid' : 'invalid'
    case 'CNPJ':
      return d.length < 14 ? 'incomplete' : validCnpj(d) ? 'valid' : 'invalid'
    case 'PHONE': {
      const local = d.length > 11 && d.startsWith('55') ? d.slice(2) : d
      return local.length < 11 ? 'incomplete' : /^[1-9][1-9]9\d{8}$/.test(local) ? 'valid' : 'invalid'
    }
    case 'EMAIL':
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) && v.length <= 77 ? 'valid' : 'incomplete'
    case 'RANDOM':
      return v.length < 36 ? 'incomplete' : /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(v.toLowerCase()) ? 'valid' : 'invalid'
  }
}

export const PIX_CHECK_TEXT: Record<PixKeyCheck, string> = {
  empty: '',
  incomplete: 'Formato incompleto',
  invalid: 'Chave inválida · confira os números',
  valid: '✓ Chave válida',
}
