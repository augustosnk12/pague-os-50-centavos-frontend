import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { PreferencesProvider, usePreferences, Detail } from './PreferencesContext'

let api: ReturnType<typeof usePreferences>
function Probe() {
  api = usePreferences()
  return (
    <div>
      <span>Deve R$ 950</span>
      <Detail><span>3 de 6 pagas</span></Detail>
    </div>
  )
}

describe('preferences (improvements 32 and 50)', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.removeAttribute('data-fz')
  })

  it('defaults: detailed, normal text', () => {
    render(<PreferencesProvider><Probe /></PreferencesProvider>)
    expect(api.detail).toBe('full')
    expect(screen.getByText('3 de 6 pagas')).toBeInTheDocument()
    expect(document.documentElement).not.toHaveAttribute('data-fz')
  })

  it('"Enxuta" hides only <Detail> content; amounts stay', () => {
    render(<PreferencesProvider><Probe /></PreferencesProvider>)
    act(() => api.setDetail('lean'))
    expect(screen.queryByText('3 de 6 pagas')).toBeNull()
    expect(screen.getByText('Deve R$ 950')).toBeInTheDocument()
  })

  it('text size sets html[data-fz] and both choices persist per device', () => {
    const { unmount } = render(<PreferencesProvider><Probe /></PreferencesProvider>)
    act(() => {
      api.setTextSize('xl')
      api.setDetail('lean')
    })
    expect(document.documentElement).toHaveAttribute('data-fz', 'xl')
    unmount()
    render(<PreferencesProvider><Probe /></PreferencesProvider>)
    expect(api.textSize).toBe('xl')
    expect(api.detail).toBe('lean')
  })

  it('ignores corrupted storage', () => {
    localStorage.setItem('pague50_prefs', '{"detail":"hack","textSize":"huge"}')
    render(<PreferencesProvider><Probe /></PreferencesProvider>)
    expect([api.detail, api.textSize]).toEqual(['full', 'm'])
    localStorage.setItem('pague50_prefs', 'nope')
    render(<PreferencesProvider><Probe /></PreferencesProvider>)
  })
})
