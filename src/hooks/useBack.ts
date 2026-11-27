import { useLocation, useNavigate } from 'react-router-dom'
import { backLabel } from '../lib/navOrigin'
import { useSide } from '../contexts/SideContext'

/**
 * Where "Voltar" goes (improvement 24): the previous screen of the app, named
 * ("‹ Parcelas", "‹ Maria Rocha"), or `fallback` when the page was opened
 * directly (no app history behind it). Said as the current side says it
 * ("‹ Credores" on "Eu devo", item 75).
 */
export function useBack(fallback: { path: string; label: string }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useSide()
  const inApp = location.key !== 'default'
  const label = inApp ? backLabel() : fallback.label
  return {
    label: label && t(label),
    go: () => (inApp ? navigate(-1) : navigate(fallback.path)),
  }
}
