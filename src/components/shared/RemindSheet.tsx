import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Modal } from '../ui/Modal'
import { Icon } from '../ui/Icon'
import { useDebtor } from '../../hooks/debtors/useDebtor'
import { useDebtsByDebtor } from '../../hooks/debts/useDebtsByDebtor'
import { useSettings } from '../../hooks/settings/useSettings'
import { useAuth } from '../../contexts/AuthContext'
import { localToday } from '../../lib/date'
import { brCode } from '../../lib/pix'
import { pixBlock, reminderItems, reminderText, reminderTotal } from '../../lib/reminder'
import { whatsappLink } from '../../lib/whatsapp'
import { fmtPhone } from '../../lib/format'

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
  const { data: settings } = useSettings({ enabled: !!id })

  const items = useMemo(() => (debts ? reminderItems(debts, today) : []), [debts, today])
  const total = reminderTotal(items)
  const pix = settings?.pixKey && total > 0 ? pixBlock(brCode({ key: settings.pixKey, name: lender?.name ?? '', amount: total / 100 }), total) : ''

  const [text, setText] = useState('')
  const [withPix, setWithPix] = useState(false)
  const ready = !!debtor && !!debts
  const noteId = useId()
  const pixHintId = useId()

  // Fresh message each time the sheet opens for someone (and once the data arrives).
  useEffect(() => {
    if (!debtorId || !ready) return
    setText(items.length ? reminderText(firstName(debtor.name), items) : '')
    setWithPix(false)
  }, [debtorId, ready]) // eslint-disable-line react-hooks/exhaustive-deps

  // Toggling Pix adds / removes only its block, keeping the user's edits.
  const togglePix = () => {
    if (!pix) return
    setText((t) => (withPix ? t.replace(pix, '') : t + pix))
    setWithPix((v) => !v)
  }

  const name = debtor?.name ?? ''
  const link = debtor ? whatsappLink(debtor.phone, text) : null
  const blocked = !ready ? '' : !debtor.phone ? 'Cadastre o telefone para lembrar pelo WhatsApp.' : !link ? 'O telefone cadastrado não parece válido para o WhatsApp.' : !items.length ? 'Não há nada em aberto para cobrar.' : ''

  return (
    <Modal
      open={!!debtorId}
      onClose={onClose}
      title={name ? `Lembrar ${firstName(name)}` : 'Lembrar no WhatsApp'}
      head={(titleId, close) => (
        <div className="lt-remind-head">
          <span style={{ color: 'var(--wa)', display: 'inline-flex' }} aria-hidden="true"><Icon name="whatsapp" size={20} /></span>
          <h2 id={titleId} className="lt-remind-title">{name ? `Lembrar ${firstName(name)}` : 'Lembrar no WhatsApp'}</h2>
          <button type="button" className="lt-icon-close" aria-label="Fechar" onClick={close}><Icon name="x" size={18} /></button>
        </div>
      )}
      footer={
        <button
          type="button"
          className="lt-btn-lg"
          data-variant="wa"
          disabled={!link || !items.length || !text.trim()}
          aria-describedby={blocked ? noteId : undefined}
          onClick={() => {
            if (!link) return
            window.open(link, '_blank', 'noopener,noreferrer')
            onClose()
          }}
        >
          <Icon name="send" size={16} /> Abrir WhatsApp
        </button>
      }
    >
      {!ready ? (
        <div aria-busy="true" style={{ paddingTop: 4 }}>
          <span className="lt-sr-only">Montando a mensagem…</span>
          <div className="lt-skel" style={{ height: 14, width: '80%' }} />
          <div className="lt-skel" style={{ height: 150, marginTop: 12, borderRadius: 14 }} />
        </div>
      ) : (
        <div className="lt-remind-body">
          {blocked ? (
            <p id={noteId} className="lt-remind-blocked" role="status"><Icon name="alert" size={15} /> {blocked}</p>
          ) : (
            <p className="lt-remind-info">
              Mensagem gerada com os valores atuais. Edite à vontade antes de enviar para <b>{fmtPhone(debtor.phone ?? '')}</b>.
            </p>
          )}
          {debtor.notes && (
            <p className="lt-remind-note"><Icon name="bulb" size={15} /><span>“{debtor.notes}”</span></p>
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
