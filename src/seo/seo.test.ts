import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { APP_ROUTES, PUBLIC_PAGES, ROBOTS_DISALLOW, isAppRoute } from './site'
import { headTags, robotsTxt, sitemapXml } from './head'

const vercel = JSON.parse(readFileSync('vercel.json', 'utf8')) as {
  rewrites: { source: string; destination: string }[]
  headers: { source: string; headers: { key: string; value: string }[] }[]
}
const router = readFileSync('src/router/index.tsx', 'utf8')

describe('SEO (issue #7)', () => {
  it('every app route in the router is in APP_ROUTES, and vercel.json serves it app.html with noindex', () => {
    const inRouter = [...router.matchAll(/<Route path="(\/[^"]+)"/g)].map((m) => m[1]).filter((p) => p !== '/')
    expect(inRouter.sort()).toEqual([...APP_ROUTES].sort())
    const toApp = vercel.rewrites.filter((r) => r.destination === '/app.html').map((r) => r.source)
    expect(toApp.sort()).toEqual([...APP_ROUTES].sort())
    const noindex = vercel.headers.find((h) => h.headers.some((x) => x.key === 'X-Robots-Tag' && x.value === 'noindex'))!
    const re = new RegExp(`^${noindex.source}$`)
    for (const r of APP_ROUTES) expect(re.test(r.replace(':id', 'abc'))).toBe(true)
    for (const p of Object.values(PUBLIC_PAGES)) expect(re.test(p.path)).toBe(false)
  })

  it('no catch-all rewrite: unknown addresses get 404.html with status 404', () => {
    expect(vercel.rewrites.some((r) => /\(\.\*\)|:path\*/.test(r.source))).toBe(false)
    expect(vercel.rewrites).toContainEqual({ source: PUBLIC_PAGES.calculator.path, destination: `/${PUBLIC_PAGES.calculator.file}` })
  })

  it('isAppRoute matches app screens only', () => {
    expect(isAppRoute('/debtors/abc')).toBe(true)
    expect(isAppRoute('/dashboard')).toBe(true)
    expect(isAppRoute('/calculadora-de-parcelas')).toBe(false)
    expect(isAppRoute('/nao-existe')).toBe(false)
  })

  it('landing head: description, canonical, Open Graph image and JSON-LD (SoftwareApplication + FAQPage)', () => {
    const html = headTags(PUBLIC_PAGES.landing, 'https://exemplo.com.br')
    expect(html).toContain('<link rel="canonical" href="https://exemplo.com.br/" />')
    expect(html).toContain('<meta property="og:image" content="https://exemplo.com.br/og-image.jpg" />')
    expect(html).toContain('<meta name="twitter:card" content="summary_large_image" />')
    const ld = [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)].map((m) => JSON.parse(m[1]))
    expect(ld.map((d) => d['@type'])).toEqual(['SoftwareApplication', 'FAQPage'])
    expect(ld[0].offers.price).toBe('0')
    expect(ld[1].mainEntity.length).toBeGreaterThan(3)
  })

  it('without the site address, no tags with relative URLs', () => {
    const html = headTags(PUBLIC_PAGES.calculator, '')
    expect(html).not.toContain('canonical')
    expect(html).not.toContain('og:image')
    expect(html).not.toContain('ld+json')
  })

  it('robots.txt blocks the app and points to the sitemap, which lists only public pages', () => {
    const robots = robotsTxt(ROBOTS_DISALLOW, 'https://exemplo.com.br')
    expect(robots).toContain('Disallow: /dashboard')
    expect(robots).toContain('Disallow: /auth')
    expect(robots).toContain('Sitemap: https://exemplo.com.br/sitemap.xml')
    const xml = sitemapXml([PUBLIC_PAGES.landing, PUBLIC_PAGES.calculator], 'https://exemplo.com.br', '2026-11-22')
    expect([...xml.matchAll(/<loc>([^<]+)/g)].map((m) => m[1])).toEqual(['https://exemplo.com.br/', 'https://exemplo.com.br/calculadora-de-parcelas'])
  })
})
