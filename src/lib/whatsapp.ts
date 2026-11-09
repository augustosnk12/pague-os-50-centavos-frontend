/**
 * wa.me link for a Brazilian phone as typed by the user ("(11) 91234-5678",
 * "+55 11 91234-5678", "11912345678"…). Returns null when the number cannot
 * be a valid one, so the WhatsApp button is simply not shown.
 */
export function whatsappLink(phone: string | null | undefined, text?: string): string | null {
  if (!phone) return null
  let digits = phone.replace(/\D/g, '')
  if (phone.trim().startsWith('+')) {
    // Already international.
  } else if (digits.length === 10 || digits.length === 11) {
    digits = `55${digits}` // DDD + number
  } else if (digits.length === 12 || digits.length === 13) {
    if (!digits.startsWith('55')) return null
  } else {
    return null
  }
  if (digits.length < 12 || digits.length > 15) return null
  return `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ''}`
}
