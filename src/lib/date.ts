/**
 * Today's date in the user's time zone, YYYY-MM-DD.
 * Use this (not toISOString(), which is UTC) for "today" sent to the API:
 * between 21:00 and midnight in Brazil the UTC date is already tomorrow.
 */
export function localToday(now: Date = new Date()): string {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
