import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { SectionHeader } from '../../components/ui/ListGroup'
import { Segmented } from '../../components/ui/Segmented'
import { useAuth } from '../../contexts/AuthContext'
import { useDashboardOverview } from '../../hooks/dashboard/useDashboardOverview'
import { useDebtsByDebtor } from '../../hooks/debts/useDebtsByDebtor'
import type { LenderSettings } from '../../api/settings.api'
import { localToday } from '../../lib/date'
import { brCode } from '../../lib/pix'
import {
  CHARGE_TEMPLATE_MAX,
  CHARGE_TONES,
  CHARGE_VARS,
  CUSTOM_STARTER,
  chargeMessage,
  pixBlock,
  reminderItems,
  reminderTotal,
  type ChargeTone,
  type ReminderItem,
} from '../../lib/reminder'

const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? name

/** Shown when nobody has anything open yet. */
const SAMPLE: { name: string; items: ReminderItem[] } = {
  name: 'Ana',
  items: [{ id: 's1', label: 'Notebook (2/5)', dueDate: '2026-11-10T00:00:00.000Z', cents: 25_000, overdue: true }],
}

/** Someone real for the preview: the first person in the Painel's "Atenção". */
function usePreviewPerson() {
  const today = localToday()
  const { data: overview } = useDashboardOverview(today)
  const first = overview && [...overview.attention.overdue, ...overview.attention.today, ...overview.attention.next7][0]
  const person = first?.debt.debtor
  const { data: debts } = useDebtsByDebtor(person?.id ?? '')
  return useMemo(() => {
    const items = debts ? reminderItems(debts, today) : []
    return person && items.length ? { name: person.name, items } : SAMPLE
  }, [person, debts, today])
}

interface Props {
  settings: LenderSettings
  save: (data: Partial<LenderSettings>, what: string) => void
}

/**
 * "Mensagem de cobrança" (item 68): Amigável (the message of today) · Direta ·
 * Minha, a free text with {nome}, {itens}, {total} and {pix} inserted by
 * buttons. Saved in the account (every device); the text when leaving it.
 */
export function ChargeMessageSection({ settings, save }: Props) {
  const { lender } = useAuth()
  const { hash } = useLocation()
  const ref = useRef<HTMLTextAreaElement>(null)
  const headRef = useRef<HTMLDivElement>(null)
  const tone: ChargeTone = settings.chargeTone ?? 'FRIENDLY'
  const [draft, setDraft] = useState(settings.chargeTemplate ?? '')
  const [err, setErr] = useState('')
  // The API answered with another text (saved, another device): show it.
  const [seen, setSeen] = useState(settings.chargeTemplate)
  if (settings.chargeTemplate !== seen) {
    setSeen(settings.chargeTemplate)
    setDraft(settings.chargeTemplate ?? '')
  }

  // "Mudar em Configurações" (WhatsApp sheet) lands here.
  useEffect(() => {
    if (hash === '#mensagem') headRef.current?.scrollIntoView({ block: 'start' })
  }, [hash])

  const person = usePreviewPerson()
  const total = reminderTotal(person.items)
  const pix = settings.pixKey ? pixBlock(brCode({ key: settings.pixKey, name: lender?.name ?? '', amount: total / 100 }), total) : ''
  const preview = chargeMessage({ chargeTone: tone, chargeTemplate: tone === 'CUSTOM' ? draft : null }, firstName(person.name), person.items, pix)
  const over = draft.length > CHARGE_TEMPLATE_MAX
  // The field never goes past the limit (typing, pasting or the variable buttons).
  const full = draft.length >= CHARGE_TEMPLATE_MAX
  const LIMIT_TEXT = `Chegou ao limite de ${CHARGE_TEMPLATE_MAX.toLocaleString('pt-BR')} caracteres.`

  const pickTone = (t: ChargeTone) => {
    if (t === tone) return
    setErr('')
    if (t === 'CUSTOM' && !settings.chargeTemplate?.trim()) {
      setDraft(CUSTOM_STARTER)
      save({ chargeTone: 'CUSTOM', chargeTemplate: CUSTOM_STARTER }, 'o modelo da mensagem')
    } else save({ chargeTone: t }, 'o modelo da mensagem')
  }

  const saveText = () => {
    const text = draft.trim()
    if (!text) return setErr('Escreva sua mensagem ou escolha outro modelo.')
    if (over) return setErr(`Use até ${CHARGE_TEMPLATE_MAX.toLocaleString('pt-BR')} caracteres.`)
    setErr('')
    if (text !== (settings.chargeTemplate ?? '').trim()) save({ chargeTemplate: text }, 'sua mensagem')
  }

  /** Puts the variable where the cursor is (the field keeps the focus). */
  const insert = (token: string) => {
    const el = ref.current
    const start = el?.selectionStart ?? draft.length
    const end = el?.selectionEnd ?? draft.length
    if (draft.length - (end - start) + token.length > CHARGE_TEMPLATE_MAX) {
      setErr(LIMIT_TEXT)
      el?.focus()
      return
    }
    setDraft(draft.slice(0, start) + token + draft.slice(end))
    if (err) setErr('')
    requestAnimationFrame(() => {
      el?.focus()
      el?.setSelectionRange(start + token.length, start + token.length)
    })
  }

  return (
    <>
      <div ref={headRef} id="mensagem" style={{ scrollMarginTop: 72 }}>
        <SectionHeader variant="plain">Mensagem de cobrança</SectionHeader>
      </div>
      <div className="lt-set-card lt-set-pad">
        <Segmented<ChargeTone> label="Modelo da mensagem" value={tone} options={CHARGE_TONES} onChange={pickTone} />
        {tone === 'CUSTOM' && (
          <>
            <label className="lt-set-t" htmlFor="set-tpl" style={{ display: 'block', margin: '12px 0 6px' }}>Seu texto</label>
            <textarea
              ref={ref}
              id="set-tpl"
              className="lt-remind-text lt-tpl-text"
              value={draft}
              rows={6}
              maxLength={CHARGE_TEMPLATE_MAX}
              onChange={(e) => {
                setDraft(e.target.value.slice(0, CHARGE_TEMPLATE_MAX))
                if (err) setErr('')
              }}
              onPaste={(e) => {
                // A paste that does not fit is cut at the limit by the field: say so.
                const el = e.currentTarget
                const room = CHARGE_TEMPLATE_MAX - (el.value.length - (el.selectionEnd - el.selectionStart))
                if (e.clipboardData.getData('text').length > room) requestAnimationFrame(() => setErr(`Colado só até o limite de ${CHARGE_TEMPLATE_MAX.toLocaleString('pt-BR')} caracteres.`))
              }}
              onBlur={saveText}
              aria-invalid={!!err || undefined}
              aria-describedby="tpl-err tpl-count"
            />
            <p id="tpl-count" className="lt-tpl-count" data-over={full || undefined}>
              {draft.length.toLocaleString('pt-BR')}/{CHARGE_TEMPLATE_MAX.toLocaleString('pt-BR')}
            </p>
            {err && <p id="tpl-err" className="lt-field-error" role="alert" style={{ margin: '2px 2px 0' }}>{err}</p>}
            <div className="lt-set-chips" role="group" aria-label="Inserir no texto" style={{ marginTop: 8 }}>
              {CHARGE_VARS.map((v) => (
                <button key={v.token} type="button" className="lt-chip" onMouseDown={(e) => e.preventDefault()} onClick={() => insert(v.token)} aria-label={`Inserir ${v.label} (${v.token})`}>
                  + {v.label}
                </button>
              ))}
            </div>
          </>
        )}
        <div className="lt-set-s" style={{ margin: '12px 2px 6px' }}>Prévia com {firstName(person.name)}</div>
        <pre className="lt-tpl-preview" aria-label={`Prévia da mensagem para ${firstName(person.name)}`}>{preview}</pre>
        <p className="lt-set-note" style={{ margin: '8px 2px 0' }}>
          Vale para “Cobrar” e para deslizar a linha. Cada mensagem continua editável antes de enviar.
          {tone === 'CUSTOM' && ' Seu texto é salvo ao sair do campo.'}
        </p>
      </div>
    </>
  )
}
