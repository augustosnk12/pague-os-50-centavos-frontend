/**
 * SEO (issue #7): the public pages, their titles and descriptions, and the
 * app routes that must stay out of search engines.
 *
 * Used by the build (vite-prerender.ts writes each public page as ready HTML
 * with these tags, plus robots.txt and sitemap.xml) and by the app
 * (usePageMeta keeps the title in sync while navigating). vercel.json has the
 * same route lists (checked by seo.test.ts).
 */

export const SITE_NAME = 'Pague os 50 centavos'

/** Title and description of the app screens (behind the login, not indexed). */
export const APP_META = {
  title: SITE_NAME,
  description: 'Controle de quem te deve: devedores, cobranças e parcelas.',
}

export interface PublicPage {
  /** Route (also the canonical path). */
  path: string
  /** HTML file the build writes for it (dist/<file>). */
  file: string
  title: string
  description: string
}

export const PUBLIC_PAGES = {
  landing: {
    path: '/',
    file: 'index.html',
    title: 'Controle de dívidas e parcelas: cobre quem te deve pelo WhatsApp | Pague os 50 centavos',
    description:
      'Anote o que você emprestou, divida em parcelas e cobre quem te deve pelo WhatsApp, com Pix copia e cola e recibo. Controle de empréstimo para amigos e família, grátis e sem anúncios.',
  },
  calculator: {
    path: '/calculadora-de-parcelas',
    file: 'calculadora-de-parcelas.html',
    title: 'Calculadora de parcelas grátis: valor, juros e datas de cada parcela | Pague os 50 centavos',
    description:
      'Simule um parcelamento sem cadastro: informe o valor, o número de parcelas, os juros (se tiver) e a primeira data. Veja quanto fica cada parcela e quando vence.',
  },
} satisfies Record<string, PublicPage>

/**
 * App routes (React Router paths). Served by app.html (no ready content),
 * answered with X-Robots-Tag: noindex. Anything else is a 404.
 */
export const APP_ROUTES = [
  '/login',
  '/register',
  '/auth/verify',
  '/auth/callback',
  '/dashboard',
  '/debtors',
  '/debtors/:id',
  '/debts/new',
  '/installments',
  '/settings',
  '/payments',
  '/admin',
]

/** True when `path` is one of the app routes (":id" matches one segment). */
export function isAppRoute(path: string): boolean {
  return APP_ROUTES.some((r) => new RegExp(`^${r.replace(/:[^/]+/g, '[^/]+')}/?$`).test(path))
}

/** Path prefixes blocked in robots.txt (private screens and sign-in links). */
export const ROBOTS_DISALLOW = ['/dashboard', '/debtors', '/debts', '/installments', '/settings', '/payments', '/admin', '/auth']

/** Public site address without the trailing slash, e.g. https://example.com ('' when not set). */
export const siteUrl = (raw: string | undefined) => (raw ?? '').trim().replace(/\/+$/, '')
