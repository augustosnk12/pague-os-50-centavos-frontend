import { useState } from 'react'
import { Modal } from '../../components/ui/Modal'
import { Avatar } from '../../components/ui/Avatar'
import { Icon } from '../../components/ui/Icon'
import type { Debtor } from '../../types/debtor'

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

interface DebtorFilterSheetProps {
  open: boolean
  onClose: () => void
  debtors: Debtor[]
  selected: string[]
  onChange: (ids: string[]) => void
}

/** "Filtrar por devedor" (improvement 14): search, toggle people, "Limpar". Applies as you tap. */
export function DebtorFilterSheet({ open, onClose, debtors, selected, onChange }: DebtorFilterSheetProps) {
  const [q, setQ] = useState('')
  const matches = debtors.filter((d) => norm(d.name).includes(norm(q.trim())))
  const toggle = (id: string) => onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id])
  const close = () => {
    setQ('')
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title="Filtrar por devedor"
      footer={
        <>
          <button type="button" className="lt-btn-lg" data-variant="secondary" onClick={() => onChange([])} disabled={!selected.length} style={{ flex: '0 0 auto' }}>
            Limpar
          </button>
          <button type="button" className="lt-btn-lg" data-variant="primary" onClick={close}>
            {selected.length ? `Ver ${selected.length === 1 ? '1 devedor' : `${selected.length} devedores`}` : 'Ver todos'}
          </button>
        </>
      }
    >
      <div className="lt-search-field">
        <Icon name="search" size={17} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar devedor…" aria-label="Buscar devedor" />
      </div>
      <ul className="lt-pick-list" aria-label="Devedores">
        {matches.map((d) => {
          const on = selected.includes(d.id)
          return (
            <li key={d.id}>
              <button type="button" className="lt-pick" aria-pressed={on} onClick={() => toggle(d.id)}>
                <span className="lt-check" aria-hidden="true">{on && <Icon name="check" size={13} strokeWidth={3} />}</span>
                <Avatar name={d.name} size={32} hue={d.avatarHue} emoji={d.avatarEmoji} />
                <span className="lt-pick-name">{d.name}</span>
              </button>
            </li>
          )
        })}
        {matches.length === 0 && <li className="lt-pick-empty">Nenhum devedor encontrado.</li>}
      </ul>
    </Modal>
  )
}
