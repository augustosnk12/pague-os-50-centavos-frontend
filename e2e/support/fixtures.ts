import { test as base, expect, type APIRequestContext, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { execFileSync } from 'node:child_process'
import { createHmac, randomBytes } from 'node:crypto'
import { API_DIR, API_URL, JWT_SECRET, WEB_URL, e2eDatabaseUrl } from './env.mjs'

export interface Session {
  token: string
  lender: { id: string; email: string; name: string }
  /** Authenticated call to the real API (used to seed data). */
  api: (method: 'GET' | 'POST' | 'PUT' | 'DELETE', path: string, body?: unknown) => Promise<any> // eslint-disable-line @typescript-eslint/no-explicit-any -- JSON payloads of many shapes
}

/**
 * Creates a confirmed lender directly in the database with a one-time login
 * token — the same state the "magic link" e-mail leaves behind — and returns
 * the token. No e-mail is sent.
 */
export function createLenderWithLoginToken(name = 'Augusto Silva') {
  const id = `e2e_${randomBytes(8).toString('hex')}`
  const token = randomBytes(32).toString('hex')
  const email = `${id}@e2e.test`
  const sql = `INSERT INTO "Lender" ("id","email","name","confirmed","authToken","authTokenType","authTokenExpiresAt","createdAt","updatedAt")
    VALUES ('${id}','${email}','${name.replace(/'/g, "''")}',true,'${token}','LOGIN',now() + interval '1 hour',now(),now());`
  execFileSync('npx', ['prisma', 'db', 'execute', '--stdin', '--url', e2eDatabaseUrl()], {
    cwd: API_DIR,
    input: sql,
    shell: process.platform === 'win32',
    stdio: ['pipe', 'ignore', 'inherit'],
  })
  return { id, email, name, token }
}

/**
 * Session for tests that are not about login: the lender exists in the
 * database and the token is signed with the suite's JWT secret (HS256, same
 * payload the API issues). The real magic-link flow has dedicated tests; going
 * through it here would hit the API's auth rate limit (10 per 15 min).
 */
function signJwt(payload: Record<string, unknown>): string {
  const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url')
  const body = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ ...payload, iat: Math.floor(Date.now() / 1000) })}`
  return `${body}.${createHmac('sha256', JWT_SECRET).update(body).digest('base64url')}`
}

async function apiLogin(request: APIRequestContext): Promise<Session> {
  const l = createLenderWithLoginToken()
  const token = signJwt({ sub: l.id, email: l.email })
  const api: Session['api'] = async (method, path, body) => {
    const r = await request.fetch(`${API_URL}${path}`, {
      method,
      headers: { Authorization: `Bearer ${token}` },
      data: body,
    })
    expect(r.ok(), `${method} ${path} → ${r.status()} ${await r.text()}`).toBeTruthy()
    return r.json()
  }
  return { token, lender: { id: l.id, email: l.email, name: l.name }, api }
}

/** Puts a session in the browser exactly where the app keeps it (cookie + localStorage). */
async function applySession(page: Page, s: Session) {
  await page.context().addCookies([{ name: 'pague50_token', value: s.token, url: WEB_URL, sameSite: 'Strict' }])
  await page.addInitScript((lender) => {
    localStorage.setItem('pague50_lender', JSON.stringify(lender))
  }, s.lender)
}

/** Records accessibility violations on the current page (report-only for now). */
async function a11yReport(page: Page, testInfo: import('@playwright/test').TestInfo, label: string) {
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()
  const summary = results.violations.map((v) => `${v.impact ?? '-'} ${v.id} (${v.nodes.length})`)
  await testInfo.attach(`axe-${label}.json`, { body: JSON.stringify(results.violations, null, 2), contentType: 'application/json' })
  testInfo.annotations.push({ type: 'a11y', description: `${label}: ${summary.length} violation types — ${summary.join(', ') || 'none'}` })
  return results.violations
}

export const test = base.extend<{ session: Session; a11y: (label: string) => Promise<unknown[]> }>({
  session: async ({ page, request }, use) => {
    const s = await apiLogin(request)
    await applySession(page, s)
    await use(s)
  },
  a11y: async ({ page }, use, testInfo) => {
    await use((label) => a11yReport(page, testInfo, label))
  },
})

export { expect }

/** First day of next month at 00:00 UTC, as ISO (the app's default due date). */
export function nextMonthISO(day = 10) {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, day)).toISOString()
}

/** A date in the current month, ISO. */
export function thisMonthISO(day: number) {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), day)).toISOString()
}
