import { Avatar } from '../ui/Avatar'
import { Icon } from '../ui/Icon'
import { fmtMoney } from '../../lib/format'
import type { SearchHit } from '../../lib/searchHits'

const owes = (v: string) => (Number(v) > 0 ? `deve ${fmtMoney(v)}` : 'sem saldo')

interface SearchResultsProps {
  hits: SearchHit[]
  activeId?: string
  listId: string
  onPick: (hit: SearchHit) => void
  emptyText?: string
}

/**
 * The results of a combobox (role="listbox"): grouped options. Keys are handled
 * by the input (aria-activedescendant), so options only need the pointer.
 */
export function SearchResults({ hits, activeId, listId, onPick, emptyText }: SearchResultsProps) {
  const debtors = hits.filter((h) => h.kind === 'debtor')
  const debts = hits.filter((h) => h.kind === 'debt')
  const option = (h: SearchHit) => (
    // Keyboard: the combobox input moves aria-activedescendant and picks with Enter.
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events
    <div
      key={h.id}
      id={h.id}
      role="option"
      tabIndex={-1}
      aria-selected={h.id === activeId}
      className="lt-sr-opt"
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => onPick(h)}
    >
      {h.kind === 'debtor' ? (
        <>
          <Avatar name={h.hit.name} size={32} hue={h.hit.avatarHue} emoji={h.hit.avatarEmoji} />
          <span className="lt-sr-main">
            <span className="lt-sr-t">
              {h.hit.name}
              {h.hit.archived && <span className="lt-arch-tag"> Arquivado</span>}
            </span>
            <span className="lt-sr-s">{owes(h.hit.outstanding)}</span>
          </span>
        </>
      ) : (
        <>
          <span className="lt-sr-debt" aria-hidden="true"><Icon name="layers" size={16} /></span>
          <span className="lt-sr-main">
            <span className="lt-sr-t">{h.hit.description || 'Dívida'}</span>
            <span className="lt-sr-s">
              {h.hit.debtorName} · {Number(h.hit.remaining) > 0 ? `restam ${fmtMoney(h.hit.remaining)}` : 'quitada'}
            </span>
          </span>
        </>
      )}
      <Icon name="chevronRight" size={15} />
    </div>
  )
  return (
    <div id={listId} role="listbox" aria-label="Resultados da busca" className="lt-sr-list">
      {debtors.length > 0 && (
        <div role="group" aria-labelledby={`${listId}-d`}>
          <div id={`${listId}-d`} className="lt-sr-h">Devedores</div>
          {debtors.map(option)}
        </div>
      )}
      {debts.length > 0 && (
        <div role="group" aria-labelledby={`${listId}-x`}>
          <div id={`${listId}-x`} className="lt-sr-h">Dívidas</div>
          {debts.map(option)}
        </div>
      )}
      {!hits.length && emptyText && <div className="lt-sr-empty">{emptyText}</div>}
    </div>
  )
}
