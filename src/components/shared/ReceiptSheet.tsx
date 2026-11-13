import { useMemo, useRef, useState } from 'react'
import { Modal } from '../ui/Modal'
import { Icon } from '../ui/Icon'
import { Money } from '../ui/Money'
import { useDebtor } from '../../hooks/debtors/useDebtor'
import { useDebtsByDebtor } from '../../hooks/debts/useDebtsByDebtor'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { buildReceipt, receiptText, type ReceiptRequest } from '../../lib/receipt'
import { shareOrDownload } from '../../lib/receiptImage'
import { whatsappLink } from '../../lib/whatsapp'

interface ReceiptSheetProps {
  /** Which receipt; null closes the sheet. */
  request: ReceiptRequest | null
  onClose: () => void
}

/**
 * "Comprovante" (S6, improvements 37 and 54): a receipt-shaped card with
 * "Enviar no WhatsApp" (ready text) and "Imagem" (PNG: share sheet on
 * phones, download elsewhere). Built from the debtor's debts, no backend.
 */
export function ReceiptSheet({ request, onClose }: ReceiptSheetProps) {
  const last = useRef(request)
  if (request) last.current = request
  const req = request ?? last.current
  const debtorId = req?.debtorId ?? ''

  const { lender } = useAuth()
  const { showToast } = useToast()
  const { data: debtor } = useDebtor(debtorId)
  const { data: debts } = useDebtsByDebtor(debtorId)
  const [busy, setBusy] = useState(false)

  const r = useMemo(
    () => (req && debts && debtor ? buildReceipt(debts, req, { from: debtor.name, to: lender?.name ?? '' }) : null),
    [req, debts, debtor, lender?.name],
  )
  const text = r ? receiptText(r) : ''
  const wa = r && debtor ? whatsappLink(debtor.phone, text) : null

  const image = async () => {
    if (!r || busy) return
    setBusy(true)
    try {
      const how = await shareOrDownload(r, text)
      if (how === 'downloaded') showToast('Imagem do comprovante baixada', { icon: 'check' })
    } catch {
      showToast('Não foi possível gerar a imagem.', { icon: 'alert' })
    } finally {
      setBusy(false)
    }
  }

  const loading = !!req && (!debts || !debtor)

  return (
    <Modal
      open={!!request}
      onClose={onClose}
      title="Comprovante"
      footer={
        r ? (
          <>
            {wa && (
              <button
                type="button"
                className="lt-btn-lg"
                data-variant="wa"
                onClick={() => {
                  window.open(wa, '_blank', 'noopener,noreferrer')
                  onClose()
                }}
              >
                <Icon name="whatsapp" size={16} /> Enviar no WhatsApp
              </button>
            )}
            <button
              type="button"
              className="lt-btn-lg"
              data-variant="secondary"
              style={wa ? { flex: '0 0 auto' } : undefined}
              onClick={() => void image()}
              disabled={busy}
              aria-label="Compartilhar ou baixar a imagem do comprovante"
            >
              <Icon name="send" size={15} /> Imagem
            </button>
          </>
        ) : undefined
      }
    >
      {loading ? (
        <div aria-busy="true">
          <span className="lt-sr-only">Montando o comprovante…</span>
          <div className="lt-skel" style={{ height: 320, borderRadius: 18 }} />
        </div>
      ) : !r ? (
        <p className="lt-remind-info">Não encontramos esse pagamento. Ele pode ter sido desfeito.</p>
      ) : (
        <article className="lt-rcpt" aria-label={`${r.title} ${r.code}`}>
          <div className="lt-rcpt-top">
            <span className="lt-rcpt-logo" aria-hidden="true">50¢</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="lt-rcpt-title">{r.title}</div>
              <div className="lt-rcpt-code">{r.code}</div>
            </div>
            <span className="lt-rcpt-pill"><Icon name="check" size={11} strokeWidth={3} /> {r.kind === 'payoff' ? 'Quitada' : 'Recebido'}</span>
          </div>
          <div className="lt-rcpt-amt"><Money value={r.totalCents / 100} size={34} /></div>
          <div className="lt-rcpt-date">{r.date}</div>
          <div className="lt-rcpt-cut" aria-hidden="true" />
          <dl className="lt-rcpt-dl">
            <div><dt>De</dt><dd>{r.from}</dd></div>
            <div><dt>Para</dt><dd>{r.to}</dd></div>
            {r.kind === 'payoff' && <div><dt>Dívida</dt><dd>{r.ref}</dd></div>}
            {r.items ? (
              <div className="lt-rcpt-items">
                <dt>{r.kind === 'payoff' ? 'Pagamentos' : 'Referente a'}</dt>
                {r.items.map((it) => (
                  <dd key={it.ref}>
                    <span>{it.ref}{it.status && <span className="lt-rcpt-st"> · {it.status}</span>}</span>
                    <span>{it.amount}</span>
                  </dd>
                ))}
              </div>
            ) : (
              <>
                <div><dt>Referente a</dt><dd>{r.ref}</dd></div>
                <div><dt>Parcela</dt><dd style={{ color: r.installment === 'Quitada' ? 'var(--paid)' : 'var(--partial)' }}>{r.installment}</dd></div>
              </>
            )}
            <div>
              <dt>{r.kind === 'payoff' ? 'Situação' : r.kind === 'batch' ? 'Saldo em aberto' : 'Saldo da dívida'}</dt>
              <dd style={{ color: r.balance === 'Quitada' ? 'var(--paid)' : undefined }}>{r.balance === 'Quitada' ? '✓ Quitada' : r.balance}</dd>
            </div>
          </dl>
          <div className="lt-rcpt-foot">Gerado por Pague os 50 centavos · não é documento fiscal</div>
        </article>
      )}
    </Modal>
  )
}
