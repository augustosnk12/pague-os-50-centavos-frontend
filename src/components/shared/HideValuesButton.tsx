import { usePreferences } from '../../contexts/PreferencesContext'
import { useToast } from '../../contexts/ToastContext'
import { Icon } from '../ui/Icon'

/** Improvement 71: the eye in the corner of the Painel hero (only there; decision of 26/11/2026). State in aria-pressed. */
export function HideValuesButton() {
  const { hideValues, setHideValues } = usePreferences()
  const { showToast } = useToast()
  const toggle = () => {
    const next = !hideValues
    setHideValues(next)
    showToast(next ? 'Valores escondidos' : 'Valores à mostra', { icon: next ? 'eyeOff' : 'eye' })
  }
  const icon = hideValues ? 'eyeOff' : 'eye'
  return (
    <button type="button" className="lt-hero-eye" onClick={toggle} aria-label="Esconder valores" aria-pressed={hideValues} title={hideValues ? 'Mostrar valores' : 'Esconder valores'}>
      <Icon name={icon} size={20} />
    </button>
  )
}
