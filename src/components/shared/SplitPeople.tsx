import { useState } from 'react'
import { Avatar } from '../ui/Avatar'
import { Icon } from '../ui/Icon'
import { Segmented } from '../ui/Segmented'
import { byRecent } from '../../lib/recentDebtors'
import { rankByTerm } from '../../lib/searchMatch'
import { formatCents, parseCurrencyDigits } from '../../lib/currency'
import { fmtMoney } from '../../lib/format'
import { SPLIT_MAX_PEOPLE, shareInstallments, type SplitCheck, type SplitMode } from '../../lib/split'
import type { Debtor } from '../../types/debtor'

const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? name
const people = (n: number) => `${n} ${n === 1 ? 'pessoa' : 'pessoas'}`

/** Rows shown before "Mostrar todos" (the filter shows every match). */
const PICK_FIRST = 8

interface PickerProps {
  others: Debtor[]
  withIds: string[]
  full: boolean
  onAdd: (id: string) => void
  onRemove: (id: string) => void
  onCreate: (name: string) => void
}

/**
 * Everyone to pick from, with a check on each (recognition, not recall: no
 * name to remember). Most recent first and in a fixed order (picking does not
 * move rows). The field only narrows the list; with a name that is not there,
 * "Cadastrar".
 */
function PeoplePicker({ others, withIds, full, onAdd, onRemove, onCreate }: PickerProps) {
  const [q, setQ] = useState('')
  const [all, setAll] = useState(false)
  const term = q.trim()
  const sorted = byRecent(others)
  const list = term ? rankByTerm(sorted, term, (d) => d.name) : all ? sorted : sorted.slice(0, PICK_FIRST)
  const hidden = term ? 0 : sorted.length - list.length

  if (!others.length) {
    return (
      <div className="lt-split-empty">
        <p>Você ainda não tem outras pessoas.</p>
        <button type="button" className="lt-more-link" style={{ padding: 0 }} onClick={() => onCreate('')}>
          <Icon name="plus" size={16} /> Cadastrar pessoa
        </button>
      </div>
    )
  }

  return (
    <div className="lt-split-pick">
      <div className="lt-split-cap" style={{ marginTop: 4 }}>
        <span className="lt-split-sug" id="nd-split-all" style={{ margin: 0 }}>Seus devedores</span>
        <span className="lt-split-k">{full ? `Até ${SPLIT_MAX_PEOPLE} pessoas por divisão` : 'Toque para incluir'}</span>
      </div>
      {sorted.length > PICK_FIRST && (
        <div className="lt-search-field lt-split-search">
          <Icon name="search" size={16} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filtrar pelo nome…" autoComplete="off" aria-label="Filtrar devedores pelo nome" />
          {q && (
            <button type="button" className="lt-split-clear" aria-label="Limpar filtro" onClick={() => setQ('')}>
              <Icon name="x" size={12} strokeWidth={2.6} />
            </button>
          )}
        </div>
      )}
      <ul className="lt-split-res" aria-labelledby="nd-split-all">
        {list.map((d) => {
          const inIt = withIds.includes(d.id)
          const off = full && !inIt
          return (
            <li key={d.id}>
              <button
                type="button"
                role="checkbox"
                aria-checked={inIt}
                aria-disabled={off || undefined}
                className="lt-pick lt-split-opt"
                onClick={() => {
                  if (inIt) onRemove(d.id)
                  else if (!off) onAdd(d.id)
                }}
              >
                <Avatar name={d.name} size={24} hue={d.avatarHue} emoji={d.avatarEmoji} />
                <span className="lt-pick-name" style={{ flex: 1 }}>{d.name}</span>
                <span className="lt-split-box" aria-hidden="true">{inIt && <Icon name="check" size={12} strokeWidth={3} />}</span>
              </button>
            </li>
          )
        })}
        {term && !list.length && <li className="lt-pick-empty" style={{ padding: '6px 8px' }}>Ninguém com “{term}”.</li>}
        <li>
          <button
            type="button"
            className="lt-pick lt-dp-new"
            onClick={() => {
              onCreate(term)
              setQ('')
            }}
          >
            <span className="lt-dp-new-ic" aria-hidden="true"><Icon name="plus" size={16} /></span>
            <span className="lt-pick-name">{term ? `Cadastrar “${term}”` : 'Cadastrar pessoa'}</span>
          </button>
        </li>
      </ul>
      {(hidden > 0 || (all && !term && sorted.length > PICK_FIRST)) && (
        <button type="button" className="lt-more-link" style={{ padding: '8px 2px 0' }} aria-expanded={all} onClick={() => setAll((v) => !v)}>
          {all ? 'Mostrar menos' : `Mostrar todos (${sorted.length})`} <Icon name={all ? 'chevronUp' : 'chevronDown'} size={16} />
        </button>
      )}
    </div>
  )
}

interface WhoProps {
  debtors: Debtor[]
  main: Debtor
  withIds: string[]
  withMe: boolean
  meName: string
  on: boolean
  invalid?: boolean
  onToggle: () => void
  onAdd: (id: string) => void
  onRemove: (id: string) => void
  onToggleMe: () => void
  /** "Cadastrar 'nome'": the new person goes straight into the split. */
  onCreate: (name: string) => void
}

/**
 * "Dividir com mais pessoas" (item 66), right after the person: who splits it.
 * Tokens (the main person fixed, the others with ×, and "Você"), a search
 * with a clear button, Sugestões (the 6 most recent) and "Cadastrar".
 */
export function SplitWho({ debtors, main, withIds, withMe, meName, on, invalid, onToggle, onAdd, onRemove, onToggleMe, onCreate }: WhoProps) {
  const byId = new Map(debtors.map((d) => [d.id, d]))
  const others = debtors.filter((d) => d.id !== main.id)
  const full = 1 + withIds.length >= SPLIT_MAX_PEOPLE
  const total = 1 + withIds.length + (withMe ? 1 : 0)

  return (
    <div className="lt-field lt-split" id="nd-split" data-invalid={invalid || undefined}>
      <button type="button" role="switch" aria-checked={on} className="lt-switch-row" onClick={onToggle}>
        <Icon name="users" size={20} />
        <span style={{ flex: 1, textAlign: 'left' }}>
          <span className="lt-switch-t">Dividir com mais pessoas</span>
          <span className="lt-switch-s">Jantar, viagem, presente: cada um fica com a sua parte</span>
        </span>
        <span className="lt-switch" aria-hidden="true"><span /></span>
      </button>

      {on && (
        <div className="lt-split-in">
          <div className="lt-split-cap">
            <span className="lt-flabel" id="nd-split-l" style={{ margin: 0 }}>Quem divide</span>
            <span className="lt-split-k" data-invalid={invalid || undefined}>{withIds.length ? people(total) : 'Adicione ao menos 1 pessoa'}</span>
          </div>
          <ul className="lt-split-toks" aria-labelledby="nd-split-l">
            <li className="lt-split-tok" data-fixed>
              <Avatar name={main.name} size={24} hue={main.avatarHue} emoji={main.avatarEmoji} />
              <span>{firstName(main.name)}</span>
              <span className="lt-split-tok-k">principal</span>
            </li>
            {withIds.map((id) => {
              const d = byId.get(id)
              if (!d) return null
              return (
                <li key={id} className="lt-split-tok">
                  <Avatar name={d.name} size={24} hue={d.avatarHue} emoji={d.avatarEmoji} />
                  <span>{firstName(d.name)}</span>
                  <button type="button" className="lt-split-x" aria-label={`Tirar ${d.name} da divisão`} onClick={() => onRemove(id)}>
                    <Icon name="x" size={12} strokeWidth={2.6} />
                  </button>
                </li>
              )
            })}
            {withMe && (
              <li className="lt-split-tok" data-you>
                <Avatar name={meName || 'Você'} size={24} />
                <span>Você</span>
              </li>
            )}
          </ul>

          <PeoplePicker others={others} withIds={withIds} full={full} onAdd={onAdd} onRemove={onRemove} onCreate={onCreate} />

          <button type="button" role="switch" aria-checked={withMe} aria-label="Eu também participo" aria-describedby="nd-split-me-s" className="lt-switch-row lt-split-me-sw" onClick={onToggleMe}>
            <span style={{ flex: 1, textAlign: 'left' }}>
              <span className="lt-switch-t">Eu também participo</span>
              <span className="lt-switch-s" id="nd-split-me-s">Sua parte fica fora do app</span>
            </span>
            <span className="lt-switch" aria-hidden="true"><span /></span>
          </button>
          {withIds.length > 0 && (
            <p className="lt-nd-hint" style={{ margin: '6px 2px 0' }}>
              <Icon name="info" size={12} /> A parte de cada um aparece no fim, depois do valor e das parcelas.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

interface SharesProps {
  debtors: Debtor[]
  ids: string[]
  withMe: boolean
  meName: string
  mode: SplitMode
  onMode: (m: SplitMode) => void
  custom: Record<string, string>
  onCustom: (id: string, cents: string) => void
  totalCents: number
  installments: number
  monthly: boolean
  check: SplitCheck
  invalid?: boolean
}

/**
 * "Parte de cada um" (item 66), at the end of the form (it depends on the
 * total, the installments and the type): Partes iguais · Valores diferentes,
 * each part already split into installments, and "Você".
 */
export function SplitShares({ debtors, ids, withMe, meName, mode, onMode, custom, onCustom, totalCents, installments, monthly, check, invalid }: SharesProps) {
  const byId = new Map(debtors.map((d) => [d.id, d]))
  const n = Math.max(1, installments)
  const total = ids.length + (withMe ? 1 : 0)
  const name = (id: string) => firstName(byId.get(id)?.name ?? '')
  const tooSmall = check.tiny ? `A parte de ${name(check.tiny.id)} (${fmtMoney(check.tiny.cents / 100)}) é pequena demais${n > 1 ? ` para ${n} parcelas` : ''}.` : ''

  const summary = !totalCents
    ? 'Informe o valor total para ver a parte de cada um.'
    : check.problem === 'tiny'
      ? tooSmall
      : check.problem === 'over'
        ? `A soma (${fmtMoney(check.sum / 100)}) passou do total.`
        : check.problem === 'short'
          ? `Faltam ${fmtMoney((totalCents - check.sum) / 100)} para fechar o total.`
          : check.problem === 'empty'
            ? 'Informe a parte de cada pessoa.'
            : mode === 'equal'
              ? `${fmtMoney(totalCents / 100)} ÷ ${total} = ${fmtMoney(Math.floor(totalCents / total) / 100)} por pessoa${withMe ? ' · sua parte não vira dívida' : ''}${totalCents % total ? ' · os centavos que sobram vão para as primeiras pessoas' : ''}`
              : `Soma ${fmtMoney(check.sum / 100)} de ${fmtMoney(totalCents / 100)}${withMe ? ` · sua parte: ${fmtMoney(check.mine / 100)}` : ''}`
  const bad = !!totalCents && !!check.problem

  return (
    <section className="lt-field lt-split lt-split-how" id="nd-shares" aria-labelledby="nd-shares-l" data-invalid={(invalid && bad) || undefined}>
      <div className="lt-split-cap">
        <span className="lt-flabel" id="nd-shares-l" style={{ margin: 0 }}>Parte de cada um</span>
        <span className="lt-split-k">{people(total)}{withMe ? ', com você' : ''}</span>
      </div>
      <Segmented<SplitMode> label="Como dividir" value={mode} options={[{ value: 'equal', label: 'Partes iguais' }, { value: 'custom', label: 'Valores diferentes' }]} onChange={onMode} />
      <ul className="lt-split-list" aria-label="Parte de cada pessoa">
        {check.shares.map((x) => {
          const small = check.tiny?.id === x.id
          const d = byId.get(x.id)
          const how = x.cents && !small ? shareInstallments(x.cents, n, monthly) : ''
          return (
            <li key={x.id} className="lt-split-row">
              {d && <Avatar name={d.name} size={24} hue={d.avatarHue} emoji={d.avatarEmoji} />}
              <span className="lt-split-name">{name(x.id)}</span>
              {mode === 'custom' ? (
                <span className="lt-split-cell">
                  <span className="lt-split-in-box" data-invalid={small || undefined}>
                    <span aria-hidden="true">R$</span>
                    <input
                      inputMode="numeric"
                      value={formatCents(custom[x.id] ?? '')}
                      onChange={(e) => onCustom(x.id, parseCurrencyDigits(e.target.value))}
                      placeholder="0,00"
                      aria-label={`Parte de ${d?.name ?? ''}`}
                      aria-invalid={small || undefined}
                      aria-describedby={how ? `nd-sh-${x.id}` : undefined}
                    />
                  </span>
                  <span className="lt-split-how-t" id={`nd-sh-${x.id}`}>{how || ' '}</span>
                </span>
              ) : (
                <span className="lt-split-cell">
                  <b>{fmtMoney(x.cents / 100)}</b>
                  {totalCents > 0 && <span className="lt-split-how-t">{how}</span>}
                </span>
              )}
            </li>
          )
        })}
        {withMe && (
          <li className="lt-split-row" data-me>
            <Avatar name={meName || 'Você'} size={24} />
            <span className="lt-split-name">Você</span>
            <span className="lt-split-cell"><b>{fmtMoney(Math.max(0, check.mine) / 100)}</b></span>
          </li>
        )}
      </ul>
      <p className="lt-split-sum" data-bad={bad || undefined} role="status">{summary}</p>
    </section>
  )
}
