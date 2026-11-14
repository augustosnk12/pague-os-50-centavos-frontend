/**
 * Expired session (improvement 47): instead of leaving the screen (and losing
 * what is on it), the app opens a sheet to log in again. The layout registers
 * the handler; with no handler (or no known e-mail) the old redirect is used.
 */
type Handler = () => void

let handler: Handler | null = null

export function onSessionExpired(h: Handler | null): void {
  handler = h
}

/** True when a sheet took care of it. */
export function notifySessionExpired(): boolean {
  if (!handler) return false
  handler()
  return true
}

export { SESSION_SAVE_ERROR } from './saveMessages'
