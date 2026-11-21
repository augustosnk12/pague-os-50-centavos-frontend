import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { version } from './package.json'

/**
 * Preload the Latin Manrope file (improvement 43): the browser starts fetching
 * the font with the HTML instead of after the CSS is parsed, so the text shows
 * in Manrope sooner (less swap). Build only; the file name has a content hash.
 */
function preloadFont(): Plugin {
  return {
    name: 'preload-manrope-latin',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(_html, ctx) {
        const font = Object.keys(ctx.bundle ?? {}).find((f) => /manrope-latin-wght-normal.*\.woff2$/.test(f))
        if (!font) throw new Error('preload-manrope-latin: the Latin Manrope file is not in the build')
        return [{ tag: 'link', attrs: { rel: 'preload', href: `/${font}`, as: 'font', type: 'font/woff2', crossorigin: '' }, injectTo: 'head-prepend' }]
      },
    },
  }
}

/** Same values as --bg in src/styles/index.css (light / dark), in hex. */
const THEME_COLOR = { light: '#faf9fe', dark: '#0d0b13' }
/** Cache of API reads for offline use; emptied on logout (same name in src/lib/offlineCache.ts). */
const API_CACHE = 'api-reads'

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * Installable app + offline read-only mode (issue #5).
 * - The app files are precached; any route opens index.html (SPA).
 * - API GETs: network first, falling back to the last answer saved, so the
 *   app shows the latest data offline. /auth/* is never cached, and Workbox
 *   only caches GET (changes are blocked offline by src/lib/axios.ts).
 * - registerType 'prompt': a new version waits for "Atualizar" instead of
 *   replacing the app while it is in use (src/components/layout/UpdatePrompt.tsx).
 */
function pwa(apiUrl: string, disable: boolean) {
  const api = apiUrl.replace(/\/+$/, '')
  return VitePWA({
    disable,
    registerType: 'prompt',
    injectRegister: false,
    // The install icons (~550 KB) are only read when installing: not precached.
    includeManifestIcons: false,
    manifest: {
      id: '/',
      name: 'Pague os 50 centavos',
      short_name: '50 centavos',
      description: 'Controle de quem te deve: devedores, cobranças e parcelas.',
      lang: 'pt-BR',
      start_url: '/dashboard',
      scope: '/',
      display: 'standalone',
      orientation: 'portrait',
      theme_color: THEME_COLOR.light,
      background_color: THEME_COLOR.light,
      icons: [
        { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        { src: '/icon-maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
        { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    },
    workbox: {
      globPatterns: ['**/*.{js,css,html,woff2,svg}', 'favicon-*.png'],
      navigateFallback: '/index.html',
      cleanupOutdatedCaches: true,
      runtimeCaching: api
        ? [
            {
              urlPattern: new RegExp(`^${escapeRegExp(api)}/(?!auth/)`),
              method: 'GET',
              handler: 'NetworkFirst',
              options: {
                cacheName: API_CACHE,
                // A weak signal (lie-fi) falls back to the saved data instead of hanging.
                networkTimeoutSeconds: 8,
                cacheableResponse: { statuses: [200] },
                expiration: { maxEntries: 300, maxAgeSeconds: 30 * 24 * 60 * 60 },
              },
            },
          ]
        : [],
    },
  })
}

export default defineConfig(({ mode }) => ({
  define: {
    __APP_VERSION__: JSON.stringify(version),
  },
  plugins: [react(), preloadFont(), pwa(loadEnv(mode, process.cwd(), 'VITE_').VITE_API_URL ?? '', mode === 'test')],
  server: {
    // Test output must not reload the app being used in the browser.
    watch: { ignored: ['**/playwright-report/**', '**/test-results/**', '**/dist/**'] },
  },
  build: {
    outDir: 'dist',
  },
}))
