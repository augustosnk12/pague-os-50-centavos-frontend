import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
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

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(version),
  },
  plugins: [react(), preloadFont()],
  server: {
    // Test output must not reload the app being used in the browser.
    watch: { ignored: ['**/playwright-report/**', '**/test-results/**', '**/dist/**'] },
  },
  build: {
    outDir: 'dist',
  },
})
