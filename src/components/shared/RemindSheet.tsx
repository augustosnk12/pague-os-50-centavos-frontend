import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Modal } from '../ui/Modal'
import { Icon } from '../ui/Icon'
import { useDebtor } from '../../hooks/debtors/useDebtor'
import { useDebtsByDebtor } from '../../hooks/debts/useDebtsByDebtor'
import { useSettings } from '../../hooks/settings/useSettings'
import { useAuth } from '../../contexts/AuthContext'
import { localToday } from '../../lib/date'
import { brCode } from '../../lib/pix'
import { chargeMessage, pixBlock, reminderItems, reminderTotal, toneLabel } from '../../lib/reminder'
import { useNavigate } from 'react-router-dom'
import { whatsappLink } from '../../lib/whatsapp'
import { fmtPhone } from '../../lib/format'
import { maskPhone, phoneProblem } from '../../lib/phone'
import { useUpdateDebtor } from '../../hooks/debtors/useUpdateDebtor'
import { useToast } from '../../contexts/ToastContext'
import { getApiError } from '../../lib/api'
import { translateApiError } from '../../lib/utils'

const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? name

interface RemindSheetProps {
  /** Debtor to remind; null closes the sheet. */
  debtorId: string | null
  onClose: () => void
}

/**
 * "Lembrar no WhatsApp" (S5, improvements 10 and 33): a message with the
 * open installments and the total, editable before opening WhatsApp, and
 * an optional Pix "copia e cola" with the exact amount (BR Code built here,
 * no bank integration).
 */
export function RemindSheet({ debtorId, onClose }: RemindSheetProps) {
  const today = localToday()
  const lastId = useRef(debtorId)
  if (debtorId) lastId.current = debtorId
  const id = debtorId ?? lastId.current ?? ''

  const { lender } = useAuth()
  const { data: debtor } = useDebtor(id)
  const { data: debts } = useDebtsByDebtor(id)
  const settingsQuery = useSettings({ enabled: !!id })
  const settings = settingsQuery.data

  const items = useMemo(() => (debts ? reminderItems(debts, today) : []), [debts, today])
  const total = reminderTotal(items)
  const pix = settings?.pixKey && total > 0 ? pixBlock(brCode({ key: settings.pixKey, name: lender?.name ?? '', amount: total / 100 }), total) : ''

  const [text, setText] = useState('')
  const [withPix, setWithPix] = useState(false)
  // No phone (or one WhatsApp can't use): it is typed right here and saved to the debtor.
  const [phone, setPhone] = useState('')
  const [phoneErr, setPhoneErr] = useState('')
  const phoneRef = useRef<HTMLInputElement>(null)
  const phoneId = useId()
  const update = useUpdateDebtor(id)
  const { showToast } = useToast()
  // The message needs the tone (item 68): wait for the settings too (an error falls back to Amigável).
  const ready = !!debtor && !!debts && (!!settings || settingsQuery.isError)
  const noteId = useId()
  const pixHintId = useId()

  // Item 68: the tone chosen in Configurações (Amigável when the API has none).
  const message = (on: boolean) => (debtor && items.length ? chargeMessage(settings, firstName(debtor.name), items, on ? pix : '') : '')
  const navigate = useNavigate()

  // Fresh message each time the sheet opens for someone (and once the data arrives).
  useEffect(() => {
    if (!debtorId || !ready) return
    setText(message(false))
    setWithPix(false)
    setPhone(debtor.phone ? maskPhone(debtor.phone) : '')
    setPhoneErr('')
  }, [debtorId, ready]) // eslint-disable-line react-hooks/exhaustive-deps

  // Toggling Pix: an untouched message is rebuilt (the block goes where {pix} is);
  // an edited one only gets the block added at the end / removed, keeping the edits.
  const togglePix = () => {
    if (!pix) return
    setText((t) => {
      if (t === message(withPix)) return message(!withPix)
      return withPix ? t.replace(pix, '').replace(pix.trim(), '') : t + pix
    })
    setWithPix((v) => !v)
  }

  const name = debtor?.name ?? ''
  const askPhone = ready && !whatsappLink(debtor.phone)
  const link = !debtor ? null : askPhone ? whatsappLink(phone, text) : whatsappLink(debtor.phone, text)
  const blocked = ready && !items.length ? 'Não há nada em aberto para cobrar.' : ''
  const phoneIssue = (v: string) => (!v.trim() ? 'Informe o telefone com DDD' : phoneProblem(v) ?? (whatsappLink(v) ? '' : 'Este número não serve para o WhatsApp'))

  const send = () => {
    if (!items.length || !text.trim()) return
    if (askPhone) {
      const issue = phoneIssue(phone)
      if (issue || !link) {
        setPhoneErr(issue || 'Este número não serve para o WhatsApp')
        phoneRef.current?.focus()
        return
      }
      const who = firstName(name)
      // Opened in the same tap (browsers block windows opened after waiting); the save runs alongside.
      update.mutate({ phone: phone.trim() }, {
        onSuccess: () => showToast(`Telefone salvo no cadastro de ${who}`, { icon: 'check' }),
        onError: (e: unknown) => showToast(translateApiError(getApiError(e), `O telefone não foi salvo no cadastro de ${who}.`), { icon: 'alert' }),
      })
    }
    if (!link) return
    window.open(link, '_blank', 'noopener,noreferrer')
    onClose()
  }

  return (
    <Modal
      open={!!debtorId}
      onClose={onClose}
      title={name ? `Lembrar ${firstName(name)}` : 'Lembrar no WhatsApp'}
      head={(titleId, close) => (
        <div className="lt-remind-head">
          <span style={{ color: 'var(--wa)', display: 'inline-flex' }} aria-hidden="true"><Icon name="whatsapp" size={20} /></span>
          <h2 id={titleId} className="lt-remind-title">{name ? `Lembrar ${firstName(name)}` : 'Lembrar no WhatsApp'}</h2>
          <button type="button" className="lt-icon-close" aria-label="Fechar" onClick={close}><Icon name="x" size={20} /></button>
        </div>
      )}
      footer={
        <button
          type="button"
          className="lt-btn-lg"
          data-variant="wa"
          disabled={!ready || !items.length || !text.trim()}
          aria-disabled={(askPhone && !link) || undefined}
          aria-describedby={blocked ? noteId : askPhone ? phoneId : undefined}
          onClick={send}
        >
          <Icon name="send" size={16} /> {askPhone ? 'Salvar e abrir WhatsApp' : 'Abrir WhatsApp'}
        </button>
      }
    >
      {!ready ? (
        <div aria-busy="true" style={{ paddingTop: 4 }}>
          <span className="lt-sr-only">Montando a mensagem…</span>
          <div className="lt-skel" style={{ height: 14, width: '80%' }} />
          <div className="lt-skel" style={{ height: 150, marginTop: 12, borderRadius: 'var(--r-md)' }} />
        </div>
      ) : (
        <div className="lt-remind-body">
          {blocked ? (
            <p id={noteId} className="lt-remind-blocked" role="status"><Icon name="alert" size={16} /> {blocked}</p>
          ) : askPhone ? (
            <div className="lt-remind-phone">
              <label htmlFor={`${phoneId}-in`} className="lt-flabel">Telefone de {firstName(name)}</label>
              <input
                ref={phoneRef}
                id={`${phoneId}-in`}
                className="lt-remind-phone-in"
                type="tel"
                inputMode="tel"
                autoComplete="off"
                placeholder="(11) 98765-4321"
                value={phone}
                aria-invalid={!!phoneErr || undefined}
                aria-describedby={phoneId}
                onChange={(e) => {
                  setPhone(maskPhone(e.target.value))
                  if (phoneErr) setPhoneErr('')
                }}
                onBlur={() => phone.trim() && setPhoneErr(phoneIssue(phone))}
              />
              <p id={phoneId} className={phoneErr ? 'lt-field-error' : 'lt-remind-info'} role={phoneErr ? 'alert' : undefined}>
                {phoneErr || (debtor.phone ? `O telefone cadastrado (${debtor.phone}) não serve para o WhatsApp. Corrija aqui; ele fica salvo no cadastro.` : 'Sem telefone no cadastro. Informe aqui: ele fica salvo para as próximas cobranças.')}
              </p>
            </div>
          ) : (
            <p className="lt-remind-info">
              Mensagem gerada com os valores atuais. Edite à vontade antes de enviar para <b>{fmtPhone(debtor.phone ?? '')}</b>.
            </p>
          )}
          {debtor.notes && (
            <p className="lt-remind-note"><Icon name="bulb" size={16} /><span>“{debtor.notes}”</span></p>
          )}
          {items.length > 0 && settings && 'chargeTone' in settings && (
            <p className="lt-remind-tone">
              Modelo: {toneLabel(settings?.chargeTone)} ·{' '}
              <button type="button" className="lt-more-link" onClick={() => { onClose(); navigate('/settings#mensagem') }}>Mudar em Configurações</button>
            </p>
          )}
          {items.length > 0 && (
            <textarea className="lt-remind-text" value={text} onChange={(e) => setText(e.target.value)} aria-label="Mensagem" rows={9} />
          )}
          {items.length > 0 &&
            (pix ? (
              <button type="button" role="switch" aria-checked={withPix} aria-label="Incluir Pix copia e cola" aria-describedby={pixHintId} className="lt-switch-row" onClick={togglePix}>
                <span style={{ flex: 1, textAlign: 'left' }}>
                  <span className="lt-switch-t">Incluir Pix copia e cola</span>
                  <span className="lt-switch-s" id={pixHintId}>Com o valor exato, para a pessoa só colar no app do banco</span>
                </span>
                <span className="lt-switch" aria-hidden="true"><span /></span>
              </button>
            ) : (
              <p className="lt-remind-hint">Cadastre sua chave Pix em Configurações para incluir o “copia e cola”.</p>
            ))}
        </div>
      )}
    </Modal>
  )
}
