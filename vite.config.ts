import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { version } from './package.json'

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(version),
  },
  plugins: [react()],
  server: {
    // Test output must not reload the app being used in the browser.
    watch: { ignored: ['**/playwright-report/**', '**/test-results/**', '**/dist/**'] },
  },
  build: {
    outDir: 'dist',
  },
})
