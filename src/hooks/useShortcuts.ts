import { useEffect, useRef } from 'react'

interface Shortcuts {
  onSearch: () => void
  onRegister: () => void
  onNewDebt: () => void
}

const typing = (t: EventTarget | null) =>
  t instanceof HTMLElement && (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName))

/**
 * Desktop shortcuts (improvement 28):
 * - Alt+N new debt, Alt+R register a payment — by physical key (e.code), so
 *   they also work with Option on a Mac, and even inside fields;
 * - Ctrl/⌘ K and "/" search ("/" only when not typing).
 * Plain letters stay free (jump to a letter in Devedores). Nothing fires
 * while a dialog is open.
 */
export function useShortcuts(handlers: Shortcuts) {
  const ref = useRef(handlers)
  ref.current = handlers

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || document.querySelector('[aria-modal="true"]')) return
      const h = ref.current
      if (e.altKey && !e.ctrlKey && !e.metaKey && (e.code === 'KeyN' || e.code === 'KeyR')) {
        e.preventDefault()
        if (e.code === 'KeyN') h.onNewDebt()
        else h.onRegister()
        return
      }
      if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        h.onSearch()
        return
      }
      if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey && !typing(e.target)) {
        e.preventDefault()
        h.onSearch()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}
