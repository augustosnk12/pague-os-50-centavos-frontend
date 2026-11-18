import { useId, useRef, useState } from 'react'
import { Modal } from '../../components/ui/Modal'
import { Icon } from '../../components/ui/Icon'
import { useToast } from '../../contexts/ToastContext'
import { useAuth } from '../../contexts/AuthContext'
import { useAccountSummary } from '../../hooks/account/useAccountSummary'
import { meApi, type AccountSummary } from '../../api/me.api'
import { getApiError } from '../../lib/api'
import { localToday } from '../../lib/date'
import { maskEmail } from '../../lib/mailApp'

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

function Counts({ s }: { s: AccountSummary | undefined }) {
  if (!s) return <div className="lt-skel" style={{ height: 74, borderRadius: 12 }} aria-busy="true" />
  return (
    <ul className="lt-data-counts">
      <li><b>{s.debtors}</b> {s.debtors === 1 ? 'devedor' : 'devedores'}</li>
      <li><b>{s.debts}</b> {s.debts === 1 ? 'dívida' : 'dívidas'}</li>
      <li><b>{s.installments}</b> {s.installments === 1 ? 'parcela' : 'parcelas'}</li>
      <li><b>{s.payments}</b> {s.payments === 1 ? 'pagamento' : 'pagamentos'}</li>
    </ul>
  )
}

type Format = 'zip' | 'json'

/**
 * Baixar meus dados (S11, improvement 55): what goes in the file (with counts)
 * and the format — spreadsheets (.zip, one CSV per subject) or JSON.
 */
export function DataSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { showToast } = useToast()
  const summary = useAccountSummary({ enabled: open })
  const [format, setFormat] = useState<Format>('zip')
  const [busy, setBusy] = useState(false)

  const download = async () => {
    setBusy(true)
    try {
      const { data } = await meApi.export(format)
      const name = `pague50-dados-${localToday()}.${format}`
      const url = URL.createObjectURL(data)
      const a = document.createElement('a')
      a.href = url
      a.download = name
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      onClose()
      showToast(`Dados baixados · ${name}`, { icon: 'download' })
    } catch {
      showToast('Não foi possível baixar agora. Tente de novo.', { icon: 'alert' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Baixar meus dados"
      footer={
        <button type="button" className="lt-btn-lg" data-variant="primary" onClick={() => void download()} disabled={busy}>
          <Icon name="download" size={16} /> {busy ? 'Preparando…' : 'Baixar'}
        </button>
      }
    >
      <div className="lt-df">
        <p className="lt-del-p">Uma cópia de tudo o que está na sua conta:</p>
        <Counts s={summary.data} />
        <div>
          <div className="lt-flabel" id="data-fmt-l">Formato</div>
          <div className="lt-data-fmts" role="radiogroup" aria-labelledby="data-fmt-l">
            {([['zip', 'Planilhas (.zip)', 'Um arquivo CSV por assunto; abre no Excel'], ['json', 'JSON', 'Cópia completa, para backup']] as [Format, string, string][]).map(([id, t, s]) => (
              <button key={id} type="button" role="radio" aria-checked={format === id} aria-label={`${t}: ${s}`} className="lt-data-fmt" onClick={() => setFormat(id)}>
                <span className="lt-data-radio" aria-hidden="true" />
                <span><span className="lt-set-t">{t}</span><span className="lt-set-s" style={{ display: 'block' }}>{s}</span></span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  )
}

/**
 * Excluir conta (S11, improvement 55): explains it deletes everything (with
 * counts), offers to download the data first, then asks for the code e-mailed
 * to you — the same no-password flow as the login.
 */
export function DeleteAccountSheet({ open, onClose, onDownloadFirst, onDeleted }: {
  open: boolean
  onClose: () => void
  onDownloadFirst: () => void
  onDeleted: () => void
}) {
  const { lender } = useAuth()
  const summary = useAccountSummary({ enabled: open })
  const [step, setStep] = useState<'intro' | 'code'>('intro')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const input = useRef<HTMLInputElement>(null)
  const errId = useId()
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      setStep('intro')
      setCode('')
      setErr('')
    }
  }

  const sendCode = async () => {
    setBusy(true)
    setErr('')
    try {
      await meApi.deleteCode()
      setStep('code')
      requestAnimationFrame(() => input.current?.focus())
    } catch {
      setErr('Não foi possível enviar o código agora. Tente de novo em instantes.')
    } finally {
      setBusy(false)
    }
  }

  const confirm = async (value: string) => {
    if (busy || value.length !== 6) return
    setBusy(true)
    setErr('')
    try {
      await meApi.deleteAccount(value)
      onDeleted()
    } catch (e) {
      const msg = getApiError(e)
      setErr(
        msg === 'Too many attempts. Request a new code'
          ? 'Muitas tentativas. Peça um código novo.'
          : msg === 'Invalid or expired code'
            ? 'Código incorreto ou expirado. Confira e tente de novo.'
            : 'Não foi possível excluir agora. Nada foi apagado.',
      )
      setCode('')
      input.current?.focus()
    } finally {
      setBusy(false)
    }
  }

  const s = summary.data
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Excluir conta"
      footer={
        step === 'intro' ? (
          <button type="button" className="lt-btn-lg" data-variant="danger" onClick={() => void sendCode()} disabled={busy}>
            {busy ? 'Enviando…' : 'Continuar'}
          </button>
        ) : (
          <button type="button" className="lt-btn-lg" data-variant="danger" onClick={() => void confirm(code)} disabled={busy || code.length !== 6}>
            <Icon name="trash" size={16} /> {busy ? 'Excluindo…' : 'Excluir conta'}
          </button>
        )
      }
    >
      <div className="lt-df">
        {step === 'intro' ? (
          <>
            <p className="lt-del-p">
              Isso apaga <b>em definitivo</b> a sua conta e tudo o que está nela. Não dá para desfazer.
            </p>
            <Counts s={s} />
            {s && s.debts + s.debtors > 0 && (
              <button type="button" className="lt-more-link" style={{ padding: 0, alignSelf: 'flex-start' }} onClick={onDownloadFirst}>
                <Icon name="download" size={14} /> Baixar meus dados antes
              </button>
            )}
            <p className="lt-set-note" style={{ margin: 0 }}>Para confirmar, vamos mandar um código para {lender ? <b>{maskEmail(lender.email)}</b> : 'o seu e-mail'}.</p>
          </>
        ) : (
          <>
            <p className="lt-del-p">Digite o código de 6 dígitos que enviamos para {lender ? <b>{maskEmail(lender.email)}</b> : 'o seu e-mail'}.</p>
            <label className="lt-sr-only" htmlFor="del-code">Código de 6 dígitos</label>
            <input
              ref={input}
              id="del-code"
              className="lt-code-input"
              data-invalid={!!err || undefined}
              value={code}
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, '').slice(0, 6)
                setCode(v)
                setErr('')
              }}
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="••••••"
              aria-invalid={!!err || undefined}
              aria-describedby={err ? errId : undefined}
              disabled={busy}
            />
          </>
        )}
        <div id={errId} className="lt-auth-err" role="alert">
          {err && (
            <>
              <Icon name="alert" size={14} /> {err}
            </>
          )}
        </div>
        {step === 'code' && s && (
          <p className="lt-set-note" style={{ margin: 0 }}>
            Serão apagados {plural(s.debtors, 'devedor', 'devedores')}, {plural(s.debts, 'dívida', 'dívidas')} e {plural(s.payments, 'pagamento', 'pagamentos')}.
          </p>
        )}
      </div>
    </Modal>
  )
}
