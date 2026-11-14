import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon } from '../ui/Icon'
import { IconButton } from '../ui/IconButton'
import { SearchResults } from '../shared/SearchResults'
import { searchHits, type SearchHit } from '../../lib/searchHits'
import { useSearch } from '../../hooks/search/useSearch'

interface HeaderSearchProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Desktop search (improvement 21): a magnifier that expands into "Buscar
 * devedor ou dívida…" (also Ctrl/⌘ K and "/"). Results drop down in two
 * groups; Esc, leaving with an empty field or picking a result closes it,
 * and focus goes back to the magnifier.
 */
export function HeaderSearch({ open, onOpenChange }: HeaderSearchProps) {
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [active, setActive] = useState(0)
  const input = useRef<HTMLInputElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const listId = useId()
  const { data, active: searching, settled } = useSearch(q)
  const hits = searchHits(data, q.trim())

  useEffect(() => {
    if (open) input.current?.focus()
  }, [open])
  useEffect(() => setActive(0), [data])

  const close = (refocus = true) => {
    setQ('')
    onOpenChange(false)
    if (refocus) requestAnimationFrame(() => trigger.current?.focus())
  }
  const pick = (h: SearchHit) => {
    close(false)
    navigate(h.to)
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      close()
    } else if (e.key === 'ArrowDown' && hits.length) {
      e.preventDefault()
      setActive((a) => (a + 1) % hits.length)
    } else if (e.key === 'ArrowUp' && hits.length) {
      e.preventDefault()
      setActive((a) => (a - 1 + hits.length) % hits.length)
    } else if (e.key === 'Enter' && hits[active]) {
      e.preventDefault()
      pick(hits[active])
    }
  }

  if (!open) {
    return (
      <IconButton
        ref={trigger}
        name="search"
        label="Buscar devedor ou dívida (Ctrl K ou /)"
        aria-keyshortcuts="Control+K Meta+K /"
        onClick={() => onOpenChange(true)}
      />
    )
  }

  const showList = searching && (hits.length > 0 || settled)
  return (
    <div className="lt-hsearch">
      <div className="lt-hsearch-field">
        <Icon name="search" size={16} />
        <input
          ref={input}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={() => {
            if (!q.trim()) close(false)
          }}
          placeholder="Buscar devedor ou dívida…"
          aria-label="Buscar devedor ou dívida"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showList && hits[active] ? hits[active].id : undefined}
          autoComplete="off"
        />
        <kbd aria-hidden="true">Esc</kbd>
      </div>
      {showList && (
        <div className="lt-hsearch-drop">
          <SearchResults hits={hits} activeId={hits[active]?.id} listId={listId} onPick={pick} emptyText={`Nada encontrado para “${q.trim()}”.`} />
        </div>
      )}
    </div>
  )
}
