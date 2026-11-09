import axios, { AxiosError } from 'axios'
import { getToken, removeToken } from './cookies'
import { rememberReturnPath } from './returnPath'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
})

/** Shown when a change cannot reach the server (improvement 47). */
export const OFFLINE_SAVE_ERROR = 'Sem conexão · nada foi salvo. Tente quando a conexão voltar.'
export const NETWORK_SAVE_ERROR = 'Não foi possível falar com o servidor · nada foi salvo. Tente de novo.'

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
    if (error.response?.status === 401 && !redirecting) {
      // Session expired: remember the screen, log in again, come back to it.
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
