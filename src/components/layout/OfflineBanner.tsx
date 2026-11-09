import { useOnline } from '../../hooks/useOnline'
import { Icon } from '../ui/Icon'

const hhmm = (d: Date) => d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

/**
 * "Sem conexão" strip (improvement 47). The screen keeps showing the data it
 * already had; changes are blocked by the API client with "nada foi salvo".
 */
export function OfflineBanner() {
  const { online, since } = useOnline()
  if (online) return null
  return (
    <div
      role="status"
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 120,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        padding: '8px 14px',
        background: 'var(--text)',
        color: 'var(--bg)',
        fontSize: 13.5,
        fontWeight: 700,
      }}
    >
      <Icon name="wifiOff" size={16} />
      Sem conexão{since ? ` · mostrando os dados de ${hhmm(since)}` : ''}. Alterações ficam bloqueadas.
    </div>
  )
}
