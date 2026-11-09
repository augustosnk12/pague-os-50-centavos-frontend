import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

/** Improvement 32: "Detalhada" (default) or "Enxuta" (hides a closed list of supporting items). */
export type DetailLevel = 'full' | 'lean'
/** Improvement 50: Normal / Grande / Gigante = 100% / 115% / 130% (html[data-fz] → --fz). */
export type TextSize = 'm' | 'l' | 'xl'

interface Preferences {
  detail: DetailLevel
  textSize: TextSize
}

interface PreferencesValue extends Preferences {
  setDetail: (d: DetailLevel) => void
  setTextSize: (s: TextSize) => void
}

const KEY = 'pague50_prefs'
const DEFAULTS: Preferences = { detail: 'full', textSize: 'm' }

/** Per device (like the theme), by decision in the plan; robust to bad storage. */
function load(): Preferences {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<Preferences>
    return {
      detail: raw.detail === 'lean' ? 'lean' : 'full',
      textSize: raw.textSize === 'l' || raw.textSize === 'xl' ? raw.textSize : 'm',
    }
  } catch {
    return DEFAULTS
  }
}

const PreferencesContext = createContext<PreferencesValue | null>(null)

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<Preferences>(load)

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(prefs))
    } catch {
      // storage unavailable: keep for this session only
    }
    const html = document.documentElement
    if (prefs.textSize === 'm') html.removeAttribute('data-fz')
    else html.setAttribute('data-fz', prefs.textSize)
  }, [prefs])

  return (
    <PreferencesContext.Provider
      value={{
        ...prefs,
        setDetail: (detail) => setPrefs((p) => ({ ...p, detail })),
        setTextSize: (textSize) => setPrefs((p) => ({ ...p, textSize })),
      }}
    >
      {children}
    </PreferencesContext.Provider>
  )
}

export function usePreferences(): PreferencesValue {
  const ctx = useContext(PreferencesContext)
  if (!ctx) throw new Error('usePreferences must be used inside PreferencesProvider')
  return ctx
}

/**
 * Wraps the supporting items that "Enxuta" hides (subtitles, explanations,
 * counters…). Amounts owed, overdue, dates and actions must NEVER be wrapped.
 */
export function Detail({ children }: { children: ReactNode }) {
  return usePreferences().detail === 'full' ? <>{children}</> : null
}
