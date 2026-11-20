import { useState } from 'react'
import { Modal } from '../ui/Modal'
import { Icon } from '../ui/Icon'
import { Segmented } from '../ui/Segmented'
import { useToast } from '../../contexts/ToastContext'
import { brCode } from '../../lib/pix'
import { formatCents, parseCurrencyDigits } from '../../lib/currency'
import { fmtMoney } from '../../lib/format'
import { supportPix } from '../../lib/support'
import { PixQr } from './PixQr'

const AMOUNTS: { id: string; label: string; value: number }[] = [
  { id: '5', label: 'R$ 5', value: 5 },
  { id: '10', label: 'R$ 10', value: 10 },
  { id: '20', label: 'R$ 20', value: 20 },
]

/**
 * Apoie o projeto (S11, improvement 51): a short sheet, only for who opens it —
 * R$ 5 · 10 · 20 · Outro and the Pix code with that amount (same BR Code
 * generator as the reminders). "Copiar código Pix" serves who is on the phone
 * itself (a screen cannot scan itself). No pop-ups, banners or reminders.
 */
export function SupportSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { showToast } = useToast()
  const [pick, setPick] = useState('10')
  const [cents, setCents] = useState('')
  const value = pick === 'other' ? parseInt(cents || '0', 10) / 100 : (AMOUNTS.find((a) => a.id === pick)?.value ?? 0)
  const code = value > 0 && supportPix() ? brCode({ key: supportPix(), name: 'PAGUE 50 CENTAVOS', city: 'SAO PAULO', amount: value, txid: 'CAFE' }) : ''

  const copy = () => {
    if (!code) return
    void navigator.clipboard?.writeText(code).then(
      () => showToast('Código Pix copiado · cole no app do banco', { icon: 'check' }),
      () => showToast('Não foi possível copiar. Selecione o código e copie.', { icon: 'alert' }),
    )
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Apoie o projeto"
      footer={
        <button type="button" className="lt-btn-lg" data-variant="secondary" onClick={copy} disabled={!code}>
          <Icon name="copy" size={16} /> Copiar código Pix
        </button>
      }
    >
      <div className="lt-df">
        <div className="lt-coffee-hero">
          <span className="lt-coffee-ic" aria-hidden="true"><Icon name="coffee" size={26} /></span>
          <p className="lt-del-p" style={{ padding: 0 }}>
            O Pague os 50 centavos é gratuito e sem anúncios. Se ele te ajuda a receber, que tal pagar um café para quem desenvolve?
          </p>
        </div>
        <div>
          <div className="lt-flabel" id="coffee-v-l">Valor</div>
          <Segmented
            labelledBy="coffee-v-l"
            value={pick}
            options={[...AMOUNTS.map((a) => ({ value: a.id, label: a.label })), { value: 'other', label: 'Outro' }]}
            onChange={setPick}
          />
          {pick === 'other' && (
            <label className="lt-coffee-other">
              <span className="lt-sr-only">Outro valor</span>
              <span aria-hidden="true">R$</span>
              <input value={formatCents(cents)} onChange={(e) => setCents(parseCurrencyDigits(e.target.value))} inputMode="numeric" placeholder="0,00" autoFocus />
            </label>
          )}
        </div>
        <div className="lt-coffee-qr" data-empty={!code || undefined}>
          {code ? (
            <>
              <PixQr code={code} label={`QR Code Pix de ${fmtMoney(value)} para apoiar o projeto`} />
              <div className="lt-set-t" style={{ marginTop: 8 }}>Pix · {fmtMoney(value)}</div>
              <div className="lt-set-s">No app do banco: Pix → Ler QR Code</div>
              <code className="lt-coffee-code">{code}</code>
            </>
          ) : (
            <div className="lt-set-s">Digite um valor para gerar o código Pix</div>
          )}
        </div>
      </div>
    </Modal>
  )
}
