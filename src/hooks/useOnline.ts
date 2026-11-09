import { useEffect, useState } from 'react'

/** Browser connectivity plus the moment the connection was lost (for "dados de 10:32"). */
export function useOnline(): { online: boolean; since: Date | null } {
  const [state, setState] = useState(() => ({
    online: typeof navigator === 'undefined' ? true : navigator.onLine !== false,
    since: null as Date | null,
  }))
  useEffect(() => {
    const up = () => setState({ online: true, since: null })
    const down = () => setState({ online: false, since: new Date() })
    window.addEventListener('online', up)
    window.addEventListener('offline', down)
    return () => {
      window.removeEventListener('online', up)
      window.removeEventListener('offline', down)
    }
  }, [])
  return state
}
