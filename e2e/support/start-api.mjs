// Starts the real API for the e2e suite on an empty database.
// Run by Playwright's webServer; the API repo path comes from API_DIR.
import { execSync, spawn } from 'node:child_process'
import { API_DIR, API_PORT, JWT_SECRET, WEB_URL, API_URL, e2eDatabaseUrl } from './env.mjs'

const env = {
  ...process.env,
  DATABASE_URL: e2eDatabaseUrl(),
  JWT_SECRET,
  // Mail is never sent by the suite (login uses tokens written to the DB).
  RESEND_API_KEY: process.env.RESEND_API_KEY_E2E ?? 're_e2e_dummy',
  MAIL_FROM: 'e2e@example.com',
  APP_URL: API_URL,
  FRONTEND_URL: WEB_URL,
  PORT: String(API_PORT),
  // "production" makes CORS accept FRONTEND_URL (development hard-codes :5173).
  NODE_ENV: 'production',
}

execSync('npx prisma migrate reset --force --skip-seed', { cwd: API_DIR, env, stdio: 'inherit' })

const server = spawn('npx', ['tsx', 'src/interface/http/server.ts'], {
  cwd: API_DIR,
  env,
  stdio: 'inherit',
  shell: process.platform === 'win32',
})
const stop = () => server.kill()
process.on('SIGINT', stop)
process.on('SIGTERM', stop)
server.on('exit', (code) => process.exit(code ?? 0))
