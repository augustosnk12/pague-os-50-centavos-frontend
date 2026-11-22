import { Icon } from '../ui/Icon'

interface UpdateCardProps {
  updating: boolean
  onUpdate: () => void
  onLater: () => void
}

/**
 * The "Nova versão disponível" card (PWA). A full-width card at the top
 * (max 440px, centered with margins — not left: 50% + translate, which gave
 * it only half the screen and wrapped the text into a squashed pill), in the
 * app's surface colors in both themes, over the safe area.
 */
export function UpdateCard({ updating, onUpdate, onLater }: UpdateCardProps) {
  return (
    <div className="lt-update" role="status" aria-label="Nova versão disponível">
      <span className="lt-update-ic" aria-hidden="true"><Icon name="refresh" size={20} /></span>
      <div className="lt-update-txt">
        <div className="lt-update-t">Nova versão disponível</div>
        <div className="lt-update-s">Atualize para usar a versão mais recente. Leva só um instante.</div>
      </div>
      <div className="lt-update-acts">
        <button type="button" className="lt-update-later" onClick={onLater} disabled={updating}>Depois</button>
        <button type="button" className="lt-update-go" onClick={onUpdate} aria-disabled={updating || undefined}>
          {updating ? 'Atualizando…' : 'Atualizar'}
        </button>
      </div>
    </div>
  )
}
