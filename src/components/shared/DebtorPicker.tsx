import { useState } from 'react'
import { Modal } from '../ui/Modal'
import { Avatar } from '../ui/Avatar'
import { Icon } from '../ui/Icon'
import { Amount } from '../ui/Amount'
import { localToday } from '../../lib/date'
import { profileNumbers } from '../../lib/debtorProfile'
import { useDebtsByDebtor } from '../../hooks/debts/useDebtsByDebtor'
import { byRecent } from '../../lib/recentDebtors'
import { normalizeTerm, rankByTerm } from '../../lib/searchMatch'
import type { Debtor } from '../../types/debtor'

const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? name

/** "Já deve R$ X · N em atraso" of the chosen debtor. */
function Balance({ id }: { id: string }) {
  const { data } = useDebtsByDebtor(id)
  if (!data) return <span className="lt-dp-bal">&nbsp;</span>
  const today = localToday()
  const n = profileNumbers(data, today)
  const late = data.flatMap((d) => d.installments).filter((i) => Number(i.amount) > Number(i.paidAmount) && i.dueDate.slice(0, 10) < today).length
  return (
    <span className="lt-dp-bal">
      {n.owed > 0 ? (
        <>
          Já deve <Amount value={n.owed / 100} />
          {late > 0 && <span style={{ color: 'var(--overdue)' }}> · {late} em atraso</span>}
        </>
      ) : (
        'Sem saldo em aberto'
      )}
    </span>
  )
}

interface DebtorPickerProps {
  debtors: Debtor[]
  value: Debtor | null
  onChange: (d: Debtor) => void
  /** "Cadastrar 'nome'": opens the new debtor form with the typed name. */
  onCreate: (name: string) => void
  /** Shown when nothing is chosen and the form asks for it. */
  invalid?: boolean
}

/**
 * "Para quem?" (improvement 16): one line with "Buscar devedor" and the 4 most
 * recent as chips; the search opens a sheet with everyone and "Cadastrar".
 * Once chosen it is a compact card with the balance; tapping it changes.
 * Nothing is preselected.
 */
import { useSide } from '../../contexts/SideContext'

export function DebtorPicker({ debtors, value, onChange, onCreate, invalid }: DebtorPickerProps) {
  const [open, setOpen] = useState(false)
  const { t } = useSide()
  const [q, setQ] = useState('')
  const sorted = byRecent(debtors)
  const term = q.trim()
  const list = rankByTerm(sorted, term, (d) => d.name)
  // Someone with exactly this name already exists: pick them, no "Cadastrar".
  const exact = term ? sorted.find((d) => normalizeTerm(d.name) === normalizeTerm(term)) : undefined

  const pick = (d: Debtor) => {
    setOpen(false)
    setQ('')
    onChange(d)
  }
  const create = () => {
    setOpen(false)
    onCreate(term)
    setQ('')
  }

  return (
    <div className="lt-field" id="nd-debtor">
      <div className="lt-flabel" id="nd-debtor-l">
        {t('Para quem?')} <span className="lt-req" aria-hidden="true">*</span>
      </div>
      {value ? (
        <button type="button" className="lt-dp-card" onClick={() => setOpen(true)} aria-label={`${t('Trocar devedor')} (${value.name})`}>
          <Avatar name={value.name} size={36} hue={value.avatarHue} emoji={value.avatarEmoji} />
          <span className="lt-dp-main">
            <span className="lt-dp-name">{value.name}</span>
            <Balance id={value.id} />
          </span>
          <span className="lt-dp-change">Trocar</span>
        </button>
      ) : (
        <div className="lt-dp-chips" role="group" aria-labelledby="nd-debtor-l" data-invalid={invalid || undefined}>
          <button type="button" className="lt-dp-search" onClick={() => setOpen(true)}>
            <Icon name="search" size={16} strokeWidth={2.6} /> {t('Buscar devedor')}
          </button>
          {sorted.length > 0 && <span className="lt-dp-sep" aria-hidden="true" />}
          {sorted.slice(0, 4).map((d) => (
            <button key={d.id} type="button" className="lt-chip lt-dp-chip" onClick={() => pick(d)} aria-label={`Escolher ${d.name}`}>
              <Avatar name={d.name} size={24} hue={d.avatarHue} emoji={d.avatarEmoji} /> {firstName(d.name)}
            </button>
          ))}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => {
          setOpen(false)
          setQ('')
        }}
        title={t('Para quem é a dívida?')}
      >
        <div className="lt-search-field">
          <Icon name="search" size={16} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              // Enter: the person with this name, or register the new one.
              if (e.key !== 'Enter' || !term) return
              e.preventDefault()
              if (exact) pick(exact)
              else create()
            }}
            enterKeyHint={exact ? 'go' : 'done'}
            placeholder="Buscar pelo nome…"
            aria-label={t('Buscar devedor pelo nome')}
          />
        </div>
        {/* Right under the field: with the phone keyboard open, a button at the end of the list is out of sight. */}
        {term && !exact && (
          <button type="button" className="lt-pick lt-dp-new lt-dp-new-top" onClick={create}>
            <span className="lt-dp-new-ic" aria-hidden="true"><Icon name="plus" size={16} /></span>
            <span className="lt-pick-name">Cadastrar “{term}”</span>
          </button>
        )}
        <ul className="lt-pick-list" aria-label={t('Devedores')}>
          {list.map((d) => (
            <li key={d.id}>
              <button type="button" className="lt-pick" aria-pressed={value?.id === d.id} onClick={() => pick(d)}>
                <Avatar name={d.name} size={36} hue={d.avatarHue} emoji={d.avatarEmoji} />
                <span className="lt-pick-name" style={{ flex: 1 }}>{d.name}</span>
                {value?.id === d.id && <Icon name="check" size={16} color="var(--primary)" />}
              </button>
            </li>
          ))}
        </ul>
        {!term && list.length === 0 && <p className="lt-pick-empty">{t('Nenhum devedor ainda. Digite um nome para cadastrar.')}</p>}
      </Modal>
    </div>
  )
}
