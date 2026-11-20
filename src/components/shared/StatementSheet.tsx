import { useMemo, useRef, useState } from 'react'
import { Modal } from '../ui/Modal'
import { Icon } from '../ui/Icon'
import { Money } from '../ui/Money'
import { Segmented } from '../ui/Segmented'
import { StatusBadge } from '../ui/StatusBadge'
import { useDebtor } from '../../hooks/debtors/useDebtor'
import { useDebtsByDebtor } from '../../hooks/debts/useDebtsByDebtor'
import { useSettings } from '../../hooks/settings/useSettings'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { localToday } from '../../lib/date'
import { fmtBR, fmtMoney } from '../../lib/format'
import { brCode } from '../../lib/pix'
import { buildStatement, historyLine, rowText, statementPix, statementText, untilSuffix, type StatementUntil } from '../../lib/statement'
import { drawStatement } from '../../lib/statementImage'
import { shareImage } from '../../lib/receiptImage'
import { whatsappLink } from '../../lib/whatsapp'

const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? name
const money = (c: number) => fmtMoney(c / 100)
/** Rows per debt in the preview (the message lists all of them). */
const MAX_ROWS = 4

/** "extrato-joao.png": first name without accents. */
const fileName = (name: string) =>
  `extrato-${firstName(name).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '') || 'devedor'}.png`

function Seg<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div>
      <div className="lt-flabel" aria-hidden="true">{label}</div>
      <Segmented label={label} value={value} options={options.map(([v, l]) => ({ value: v, label: l }))} onChange={onChange} />
    </div>
  )
}

interface StatementSheetProps {
  /** Debtor of the extrato; null closes the sheet. */
  debtorId: string | null
  onClose: () => void
}

/**
 * "Enviar extrato" (S14, improvement 60): a preview of everything the person
 * owes, with "Enviar no WhatsApp" (ready text, Pix copia e cola when there is
 * a key) and "Imagem" (PNG like the receipt). Only front.
 */
export function StatementSheet({ debtorId, onClose }: StatementSheetProps) {
  const today = localToday()
  const issuedOn = fmtBR(today)
  const lastId = useRef(debtorId)
  if (debtorId) lastId.current = debtorId
  const id = debtorId ?? lastId.current ?? ''

  const { lender } = useAuth()
  const { showToast } = useToast()
  const { data: debtor } = useDebtor(id)
  const { data: debts } = useDebtsByDebtor(id)
  const { data: settings } = useSettings({ enabled: !!id })
  const [until, setUntil] = useState<StatementUntil>('all')
  const [history, setHistory] = useState(false)
  const [busy, setBusy] = useState(false)

  // Each opening starts from the defaults.
  const [wasOpen, setWasOpen] = useState(!!debtorId)
  if (!!debtorId !== wasOpen) {
    setWasOpen(!!debtorId)
    if (debtorId) {
      setUntil('all')
      setHistory(false)
    }
  }

  const s = useMemo(() => (debts ? buildStatement(debts, today, { until, history }) : null), [debts, today, until, history])
  const pix = s ? statementPix(s) : null
  const pixCode = pix && settings?.pixKey ? brCode({ key: settings.pixKey, name: lender?.name ?? '', amount: pix.cents / 100 }) : null
  const name = debtor?.name ?? ''
  const text = s && debtor ? statementText(name, issuedOn, s, pixCode) : ''
  const wa = debtor ? whatsappLink(debtor.phone, text) : null

  const image = async () => {
    if (!s || !debtor || busy) return
    setBusy(true)
    try {
      const how = await shareImage(() => drawStatement(name, issuedOn, s, !!pixCode), fileName(name), `Extrato de ${name}`, text)
      if (how === 'downloaded') showToast('Imagem do extrato baixada', { icon: 'check' })
    } catch {
      showToast('Não foi possível gerar a imagem.', { icon: 'alert' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={!!debtorId}
      onClose={onClose}
      title={name ? `Extrato de ${firstName(name)}` : 'Extrato'}
      footer={
        s && debtor ? (
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
              aria-label="Compartilhar ou baixar a imagem do extrato"
            >
              <Icon name="send" size={16} /> Imagem
            </button>
          </>
        ) : undefined
      }
    >
      {!s || !debtor ? (
        <div aria-busy="true">
          <span className="lt-sr-only">Montando o extrato…</span>
          <div className="lt-skel" style={{ height: 360, borderRadius: 'var(--r-lg)' }} />
        </div>
      ) : (
        <div className="lt-stmt">
          <div className="lt-stmt-opts">
            <Seg label="Parcelas" value={until} options={[['all', 'Todas em aberto'], ['month', 'Até o fim do mês']]} onChange={setUntil} />
            <Seg label="Pagamentos já feitos" value={history ? 'yes' : 'no'} options={[['no', 'Não mostrar'], ['yes', 'Mostrar o total pago']]} onChange={(v) => setHistory(v === 'yes')} />
          </div>
          <article className="lt-rcpt" aria-label="Prévia do extrato">
            <div className="lt-rcpt-top">
              <span className="lt-rcpt-logo" aria-hidden="true">50¢</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="lt-rcpt-title lt-ellipsis">Extrato de {name}</div>
                <div className="lt-rcpt-code">Emitido em {issuedOn}</div>
              </div>
            </div>
            {s.debts.length ? (
              <>
                <div className="lt-rcpt-amt"><Money value={s.totalCents / 100} size={30} /></div>
                <div className="lt-rcpt-date">em aberto{untilSuffix(s)}</div>
                {s.lateCents > 0 && (
                  <div className="lt-stmt-late"><StatusBadge tone="overdue" icon="alert">{money(s.lateCents)} em atraso</StatusBadge></div>
                )}
                <div className="lt-rcpt-cut" aria-hidden="true" />
                {s.debts.map((d) => (
                  <section key={d.id} className="lt-stmt-debt" aria-label={`${d.title}, ${money(d.leftCents)}`}>
                    <div className="lt-stmt-debt-h"><span className="lt-ellipsis">{d.title}</span><span>{money(d.leftCents)}</span></div>
                    {d.rows.slice(0, MAX_ROWS).map((r) => (
                      <div key={`${r.label}-${r.dueDate}`} className="lt-stmt-row" data-late={r.late || undefined}>
                        <span className="lt-stmt-d">{rowText(r)}</span>
                        <span>{money(r.cents)}</span>
                      </div>
                    ))}
                    {d.rows.length > MAX_ROWS && (
                      <div className="lt-stmt-more">
                        + {d.rows.length - MAX_ROWS} parcela{d.rows.length - MAX_ROWS > 1 ? 's' : ''} · {money(d.rows.slice(MAX_ROWS).reduce((t, r) => t + r.cents, 0))}
                      </div>
                    )}
                  </section>
                ))}
              </>
            ) : (
              <div className="lt-rcpt-amt lt-stmt-none">✓ Nada em aberto{untilSuffix(s)}</div>
            )}
            {s.history && s.paymentCount > 0 && (
              <div className="lt-stmt-hist"><Icon name="check" size={12} strokeWidth={3} /> {historyLine(s)}</div>
            )}
            {pix && pixCode ? (
              <div className="lt-stmt-pix">Pix copia e cola · {money(pix.cents)} ({pix.what})<code>{pixCode.slice(0, 46)}…</code></div>
            ) : (
              pix && <div className="lt-stmt-more" style={{ marginTop: 10 }}>Com a chave Pix em Configurações, o extrato leva o Pix copia e cola.</div>
            )}
            <div className="lt-rcpt-foot">Gerado por Pague os 50 centavos · não é documento fiscal</div>
          </article>
          {!wa && (
            <p className="lt-set-note" style={{ margin: 0 }}>
              {debtor.phone ? 'O telefone cadastrado não parece válido para o WhatsApp.' : 'Sem telefone cadastrado: envie a imagem por outro app.'}
            </p>
          )}
        </div>
      )}
    </Modal>
  )
}
