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

/** Android splash background: the purple of the icon. */
const SPLASH_COLOR = '#6b2fc6'
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
    // The install icons are only read when installing: not precached (only
    // icon-192.png, which the opening screen in index.html shows offline too).
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
      // No theme_color: on Android, Chrome paints the system navigation bar
      // (back/home) with it, and the manifest has a single value — a light
      // bar showed under the dark theme. Without it Chrome follows the phone's
      // light/dark mode. The status bar still follows the app theme through
      // <meta name="theme-color"> (ThemeContext). `undefined` overrides the
      // plugin's default (#42b883); the plugin then warns that the app "will
      // not be able to be installed", which is not true (Chrome does not
      // require theme_color).
      theme_color: undefined,
      // Splash drawn by Android while the app starts: brand purple (from the
      // icon) works for both themes; then index.html's own splash takes over.
      background_color: SPLASH_COLOR,
      icons: [
        { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        { src: '/icon-maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
        { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    },
    workbox: {
      globPatterns: ['**/*.{js,css,html,woff2,svg}', 'favicon-*.png', 'icon-192.png'],
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

/** %APP_VERSION% in index.html (the splash shows the version). */
function appVersion(): Plugin {
  return { name: 'app-version', transformIndexHtml: (html) => html.replaceAll('%APP_VERSION%', version) }
}

export default defineConfig(({ mode }) => ({
  define: {
    __APP_VERSION__: JSON.stringify(version),
  },
  plugins: [react(), preloadFont(), appVersion(), pwa(loadEnv(mode, process.cwd(), 'VITE_').VITE_API_URL ?? '', mode === 'test')],
  server: {
    // Test output must not reload the app being used in the browser.
    watch: { ignored: ['**/playwright-report/**', '**/test-results/**', '**/dist/**'] },
  },
  build: {
    outDir: 'dist',
  },
}))
