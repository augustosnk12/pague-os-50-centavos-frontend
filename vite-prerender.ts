/**
 * Public pages as ready HTML (issue #7: SEO and link previews).
 *
 * After the client build, the public pages are rendered to HTML (src/prerender.tsx,
 * loaded through a throwaway Vite SSR server) and written next to the app:
 *
 *   index.html                    landing ("/"), with its <head> tags and JSON-LD
 *   calculadora-de-parcelas.html  the public calculator
 *   404.html                      "Página não encontrada" (served with status 404)
 *   app.html                      empty shell for the app screens (noindex)
 *   robots.txt, sitemap.xml
 *
 * Each page also links its own CSS and preloads its code, so the HTML looks
 * right before the JavaScript runs. Runs in generateBundle, so the service
 * worker (written later) precaches the final files.
 *
 * vercel.json routes the addresses to these files; previewRoutes() does the
 * same for `vite preview`.
 */
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createServer, type Plugin, type PreviewServer, type ResolvedConfig } from 'vite'
import type { OutputAsset, OutputBundle, OutputChunk } from 'rollup'
import { headTags, robotsTxt, sitemapXml } from './src/seo/head'
import { APP_META, PUBLIC_PAGES, ROBOTS_DISALLOW, SITE_NAME, isAppRoute, siteUrl, type PublicPage } from './src/seo/site'

type PageName = 'landing' | 'calculator' | 'notFound'

interface Output {
  name: PageName
  file: string
  /** Source of the page component (its chunk has the page's CSS). */
  source: string
  page: PublicPage
  /** Extra tags for <head>. */
  head?: string
  /** Runs first thing in <head>. */
  top?: string
}

const NOINDEX = '<meta name="robots" content="noindex" />'
// Signed-in people go straight to the Painel, before the landing is painted.
const SIGNED_IN_REDIRECT = `<script>if (/(?:^|;\\s*)pague50_token=/.test(document.cookie)) location.replace('/dashboard')</script>`

const OUTPUTS: Output[] = [
  { name: 'landing', file: PUBLIC_PAGES.landing.file, source: 'src/pages/landing/LandingPage.tsx', page: PUBLIC_PAGES.landing, top: SIGNED_IN_REDIRECT },
  { name: 'calculator', file: PUBLIC_PAGES.calculator.file, source: 'src/pages/landing/CalculatorPage.tsx', page: PUBLIC_PAGES.calculator },
  {
    name: 'notFound',
    file: '404.html',
    source: 'src/pages/landing/NotFoundPage.tsx',
    page: { path: '/404', file: '404.html', title: `Página não encontrada | ${SITE_NAME}`, description: 'Este endereço não existe.' },
    head: NOINDEX,
  },
]

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

function replaceOnce(html: string, find: RegExp | string, by: string, what: string): string {
  if (!(typeof find === 'string' ? html.includes(find) : find.test(html))) throw new Error(`vite-prerender: ${what} not found in index.html`)
  return html.replace(find, () => by)
}

/** The page chunk's CSS and the JS chunks it needs (static imports), from the bundle. */
function pageAssets(bundle: OutputBundle, source: string): { css: string[]; js: string[] } {
  const chunks = Object.values(bundle).filter((c): c is OutputChunk => c.type === 'chunk')
  const start = chunks.find((c) => c.facadeModuleId?.replace(/\\/g, '/').endsWith(source))
  if (!start) throw new Error(`vite-prerender: no chunk for ${source}`)
  const css = new Set<string>()
  const js = new Set<string>()
  const visit = (c: OutputChunk) => {
    if (js.has(c.fileName) || c.isEntry) return
    js.add(c.fileName)
    c.viteMetadata?.importedCss.forEach((f) => css.add(f))
    c.imports.forEach((f) => {
      const next = bundle[f]
      if (next?.type === 'chunk') visit(next)
    })
  }
  visit(start)
  return { css: [...css], js: [...js] }
}

export function prerender(): Plugin {
  let config: ResolvedConfig
  return {
    name: 'prerender-public-pages',
    apply: 'build',
    enforce: 'post',
    configResolved(c) {
      config = c
    },
    async generateBundle(_options, bundle) {
      if (config.build.ssr) return
      const index = bundle['index.html'] as OutputAsset | undefined
      if (!index) throw new Error('vite-prerender: index.html is not in the build')
      const template = String(index.source)
      const site = siteUrl(config.env.VITE_SITE_URL)
      if (!site) config.logger.warn('\nvite-prerender: VITE_SITE_URL is not set — no canonical, og:url, og:image or sitemap.xml.')

      const server = await createServer({
        configFile: false,
        root: config.root,
        mode: config.mode,
        logLevel: 'error',
        define: config.define,
        appType: 'custom',
        server: { middlewareMode: true, hmr: false, ws: false },
        optimizeDeps: { noDiscovery: true, include: [] },
        // React Router is bundled by Vite from its ESM build ("module-sync"
        // export condition), not loaded by Node: left to Node, Vite reads its
        // CommonJS build and, on Node ≥ 22, `import { StaticRouter }` fails.
        ssr: { noExternal: ['react-router-dom', 'react-router'], resolve: { conditions: ['module-sync', 'module', 'node'] } },
      })
      try {
        const { render } = (await server.ssrLoadModule('/src/prerender.tsx')) as { render: (page: PageName, path: string) => Promise<string> }

        const withHead = (title: string, head: string, top = '') => {
          let html = top ? replaceOnce(template, '<head>', `<head>\n    ${top}`, '<head>') : template
          html = replaceOnce(html, /<title>[^<]*<\/title>/, `<title>${esc(title)}</title>`, '<title>')
          html = replaceOnce(html, /\s*<meta name="description"[^>]*>/, '', 'meta description')
          return replaceOnce(html, '</head>', `    ${head}\n  </head>`, '</head>')
        }

        for (const out of OUTPUTS) {
          const { css, js } = pageAssets(bundle, out.source)
          const links = [
            ...css.map((f) => `<link rel="stylesheet" crossorigin href="/${f}">`),
            ...js.map((f) => `<link rel="modulepreload" crossorigin href="/${f}">`),
          ]
          const tags = out.name === 'notFound' ? `<meta name="description" content="${esc(out.page.description)}" />` : headTags(out.page, site)
          let html = withHead(out.page.title, [out.head, tags, ...links].filter(Boolean).join('\n    '))
          html = replaceOnce(html, '<div id="root"></div>', `<div id="root" data-page="${out.name}">${await render(out.name, out.page.path)}</div>`, '<div id="root">')
          if (out.file === 'index.html') index.source = html
          else this.emitFile({ type: 'asset', fileName: out.file, source: html })
        }

        // The app screens: the same shell as before, kept out of search engines.
        this.emitFile({ type: 'asset', fileName: 'app.html', source: withHead(APP_META.title, `${NOINDEX}\n    <meta name="description" content="${esc(APP_META.description)}" />`) })
        this.emitFile({ type: 'asset', fileName: 'robots.txt', source: robotsTxt(ROBOTS_DISALLOW, site) })
        if (site) {
          const pages = [PUBLIC_PAGES.landing, PUBLIC_PAGES.calculator]
          this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: sitemapXml(pages, site, new Date().toISOString().slice(0, 10)) })
        }
      } finally {
        await server.close()
      }
    },
  }
}

/** `vite preview` answers like vercel.json: app screens → app.html, unknown → 404.html with 404. */
export function previewRoutes(): Plugin {
  return {
    name: 'preview-public-routes',
    configurePreviewServer(server: PreviewServer) {
      const dist = join(server.config.root, server.config.build.outDir)
      server.middlewares.use((req, res, next) => {
        const path = (req.url ?? '/').split('?')[0]
        if (path === '/' || (path !== '/' && existsSync(join(dist, decodeURIComponent(path))))) return next()
        const query = (req.url ?? '').slice(path.length)
        if (path === PUBLIC_PAGES.calculator.path) {
          req.url = `/${PUBLIC_PAGES.calculator.file}${query}`
          return next()
        }
        if (isAppRoute(path)) {
          res.setHeader('X-Robots-Tag', 'noindex')
          req.url = `/app.html${query}`
          return next()
        }
        res.statusCode = 404
        res.setHeader('Content-Type', 'text/html; charset=utf-8')
        res.end(readFileSync(join(dist, '404.html')))
      })
    },
  }
}
