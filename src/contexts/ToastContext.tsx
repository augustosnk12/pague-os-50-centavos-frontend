import { createContext, useContext, useState, type ReactNode } from 'react'
import { Toast, type ToastData } from '../components/ui/Toast'

interface ToastContextValue {
  showToast: (msg: string, opts?: Partial<Omit<ToastData, 'msg'>>) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastData | null>(null)

  const showToast = (msg: string, opts?: Partial<Omit<ToastData, 'msg'>>) => {
    setToast({ msg, ...opts })
    setTimeout(() => setToast(null), 2200)
  }

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <Toast toast={toast} />
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside ToastProvider')
  return ctx
}
