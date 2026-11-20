import { useLocation, useNavigate } from 'react-router-dom'
import { backLabel } from '../lib/navOrigin'

/**
 * Where "Voltar" goes (improvement 24): the previous screen of the app, named
 * ("‹ Parcelas", "‹ Maria Rocha"), or `fallback` when the page was opened
 * directly (no app history behind it).
 */
export function useBack(fallback: { path: string; label: string }) {
  const navigate = useNavigate()
  const location = useLocation()
  const inApp = location.key !== 'default'
  return {
    label: inApp ? backLabel() : fallback.label,
    go: () => (inApp ? navigate(-1) : navigate(fallback.path)),
  }
}
