#!/usr/bin/env node
/**
 * Bundle budget (improvement 43): the JavaScript the browser must download
 * before the first screen — the entry chunk plus what index.html preloads —
 * must stay under the budget, gzip-compressed. Run after `vite build`.
 *
 *   node scripts/check-bundle.mjs [--budget-kb 170]
 */
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { gzipSync } from 'node:zlib'

const args = process.argv.slice(2)
const budgetKb = Number(args.includes('--budget-kb') ? args[args.indexOf('--budget-kb') + 1] : 170)
const dist = 'dist'

const html = readFileSync(join(dist, 'index.html'), 'utf8')
const initial = new Set(
  [...html.matchAll(/<(?:script[^>]+src|link[^>]+rel="modulepreload"[^>]+href)="\/?([^"]+\.js)"/g)].map((m) => m[1]),
)
if (initial.size === 0) throw new Error('No entry script found in dist/index.html — run `vite build` first')

let total = 0
const rows = []
for (const file of initial) {
  const gz = gzipSync(readFileSync(join(dist, file)), { level: 9 }).length
  total += gz
  rows.push(`${(gz / 1024).toFixed(1).padStart(7)} KB  ${file}`)
}
const lazy = readdirSync(join(dist, 'assets')).filter((f) => f.endsWith('.js') && !initial.has(`assets/${f}`))

console.log('Initial JavaScript (gzip):\n' + rows.join('\n'))
console.log(`${(total / 1024).toFixed(1).padStart(7)} KB  total · budget ${budgetKb} KB · ${lazy.length} lazy chunk(s)`)
if (total > budgetKb * 1024) {
  console.error(`✗ Over budget by ${((total - budgetKb * 1024) / 1024).toFixed(1)} KB. Split routes with React.lazy or trim dependencies.`)
  process.exit(1)
}
console.log('✓ Within budget.')
