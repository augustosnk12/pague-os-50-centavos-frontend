/**
 * Build only (vite-prerender.ts): the public pages as HTML, so search engines
 * and link previews get the content without running JavaScript (issue #7).
 * The browser then renders the same page over it (main.tsx).
 */
import { StrictMode, type ComponentType } from 'react'
import { renderToString } from 'react-dom/server'
import { StaticRouter } from 'react-router-dom'
import { IconSprite } from './components/ui/Icon'
import { ThemeProvider } from './contexts/ThemeContext'
import { LandingPage } from './pages/landing/LandingPage'
import { CalculatorPage } from './pages/landing/CalculatorPage'
import { NotFoundPage } from './pages/landing/NotFoundPage'
import type { PrerenderedPage } from './router/routes'

const PAGES: Record<PrerenderedPage, ComponentType> = {
  landing: LandingPage,
  calculator: CalculatorPage,
  notFound: NotFoundPage,
}

export function render(page: PrerenderedPage, path: string): string {
  const Page = PAGES[page]
  return renderToString(
    <StrictMode>
      <IconSprite />
      <StaticRouter location={path}>
        <ThemeProvider>
          <Page />
        </ThemeProvider>
      </StaticRouter>
    </StrictMode>,
  )
}
