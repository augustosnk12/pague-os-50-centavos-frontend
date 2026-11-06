import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from '../contexts/ThemeContext'
import { AuthProvider } from '../contexts/AuthContext'
import { ToastProvider } from '../contexts/ToastContext'
import { AppRouter } from '../router'
import { setLenderInStorage, setToken } from '../lib/cookies'

export const testLender = { id: 'lender-1', email: 'augusto@email.com', name: 'Augusto Silva' }

/** Renders the whole app (same providers as main.tsx) at `route`. */
export function renderApp(route: string, { loggedIn = true } = {}) {
  if (loggedIn) {
    setToken('test-token')
    setLenderInStorage(testLender)
  }
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } },
  })
  return render(
    <MemoryRouter initialEntries={[route]}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AuthProvider>
            <ToastProvider>
              <AppRouter />
            </ToastProvider>
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </MemoryRouter>,
  )
}
