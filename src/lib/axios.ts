import axios, { AxiosError } from 'axios'
import { getLenderFromStorage, getToken, removeToken } from './cookies'
import { notifySessionExpired, SESSION_SAVE_ERROR } from './session'
import { rememberReturnPath } from './returnPath'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
})

import { NETWORK_SAVE_ERROR, OFFLINE_SAVE_ERROR } from './saveMessages'

export { NETWORK_SAVE_ERROR, OFFLINE_SAVE_ERROR }

/** Rejects like an API error, so every onError (getApiError) shows the message. */
function asApiError(config: AxiosError['config'], message: string): AxiosError {
  const err = new AxiosError(message, 'ERR_NETWORK', config)
  err.response = { data: { error: message }, status: 0, statusText: '', headers: {}, config: config! }
  return err
}

const isChange = (method?: string) => !!method && method.toLowerCase() !== 'get'

api.interceptors.request.use((config) => {
  // Offline: block changes before they are sent ("nada foi salvo"); reads may
  // still be served from the cache.
  if (isChange(config.method) && typeof navigator !== 'undefined' && navigator.onLine === false) {
    return Promise.reject(asApiError(config, OFFLINE_SAVE_ERROR))
  }
  const token = getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

let redirecting = false

api.interceptors.response.use(
  (res) => res,
  (error: AxiosError) => {
    const isAuthCall = (error.config?.url ?? '').startsWith('/auth/')
    // Session expired while using the app: a sheet logs in again on this screen (improvement 47).
    if (error.response?.status === 401 && !isAuthCall && getLenderFromStorage()?.email && notifySessionExpired()) {
      return Promise.reject(isChange(error.config?.method) ? asApiError(error.config, SESSION_SAVE_ERROR) : error)
    }
    if (error.response?.status === 401 && !isAuthCall && !redirecting) {
      // No known account (opened on a new device): log in again, then come back to this screen.
      redirecting = true
      rememberReturnPath(window.location.pathname + window.location.search)
      removeToken()
      window.location.href = '/login?expired=1'
    }
    if (!error.response && isChange(error.config?.method)) {
      return Promise.reject(asApiError(error.config, NETWORK_SAVE_ERROR))
    }
    return Promise.reject(error)
  },
)
