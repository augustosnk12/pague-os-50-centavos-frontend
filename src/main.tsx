import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './lib/queryClient'
import { ThemeProvider } from './contexts/ThemeContext'
import { AuthProvider } from './contexts/AuthContext'
import { ToastProvider } from './contexts/ToastContext'
import { PreferencesProvider } from './contexts/PreferencesContext'
import { AppRouter } from './router'
import { prerenderedPage } from './router/routes'
import { IconSprite } from './components/ui/Icon'
import { UpdatePrompt } from './components/layout/UpdatePrompt'
import './styles/index.css'
import { startVitals } from './lib/vitals'

// Real-use performance (improvement 43): production builds only.
if (import.meta.env.PROD) startVitals(import.meta.env.VITE_API_URL, __APP_VERSION__)

const root = document.getElementById('root')!

function render() {
  createRoot(root).render(
    <StrictMode>
      <IconSprite />
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <PreferencesProvider>
            <AuthProvider>
              <ToastProvider>
                <AppRouter />
                <UpdatePrompt />
              </ToastProvider>
            </AuthProvider>
            </PreferencesProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </BrowserRouter>
    </StrictMode>,
  )
}

// Public pages come as ready HTML (issue #7). Fetch that page's code first,
// so the ready HTML stays on screen until React draws the same page.
const ready = prerenderedPage(root.dataset.page)
if (ready) ready().then(render, render)
else render()

// Opening screen of the installed app (index.html): leaves once the app has
// painted, fading out (never fading in, see CLAUDE.md "Animations").
const splash = document.getElementById('lt-splash')
if (splash) {
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      splash.setAttribute('data-leaving', '')
      setTimeout(() => splash.remove(), 250)
    }),
  )
}
