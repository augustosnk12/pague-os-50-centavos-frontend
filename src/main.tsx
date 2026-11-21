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
import { IconSprite } from './components/ui/Icon'
import { UpdatePrompt } from './components/layout/UpdatePrompt'
import './styles/index.css'
import { startVitals } from './lib/vitals'

// Real-use performance (improvement 43): production builds only.
if (import.meta.env.PROD) startVitals(import.meta.env.VITE_API_URL, __APP_VERSION__)

createRoot(document.getElementById('root')!).render(
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
