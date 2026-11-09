// Shared settings for the end-to-end suite (used by the config and helpers).
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

export const API_DIR = resolve(process.env.API_DIR ?? '../pague-os-50-centavos')
export const API_PORT = Number(process.env.E2E_API_PORT ?? 3100)
export const WEB_PORT = Number(process.env.E2E_WEB_PORT ?? 5199)
export const API_URL = `http://localhost:${API_PORT}`
export const WEB_URL = `http://localhost:${WEB_PORT}`
// The API signs tokens with this secret; the suite never talks to a real one.
export const JWT_SECRET = 'e2e-secret'

/**
 * Database for the suite. Must end in `_test` (guard against wiping real data).
 * Defaults to the API's local DATABASE_URL with the name `<db>_e2e_test`.
 */
export function e2eDatabaseUrl() {
  let source = process.env.E2E_DATABASE_URL
  if (!source) {
    const envFile = resolve(API_DIR, '.env')
    const fromFile = existsSync(envFile)
      ? readFileSync(envFile, 'utf8').match(/^DATABASE_URL=(.*)$/m)?.[1]?.trim()
      : undefined
    if (!fromFile && !process.env.DATABASE_URL) {
      throw new Error('Set E2E_DATABASE_URL (or DATABASE_URL / the API .env) to run the e2e suite')
    }
    const url = new URL(fromFile ?? process.env.DATABASE_URL)
    url.pathname = `/${url.pathname.slice(1)}_e2e_test`
    source = url.toString()
  }
  const name = new URL(source).pathname.slice(1)
  if (!name.endsWith('_test')) throw new Error(`Refusing to use database "${name}": name must end with _test`)
  return source
}
