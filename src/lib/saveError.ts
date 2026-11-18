/**
 * A change that failed (improvement 47): say what was not saved, that nothing
 * was saved, and offer "Tentar de novo" when trying again can work.
 */
import { getApiError } from './api'
import { translateApiError } from './utils'
import { NETWORK_SAVE_ERROR, OFFLINE_SAVE_ERROR, SESSION_SAVE_ERROR } from './saveMessages'
import type { ToastData } from '../components/ui/Toast'

type Show = (msg: string, opts?: Partial<Omit<ToastData, 'msg'>>) => void

/**
 * @param what what was being done, e.g. "registrar R$ 300,00"
 * @param retry runs the same change again
 */
export function failedSave(show: Show, what: string, retry: () => void) {
  return (e: unknown) => {
    const msg = getApiError(e)
    const status = (e as { response?: { status?: number } })?.response?.status ?? 0
    const again = { label: 'Tentar de novo', onClick: retry }
    // No connection / server unreachable / session: already explained; trying again can work.
    if (msg === OFFLINE_SAVE_ERROR || msg === NETWORK_SAVE_ERROR || msg === SESSION_SAVE_ERROR) {
      show(msg === SESSION_SAVE_ERROR ? msg : `Não foi possível ${what} · nada foi salvo`, { icon: 'alert', action: again })
      return
    }
    // The API refused it (4xx with a reason): the reason, and nothing to retry.
    if (msg && status >= 400 && status < 500) {
      show(`${translateApiError(msg, `Não foi possível ${what}.`).replace(/\.$/, '')} · nada foi salvo`, { icon: 'alert' })
      return
    }
    show(`Não foi possível ${what} · nada foi salvo`, { icon: 'alert', action: again })
  }
}
