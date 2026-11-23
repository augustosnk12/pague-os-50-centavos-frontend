#!/usr/bin/env node
/**
 * Link preview image (issue #7): public/og-image.jpg, 1200×630, shown by
 * WhatsApp, Google and social networks (og:image in src/seo/head.ts).
 * Drawn from HTML with the app icon and the Manrope font, with Playwright.
 * Run again after changing the text or the brand:
 *
 *   node scripts/og-image.mjs
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'

const root = fileURLToPath(new URL('..', import.meta.url))
const icon = readFileSync(`${root}src/assets/svg/icon.svg`, 'utf8')
const font = readFileSync(`${root}node_modules/@fontsource-variable/manrope/files/manrope-latin-wght-normal.woff2`).toString('base64')

const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><style>
@font-face { font-family: Manrope; src: url(data:font/woff2;base64,${font}) format('woff2'); font-weight: 200 800; }
* { box-sizing: border-box; margin: 0; }
body { width: 1200px; height: 630px; font-family: Manrope, sans-serif; color: #fff; overflow: hidden;
  background: radial-gradient(circle at 88% 12%, #9c5cf0 0, transparent 42%), linear-gradient(135deg, #7a35dc 0%, #4b1296 100%); }
.wrap { position: absolute; inset: 0; padding: 72px 80px; display: flex; flex-direction: column; justify-content: space-between; }
.brand { display: flex; align-items: center; gap: 20px; font-size: 34px; font-weight: 800; letter-spacing: -0.02em; }
.brand svg { width: 76px; height: 76px; border-radius: 20px; box-shadow: 0 10px 30px #0004; }
h1 { font-size: 76px; line-height: 1.02; font-weight: 800; letter-spacing: -0.035em; max-width: 900px; }
h1 span { color: #e6d6ff; font-weight: 700; }
.tags { display: flex; gap: 14px; }
.tags b { font-size: 24px; font-weight: 700; padding: 10px 20px; border-radius: 999px; background: #ffffff22; border: 1px solid #ffffff40; }
.coin { position: absolute; right: -90px; top: 150px; width: 340px; height: 340px; opacity: 0.95; transform: rotate(-14deg); }
</style></head><body>
<svg class="coin" viewBox="0 0 512 512"><circle cx="256" cy="256" r="250" fill="#8B45E8"/><circle cx="256" cy="256" r="228" fill="#F7F1FD"/>
<circle cx="256" cy="256" r="196" fill="none" stroke="#7A33DB" stroke-opacity="0.35" stroke-width="9" stroke-dasharray="2 16" stroke-linecap="round"/>
<text x="258" y="250" text-anchor="middle" dominant-baseline="central" font-family="Manrope" font-weight="800" font-size="200" letter-spacing="-8" fill="#6A22CC">50</text>
<text x="256" y="375" text-anchor="middle" font-family="Manrope" font-weight="800" font-size="44" letter-spacing="6" fill="#7A33DB">CENTAVOS</text></svg>
<div class="wrap">
  <div class="brand">${icon.replace(/<svg /, '<svg aria-hidden="true" ')}Pague os 50 centavos</div>
  <h1><span>Emprestou?</span> Anota.<br><span>Venceu?</span> Cobra.</h1>
  <div class="tags"><b>Dívidas e parcelas</b><b>Cobrança no WhatsApp</b><b>Grátis e sem anúncios</b></div>
</div>
</body></html>`

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } })
await page.setContent(html)
await page.evaluate(() => document.fonts.ready)
await page.screenshot({ path: `${root}public/og-image.jpg`, type: 'jpeg', quality: 88 })
await browser.close()
console.log('✓ public/og-image.jpg')
