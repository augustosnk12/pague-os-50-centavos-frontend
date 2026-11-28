import { useState } from 'react'
import { Modal } from '../ui/Modal'
import { Icon } from '../ui/Icon'
import { Segmented } from '../ui/Segmented'
import { PixQr } from './PixQr'
import { useToast } from '../../contexts/ToastContext'
import { batchCandidates } from '../../lib/batch'
import { brCode } from '../../lib/pix'
import { maskPixKey, PIX_TYPES } from '../../lib/pixKey'
import { pixOptions, type PixOption, type PixPick } from '../../lib/payPix'
import { localToday } from '../../lib/date'
import { fmtMoney } from '../../lib/format'
import type { Debtor } from '../../types/debtor'
import type { DebtWithInstallments } from '../../hooks/debts/useDebtsByDebtor'

interface PayPixSheetProps {
  open: boolean
  creditor: Debtor
  debts: DebtWithInstallments[]
  onClose: () => void
  /** No key yet: "Adicionar chave Pix" opens the creditor's form. */
  onAddKey: () => void
  /** "Já paguei · registrar": the installments the chosen amount pays. */
  onPaid: (option: PixOption) => void
}

const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? name

/**
 * "Pagar com Pix" (item 75), on a creditor's profile in place of "Cobrar":
 * Atrasado · Próxima · Tudo, then the creditor's key, the QR Code and the
 * copia e cola with that amount. The app does not pay: it prepares the Pix,
 * and "Já paguei · registrar" records it once paid in the bank.
 */
export function PayPixSheet({ open, creditor, debts, onClose, onAddKey, onPaid }: PayPixSheetProps) {
  const { showToast } = useToast()
  const options = pixOptions(batchCandidates(debts, localToday()))
  const [pick, setPick] = useState<PixPick>('late')
  const chosen = options.find((o) => o.id === pick) ?? options[0]
  const first = firstName(creditor.name)
  const key = creditor.pixKey && creditor.pixKeyType ? creditor.pixKey : ''
  const type = PIX_TYPES.find((x) => x.id === creditor.pixKeyType)
  const code = key && chosen ? brCode({ key, name: creditor.name, amount: chosen.cents / 100 }) : ''

  const copy = (text: string, done: string) =>
    void navigator.clipboard?.writeText(text).then(
      () => showToast(done, { icon: 'check' }),
      () => showToast('Não foi possível copiar. Selecione e copie.', { icon: 'alert' }),
    )

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Pagar ${first}`}
      footer={
        chosen && (
          <button type="button" className="lt-btn-lg" data-variant="primary" onClick={() => onPaid(chosen)}>
            <Icon name="check" size={16} /> Já paguei · registrar {fmtMoney(chosen.cents / 100)}
          </button>
        )
      }
    >
      <div className="lt-df">
        {options.length > 1 && (
          <Segmented
            label="Quanto pagar"
            className="lt-ppx-seg"
            value={chosen.id}
            onChange={setPick}
            options={options.map((o) => ({
              value: o.id,
              ariaLabel: `${o.label}, ${fmtMoney(o.cents / 100)}`,
              label: (
                <>
                  <span>{o.label}</span>
                  <span className="lt-ppx-v">{fmtMoney(o.cents / 100)}</span>
                </>
              ),
            }))}
          />
        )}

        {key ? (
          <>
            <div className="lt-ppx-key">
              <Icon name="zap" size={16} />
              <span className="lt-ppx-key-t">
                <span className="lt-ppx-key-l">Chave {type?.label ?? 'Pix'}</span>
                <span className="lt-ppx-key-v">{creditor.pixKeyType ? maskPixKey(creditor.pixKeyType, key) : key}</span>
              </span>
              <button type="button" className="lt-chip" onClick={() => copy(key, 'Chave Pix copiada')}>
                Copiar chave
              </button>
            </div>
            {chosen && (
              <div className="lt-coffee-qr">
                <PixQr code={code} label={`QR Code Pix de ${fmtMoney(chosen.cents / 100)} para ${creditor.name}`} />
                <div className="lt-set-t" style={{ marginTop: 8 }}>Pix · {fmtMoney(chosen.cents / 100)} · para {creditor.name}</div>
                <div className="lt-set-s">No app do banco: Pix → Ler QR Code</div>
              </div>
            )}
            {chosen && (
              <button type="button" className="lt-btn-lg" data-variant="secondary" onClick={() => copy(code, 'Código Pix copiado · cole no app do banco')}>
                <Icon name="copy" size={16} /> Copiar código Pix
              </button>
            )}
          </>
        ) : (
          <div className="lt-ppx-none" role="note">
            <span>{first} ainda não tem chave Pix cadastrada.</span>
            <button type="button" className="lt-more-link" style={{ padding: 0 }} onClick={onAddKey}>
              Adicionar chave Pix
            </button>
          </div>
        )}

        <p className="lt-set-note" style={{ margin: 0 }}>
          O app não faz o pagamento: ele só prepara o Pix. Depois de pagar no banco, registre aqui para a parcela sair da lista.
        </p>
      </div>
    </Modal>
  )
}
