import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./src/test/setup.ts'],
      include: ['src/**/*.test.{ts,tsx}'],
      css: false,
      // Brazilian time zone, as for real users; tests fix "now" with vi.setSystemTime.
      env: { TZ: 'America/Sao_Paulo' },
      coverage: { provider: 'v8', reporter: ['text', 'lcov'], include: ['src/**'] },
    },
  }),
)
