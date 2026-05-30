import Cookies from 'js-cookie'

const TOKEN_KEY = 'pague50_token'
const LENDER_KEY = 'pague50_lender'

export function getToken(): string | undefined {
  return Cookies.get(TOKEN_KEY)
}

export function setToken(token: string): void {
  Cookies.set(TOKEN_KEY, token, { expires: 30, sameSite: 'strict' })
}

export function removeToken(): void {
  Cookies.remove(TOKEN_KEY)
}

export function getLenderFromStorage(): { id: string; email: string; name: string | null } | null {
  try {
    const raw = localStorage.getItem(LENDER_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function setLenderInStorage(lender: { id: string; email: string; name: string | null }): void {
  localStorage.setItem(LENDER_KEY, JSON.stringify(lender))
}

export function removeLenderFromStorage(): void {
  localStorage.removeItem(LENDER_KEY)
}
