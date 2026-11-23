import { useEffect } from 'react'
import { APP_META, type PublicPage } from './site'

const setDescription = (text: string) => document.querySelector('meta[name="description"]')?.setAttribute('content', text)

/**
 * Title and description of a public page while it is open in the app (the
 * built HTML already has them; this covers navigating inside the app).
 * Leaving the page puts back the app's own.
 */
export function usePageMeta(page: Pick<PublicPage, 'title' | 'description'>) {
  useEffect(() => {
    document.title = page.title
    setDescription(page.description)
    return () => {
      document.title = APP_META.title
      setDescription(APP_META.description)
    }
  }, [page.title, page.description])
}
