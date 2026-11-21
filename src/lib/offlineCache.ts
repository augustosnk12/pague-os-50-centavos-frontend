/**
 * The service worker keeps the last API answers (GET) so the installed app
 * shows the latest data offline (vite.config.ts → runtimeCaching). That is
 * the account's data: it is deleted when the session ends (logout, expired
 * session), so the next person on the device does not see it.
 */
export const API_CACHE = 'api-reads'

export function clearOfflineData(): void {
  if (typeof caches === 'undefined') return
  caches.delete(API_CACHE).catch(() => {})
}
