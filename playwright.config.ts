import { defineConfig, devices } from '@playwright/test'
import { API_URL, WEB_PORT, WEB_URL } from './e2e/support/env.mjs'

/**
 * End-to-end suite: real API (from API_DIR, default ../pague-os-50-centavos)
 * on an empty `<db>_e2e_test` database, and this app served by Vite.
 *
 *   npm run e2e                     # mobile + desktop (Chromium)
 *   npm run e2e -- --project=desktop
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: WEB_URL,
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } } },
  ],
  webServer: [
    {
      command: 'node e2e/support/start-api.mjs',
      url: `${API_URL}/health`,
      timeout: 120_000,
      reuseExistingServer: false,
      stdout: 'ignore',
    },
    {
      command: `npx vite --port ${WEB_PORT} --strictPort`,
      url: WEB_URL,
      timeout: 60_000,
      reuseExistingServer: false,
      env: { VITE_API_URL: API_URL },
    },
  ],
})
