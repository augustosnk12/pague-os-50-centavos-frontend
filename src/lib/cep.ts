// CEP is stored as digits only (8 chars) and displayed as 00000-000.
// Mirrors the store-digits / format-for-display approach used in lib/currency.ts.

export function parseCep(v: string): string {
  return v.replace(/\D/g, '').slice(0, 8)
}

export function formatCep(digits: string): string {
  const d = parseCep(digits)
  if (d.length <= 5) return d
  return `${d.slice(0, 5)}-${d.slice(5)}`
}
