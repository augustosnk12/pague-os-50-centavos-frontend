import { useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { UpdateCard } from './UpdateCard'

/** Checks for a new version every hour while the app stays open. */
const CHECK_EVERY_MS = 60 * 60 * 1000

/**
 * "Nova versão disponível · Atualizar" (issue #5). The new service worker
 * waits until the user taps Atualizar — the app is never swapped in the
 * middle of a payment. "Depois" hides it; it comes back on the next visit.
 */
export function UpdatePrompt() {
  const [updating, setUpdating] = useState(false)
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
    <UpdateCard
      updating={updating}
      onUpdate={() => {
        setUpdating(true)
        // Activates the waiting worker and reloads the page.
        void updateServiceWorker(true).catch(() => setUpdating(false))
      }}
      onLater={() => setNeedRefresh(false)}
    />
  )
}
