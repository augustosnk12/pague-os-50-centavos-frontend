/**
 * Build only (vite-prerender.ts): the public pages as HTML, so search engines
 * and link previews get the content without running JavaScript (issue #7).
 * It renders the same <App> as main.tsx, which then hydrates this HTML.
 */
import { renderToString } from 'react-dom/server'
import { StaticRouter } from 'react-router-dom'
import { App } from './App'
import { prerenderedPage, type PrerenderedPage } from './router/routes'

export async function render(page: PrerenderedPage, path: string): Promise<string> {
  // Load the page's code first, as main.tsx does, so it renders right away.
  await prerenderedPage(page)?.()
  return renderToString(<App router={(tree) => <StaticRouter location={path}>{tree}</StaticRouter>} />)
}
