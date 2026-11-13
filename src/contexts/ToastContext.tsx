import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Toast, type ToastData } from '../components/ui/Toast'
import { TOAST_MS, TOAST_WITH_ACTION_MS, TOAST_LEAVE_MS as LEAVE_MS } from '../lib/timing'

interface ToastContextValue {
  showToast: (msg: string, opts?: Partial<Omit<ToastData, 'msg'>>) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

/**
 * One toast at a time; a new one replaces the current one and restarts the
 * timer. The timer pauses while the pointer or the keyboard focus is on the
 * toast. Messages are announced through ONE persistent live region kept
 * outside the app content (and exempt from dialogs' inert background), so
 * screen readers hear them even when a sheet is open.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<(ToastData & { id: number }) | null>(null)
  const [leaving, setLeaving] = useState(false)
  const [announcement, setAnnouncement] = useState('')
  const [region] = useState(() => {
    if (typeof document === 'undefined') return null
    const el = document.createElement('div')
    el.setAttribute('data-modal-keep', '')
    return el
  })
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const remaining = useRef(0)
  const startedAt = useRef(0)
  const seq = useRef(0)

  useEffect(() => {
    if (!region) return
    document.body.appendChild(region)
    return () => region.remove()
  }, [region])

  const clear = () => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
  }

  const dismiss = useCallback(() => {
    clear()
    setLeaving(true)
    timer.current = setTimeout(() => {
      setToast(null)
      setLeaving(false)
    }, LEAVE_MS)
  }, [])

  const run = useCallback((ms: number) => {
    clear()
    remaining.current = ms
    startedAt.current = Date.now()
    timer.current = setTimeout(dismiss, ms)
  }, [dismiss])

  const showToast = useCallback((msg: string, opts?: Partial<Omit<ToastData, 'msg'>>) => {
    const id = ++seq.current
    setLeaving(false)
    setToast({ msg, ...opts, id })
    // Re-set the text so the same message is announced again.
    setAnnouncement('')
    const labels = [opts?.action?.label, opts?.secondary?.label].filter(Boolean)
    const spoken = labels.length > 1 ? `${msg}. ${labels.join(' e ')} disponíveis.` : labels.length ? `${msg}. ${labels[0]} disponível.` : msg
    setTimeout(() => setAnnouncement(spoken), 50)
    run(labels.length ? TOAST_WITH_ACTION_MS : TOAST_MS)
  }, [run])

  const onPause = (paused: boolean) => {
    if (leaving) return
    if (paused) {
      if (!timer.current) return
      clear()
      remaining.current -= Date.now() - startedAt.current
    } else if (!timer.current && toast) {
      run(Math.max(remaining.current, 1500))
    }
  }

  useEffect(() => clear, [])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {region &&
        createPortal(
          <>
            <div role="status" aria-live="polite" aria-atomic="true" className="lt-sr-only">
              {announcement}
            </div>
            <Toast
              toast={toast}
              leaving={leaving}
              onPause={onPause}
              onAction={(which) => {
                toast?.[which]?.onClick()
                dismiss()
              }}
            />
          </>,
          region,
        )}
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside ToastProvider')
  return ctx
}
