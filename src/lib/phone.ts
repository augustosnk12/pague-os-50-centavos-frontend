/**
 * Phone field (S9): a Brazilian number is masked while typed —
 * "(11) 3456-7890" or "(11) 98765-4321". An international one ("+351 …")
 * is kept as typed.
 */
export function maskPhone(raw: string): string {
  if (raw.trim().startsWith('+')) return raw.replace(/[^\d+\s()-]/g, '').slice(0, 20)
  let d = raw.replace(/\D/g, '')
  // A stored "5511987654321" (country code, no "+") shows as the local number.
  if (d.length > 11 && d.startsWith('55')) d = d.slice(2)
  d = d.slice(0, 11)
  if (!d) return ''
  if (d.length <= 2) return `(${d}`
  const ddd = d.slice(0, 2)
  const rest = d.slice(2)
  if (rest.length <= 4) return `(${ddd}) ${rest}`
  // 10 digits: 4 + 4; 11 digits (mobile): 5 + 4.
  const head = d.length === 11 ? 5 : 4
  return `(${ddd}) ${rest.slice(0, head)}-${rest.slice(head)}`
}

/** "Telefone incompleto" unless empty, 10/11 digits, or a full international number. */
export function phoneProblem(value: string): string | null {
  const digits = value.replace(/\D/g, '')
  if (!digits) return null
  if (value.trim().startsWith('+')) return digits.length >= 8 && digits.length <= 15 ? null : 'Telefone incompleto'
  return digits.length === 10 || digits.length === 11 ? null : 'Telefone incompleto'
}
