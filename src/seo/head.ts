/**
 * <head> tags of a public page, written by the build into its HTML file
 * (vite-prerender.ts): description, canonical, Open Graph / Twitter Card
 * (the link preview on WhatsApp and social networks) and JSON-LD.
 * Without the site address (VITE_SITE_URL) the tags that need an absolute
 * URL (canonical, og:url, og:image) are left out.
 */
import { FAQ } from '../pages/landing/faq'
import { PUBLIC_PAGES, SITE_NAME, type PublicPage } from './site'

/** Link preview image (public/og-image.jpg, made by scripts/og-image.mjs). */
export const OG_IMAGE = { path: '/og-image.jpg', width: 1200, height: 630, alt: 'Pague os 50 centavos: controle de quem te deve' }

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
/** JSON inside <script>: "</" must not close the tag. */
const json = (data: unknown) => JSON.stringify(data).replace(/</g, '\\u003c')

export function jsonLd(page: PublicPage, site: string): object[] {
  if (page.path !== PUBLIC_PAGES.landing.path) return []
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: SITE_NAME,
      description: page.description,
      applicationCategory: 'FinanceApplication',
      operatingSystem: 'Web, Android, iOS',
      inLanguage: 'pt-BR',
      ...(site ? { url: `${site}/` } : {}),
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'BRL' },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: FAQ.map(({ q, a }) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
    },
  ]
}

/** Tags to put in <head> (the <title> is replaced separately). */
export function headTags(page: PublicPage, site: string): string {
  const url = site ? `${site}${page.path}` : ''
  const image = site ? `${site}${OG_IMAGE.path}` : ''
  const tags = [
    `<meta name="description" content="${esc(page.description)}" />`,
    url && `<link rel="canonical" href="${esc(url)}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="${SITE_NAME}" />`,
    `<meta property="og:locale" content="pt_BR" />`,
    `<meta property="og:title" content="${esc(page.title)}" />`,
    `<meta property="og:description" content="${esc(page.description)}" />`,
    url && `<meta property="og:url" content="${esc(url)}" />`,
    image && `<meta property="og:image" content="${esc(image)}" />`,
    image && `<meta property="og:image:type" content="image/jpeg" />`,
    image && `<meta property="og:image:width" content="${OG_IMAGE.width}" />`,
    image && `<meta property="og:image:height" content="${OG_IMAGE.height}" />`,
    image && `<meta property="og:image:alt" content="${esc(OG_IMAGE.alt)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${esc(page.title)}" />`,
    `<meta name="twitter:description" content="${esc(page.description)}" />`,
    image && `<meta name="twitter:image" content="${esc(image)}" />`,
    ...jsonLd(page, site).map((d) => `<script type="application/ld+json">${json(d)}</script>`),
  ]
  return tags.filter(Boolean).join('\n    ')
}

/** robots.txt: public pages open, app screens blocked, the sitemap. */
export function robotsTxt(disallow: string[], site: string): string {
  return ['User-agent: *', 'Allow: /', ...disallow.map((p) => `Disallow: ${p}`), ...(site ? ['', `Sitemap: ${site}/sitemap.xml`] : []), ''].join('\n')
}

/** sitemap.xml with the public pages only. */
export function sitemapXml(pages: PublicPage[], site: string, lastmod: string): string {
  const urls = pages.map((p) => `  <url><loc>${esc(site + p.path)}</loc><lastmod>${lastmod}</lastmod></url>`)
  return ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">', ...urls, '</urlset>', ''].join('\n')
}
