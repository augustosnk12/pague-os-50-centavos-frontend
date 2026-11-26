import { usePreferences } from '../../contexts/PreferencesContext'
import { useToast } from '../../contexts/ToastContext'
import { Icon } from '../ui/Icon'
import { IconButton } from '../ui/IconButton'

/** Improvement 71: eye in the Painel hero ("hero") and in the desktop header ("header"). Same name, state in aria-pressed. */
export function HideValuesButton({ variant }: { variant: 'hero' | 'header' }) {
  const { hideValues, setHideValues } = usePreferences()
  const { showToast } = useToast()
  const toggle = () => {
    const next = !hideValues
    setHideValues(next)
    showToast(next ? 'Valores escondidos' : 'Valores à mostra', { icon: next ? 'eyeOff' : 'eye' })
  }
  const icon = hideValues ? 'eyeOff' : 'eye'
  if (variant === 'header') return <IconButton name={icon} onClick={toggle} label="Esconder valores" aria-pressed={hideValues} active={hideValues} />
  return (
    <button type="button" className="lt-hero-eye" onClick={toggle} aria-label="Esconder valores" aria-pressed={hideValues} title={hideValues ? 'Mostrar valores' : 'Esconder valores'}>
      <Icon name={icon} size={20} />
    </button>
  )
}
