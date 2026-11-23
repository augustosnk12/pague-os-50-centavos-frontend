import { StrictMode, type ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './lib/queryClient'
import { ThemeProvider } from './contexts/ThemeContext'
import { AuthProvider } from './contexts/AuthContext'
import { ToastProvider } from './contexts/ToastContext'
import { PreferencesProvider } from './contexts/PreferencesContext'
import { AppRouter } from './router'
import { IconSprite } from './components/ui/Icon'

/**
 * The whole app. main.tsx renders it in the browser and src/prerender.tsx at
 * build time, so the ready HTML of the public pages is exactly what React
 * draws and can be hydrated (kept on screen, not redrawn). Keep the two trees
 * the same: anything only the browser renders goes in `browserOnly` (its slot
 * is there in both, empty at build time).
 */
export function App({ router, browserOnly }: { router: (app: ReactNode) => ReactNode; browserOnly?: ReactNode }) {
  return (
    <StrictMode>
      <IconSprite />
      {router(
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <PreferencesProvider>
              <AuthProvider>
                <ToastProvider>
                  <AppRouter />
                  {browserOnly}
                </ToastProvider>
              </AuthProvider>
            </PreferencesProvider>
          </ThemeProvider>
        </QueryClientProvider>,
      )}
    </StrictMode>
  )
}
