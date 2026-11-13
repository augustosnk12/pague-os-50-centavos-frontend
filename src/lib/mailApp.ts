/**
 * "Abrir app de e-mail" (improvement 44): the inbox of the big webmails,
 * picked by the address domain. Unknown providers get no shortcut (a
 * mailto: link would open a new message, not the inbox).
 */
const INBOX: [RegExp, string][] = [
  [/^(gmail|googlemail)\.com$/, 'https://mail.google.com/mail/u/0/#inbox'],
  [/^(outlook|hotmail|live|msn)\.(com|com\.br)$/, 'https://outlook.live.com/mail/0/'],
  [/^(yahoo|ymail)\.(com|com\.br)$/, 'https://mail.yahoo.com/'],
  [/^(icloud|me|mac)\.com$/, 'https://www.icloud.com/mail'],
  [/^(uol|bol)\.com\.br$/, 'https://email.uol.com.br/'],
]

export function inboxUrl(email: string): string | null {
  const domain = email.trim().toLowerCase().split('@')[1] ?? ''
  return INBOX.find(([re]) => re.test(domain))?.[1] ?? null
}

/** "augusto@email.com" → "au•••@email.com" (shown on the expired-link screen). */
export function maskEmail(email: string): string {
  const [user, domain] = email.split('@')
  if (!domain) return email
  return `${user.slice(0, 2)}${'•'.repeat(Math.max(1, Math.min(3, user.length - 2)))}@${domain}`
}
