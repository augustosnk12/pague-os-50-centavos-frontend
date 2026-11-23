import { useSyncExternalStore } from 'react'

const noSubscribe = () => () => {}

/**
 * A value that only the browser knows (saved theme, today's date, signed in).
 * The public pages come as ready HTML made at build time (vite-prerender.ts)
 * and React hydrates them: while hydrating it uses `atBuild` — what the build
 * wrote — and then re-renders with `inBrowser()`. Reading the browser value
 * straight away would not match the HTML and React would redraw the page.
 * `inBrowser` must return the same value while nothing changes (no new objects).
 */
export function useClientValue<T>(inBrowser: () => T, atBuild: T): T {
  return useSyncExternalStore(noSubscribe, inBrowser, () => atBuild)
}
