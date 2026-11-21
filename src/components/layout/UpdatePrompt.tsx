import { useRegisterSW } from 'virtual:pwa-register/react'

/** Checks for a new version every hour while the app stays open. */
const CHECK_EVERY_MS = 60 * 60 * 1000

/**
 * "Nova versão disponível · Atualizar" (issue #5). The new service worker
 * waits until the user taps Atualizar — the app is never swapped in the
 * middle of a payment. "Depois" hides it; it comes back on the next visit.
 */
export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, reg) {
      if (reg) setInterval(() => void reg.update().catch(() => {}), CHECK_EVERY_MS)
    },
  })

  if (!needRefresh) return null
  return (
    <div
      role="status"
      style={{
        position: 'fixed',
        top: 'calc(10px + env(safe-area-inset-top))',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 300,
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        maxWidth: 'calc(100vw - 24px)',
        padding: '6px 6px 6px 16px',
        borderRadius: 999,
        background: 'var(--text)',
        color: 'var(--bg)',
        boxShadow: '0 8px 24px rgb(0 0 0 / 0.18)',
        fontSize: '0.875rem',
        fontWeight: 700,
      }}
    >
      <span>Nova versão disponível</span>
      <button
        type="button"
        onClick={() => void updateServiceWorker(true)}
        style={{
          border: 0,
          borderRadius: 999,
          padding: '8px 14px',
          minHeight: 36,
          background: 'var(--primary)',
          color: '#fff',
          font: 'inherit',
          cursor: 'pointer',
        }}
      >
        Atualizar
      </button>
      <button
        type="button"
        onClick={() => setNeedRefresh(false)}
        style={{
          border: 0,
          borderRadius: 999,
          padding: '8px 10px',
          minHeight: 36,
          background: 'transparent',
          color: 'inherit',
          font: 'inherit',
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        Depois
      </button>
    </div>
  )
}
