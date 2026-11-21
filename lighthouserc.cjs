/**
 * Lighthouse CI (improvement 43). Measures the production build served by
 * `vite preview` on the public screens — the landing ("/") and Entrar —
 * which carry the whole first-load cost (bundle, font, layout). Logged-in
 * screens are measured in real use by web-vitals (POST /vitals).
 *
 * Targets from the plan: LCP < 2 s (simulated 4G, mobile), CLS < 0.05,
 * accessibility 100, performance score ≥ 0.9. Reports stay local / as a CI
 * artifact (no public upload).
 */
module.exports = {
  ci: {
    collect: {
      startServerCommand: 'npx vite preview --port 4173 --strictPort',
      startServerReadyPattern: 'Local',
      url: ['http://localhost:4173/', 'http://localhost:4173/login'],
      numberOfRuns: 3,
      settings: {
        // Chrome on the CI runner has no sandbox user namespace.
        chromeFlags: '--no-sandbox --headless=new',
      },
    },
    assert: {
      assertions: {
        'largest-contentful-paint': ['error', { maxNumericValue: 2000, aggregationMethod: 'median' }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.05, aggregationMethod: 'median' }],
        'categories:accessibility': ['error', { minScore: 1 }],
        // Stable at 0.99 since the font is served by the app (was 0.69–0.96 with Google Fonts).
        'categories:performance': ['error', { minScore: 0.9, aggregationMethod: 'median' }],
      },
    },
    upload: { target: 'filesystem', outputDir: '.lighthouseci' },
  },
}
