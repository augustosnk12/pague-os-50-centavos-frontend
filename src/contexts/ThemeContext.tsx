import { createContext, useContext, useEffect, useSyncExternalStore, type ReactNode } from 'react'
import { THEME_COLOR } from '../styles/colors'

type Theme = 'light' | 'dark'

interface ThemeContextValue {
  theme: Theme
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)
const KEY = 'lt-theme'

// The saved theme as a small store. The public pages are hydrated over HTML
// made at build time (vite-prerender.ts), which has the light theme: React
// starts from that (server snapshot) and then switches to the saved one.
// The page colors never wait for React: index.html sets data-theme before
// the first paint.
const listeners = new Set<() => void>()
/** Only when storage is blocked: the theme chosen in this visit. */
let unsaved: Theme = 'light'

function saved(): Theme {
  try {
    return localStorage.getItem(KEY) === 'dark' ? 'dark' : 'light'
  } catch {
    return unsaved
  }
}

function apply(theme: Theme) {
  document.documentElement.setAttribute('data-theme', theme)
  // Status bar of the installed app / mobile browser follows the app theme.
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR[theme])
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useSyncExternalStore(subscribe, saved, () => 'light' as const)

  // The saved value, not `theme`: while hydrating, `theme` is still the build's.
  useEffect(() => apply(saved()), [])

  const toggleTheme = () => {
    const next: Theme = saved() === 'dark' ? 'light' : 'dark'
    try {
      localStorage.setItem(KEY, next)
    } catch {
      unsaved = next // storage blocked: for this visit only
    }
    apply(next)
    listeners.forEach((l) => l())
  }

  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider')
  return ctx
}
