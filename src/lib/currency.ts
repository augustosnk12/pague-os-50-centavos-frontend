export function formatCents(cents: string): string {
  if (!cents) return ''
  const n = parseInt(cents, 10)
  return (n / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function parseCurrencyDigits(v: string): string {
  return v.replace(/\D/g, '').slice(0, 10) // max R$ 99.999.999,99
}
