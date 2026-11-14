export function formatCents(cents: string): string {
  if (!cents) return ''
  const n = parseInt(cents, 10)
  return (n / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function parseCurrencyDigits(v: string): string {
  return v.replace(/\D/g, '').slice(0, 10) // max R$ 99.999.999,99
}

/** Width of an amount field: digits are 1ch (tabular), "," and "." about 0.35ch. */
export function amountWidth(text: string): string {
  const shown = text || '0,00'
  const digits = shown.replace(/\D/g, '').length
  return `${digits + (shown.length - digits) * 0.35 + 0.15}ch`
}
