import { useId, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AuthShell } from '../../components/auth/AuthShell'
import { CheckEmail } from '../../components/auth/CheckEmail'
import { Icon } from '../../components/ui/Icon'
import { LinkButton } from '../../components/ui/LinkButton'
import { authApi } from '../../api/auth.api'
import { useLogin } from '../../hooks/auth/useLogin'
import { translateApiError } from '../../lib/utils'
import { validEmail } from '../../lib/validation'
import { getApiError } from '../../lib/api'
import { maskEmail } from '../../lib/mailApp'

/** Last address used on this device, for "Enviar um novo para …" on the expired-link screen. */
const LAST_EMAIL = 'pague50_last_email'
const readLast = () => {
  try {
    return localStorage.getItem(LAST_EMAIL) ?? ''
  } catch {
    return ''
  }
}
const saveLast = (email: string) => {
  try {
    localStorage.setItem(LAST_EMAIL, email)
  } catch {
    // private mode: fine
  }
}

/** API errors that mean "this link no longer works" (expired or already used). */
const EXPIRED = ['Invalid or expired token', 'Token expired', 'Invalid token type']

type Step = 'form' | 'sent' | 'confirm' | 'expired'

/**
 * Entrar (S13, improvement 44): only the e-mail; then "Confira seu e-mail"
 * with the code. A link that expired gets its own screen with "Enviar um
 * novo". An unconfirmed account is sent a new confirmation (code + link).
 */
export function LoginPage() {
  const [params] = useSearchParams()
  const urlError = params.get('error') ? decodeURIComponent(params.get('error')!) : ''
  const [step, setStep] = useState<Step>(EXPIRED.includes(urlError) ? 'expired' : 'form')
  const [email, setEmail] = useState(readLast)
  const [err, setErr] = useState('')
  const [unconfirmed, setUnconfirmed] = useState(false)
  const login = useLogin()
  const errId = useId()

  const confirmed = params.get('confirmed') === 'true'
  const sessionExpired = params.get('expired') === '1'

  const send = (to = email) => {
    setErr('')
    setUnconfirmed(false)
    const address = to.trim()
    if (!validEmail(address)) return setErr('E-mail inválido. Confira o endereço.')
    login.mutate(
      { email: address },
      {
        onSuccess: () => {
          saveLast(address)
          setEmail(address)
          setStep('sent')
        },
        onError: (e: unknown) => {
          const msg = getApiError(e)
          setUnconfirmed(msg === 'Account not confirmed')
          setErr(translateApiError(msg, 'Não foi possível enviar agora. Tente de novo.'))
        },
      },
    )
  }

  const sendConfirmation = async () => {
    await authApi.resendConfirmation({ email: email.trim() })
    saveLast(email.trim())
    setStep('confirm')
  }

  if (step === 'sent' || step === 'confirm') {
    return (
      <AuthShell>
        <CheckEmail
          email={email}
          type={step === 'sent' ? 'LOGIN' : 'CONFIRMATION'}
          onResend={() => (step === 'sent' ? authApi.login({ email }) : authApi.resendConfirmation({ email }))}
          onOtherEmail={() => {
            setStep('form')
            setErr('')
          }}
        />
      </AuthShell>
    )
  }

  if (step === 'expired') {
    const last = readLast()
    return (
      <AuthShell>
        <div className="lt-auth-ic" data-tone="warn" aria-hidden="true"><Icon name="alert" size={26} /></div>
        <h1 className="lt-auth-h">Esse link expirou</h1>
        <p className="lt-auth-p">Links e códigos de acesso valem por 15 minutos e só funcionam uma vez.</p>
        {last ? (
          <button type="button" className="lt-btn-lg" data-variant="primary" style={{ width: '100%' }} onClick={() => send(last)} disabled={login.isPending}>
            <Icon name="mail" size={16} /> {login.isPending ? 'Enviando…' : `Enviar um novo para ${maskEmail(last)}`}
          </button>
        ) : (
          <button type="button" className="lt-btn-lg" data-variant="primary" style={{ width: '100%' }} onClick={() => setStep('form')}>
            <Icon name="mail" size={16} /> Pedir um novo link
          </button>
        )}
        {err && <div className="lt-auth-err" role="alert"><Icon name="alert" size={14} /> {err}</div>}
        <div className="lt-auth-links">
          <LinkButton onClick={() => { setEmail(''); setStep('form') }}>Usar outro e-mail</LinkButton>
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell>
      {confirmed && (
        <div className="lt-auth-banner" data-tone="ok" role="status"><Icon name="check" size={16} strokeWidth={2.6} /> Conta confirmada! Agora é só entrar.</div>
      )}
      {sessionExpired && !urlError && (
        <div className="lt-auth-banner" data-tone="warn" role="status"><Icon name="alert" size={16} /> Sua sessão expirou. Entre de novo e você volta para onde estava.</div>
      )}
      {urlError && !EXPIRED.includes(urlError) && (
        <div className="lt-auth-banner" data-tone="error" role="alert"><Icon name="alert" size={16} /> {translateApiError(urlError)}</div>
      )}
      <h1 className="lt-auth-h">Entrar</h1>
      <p className="lt-auth-p">Sem senha: enviamos um link e um código para o seu e-mail.</p>
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault()
          send()
        }}
      >
        <label className="lt-field-label" htmlFor="auth-email">E-mail</label>
        <input
          id="auth-email"
          className="lt-auth-input"
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value)
            setErr('')
          }}
          placeholder="voce@email.com"
          maxLength={254}
          aria-invalid={!!err || undefined}
          aria-describedby={err ? errId : undefined}
          autoFocus
        />
        <div id={errId} className="lt-auth-err" role="alert">
          {err && <><Icon name="alert" size={14} /> {err}</>}
        </div>
        <button type="submit" className="lt-btn-lg" data-variant="primary" style={{ width: '100%' }} disabled={login.isPending}>
          <Icon name="mail" size={16} /> {login.isPending ? 'Enviando…' : 'Enviar link de acesso'}
        </button>
      </form>
      {unconfirmed && (
        <div className="lt-auth-links">
          <LinkButton onClick={() => void sendConfirmation()}>Reenviar a confirmação da conta</LinkButton>
        </div>
      )}
      <div className="lt-auth-links">
        <span className="lt-auth-muted">Ainda não tem conta?</span>
        <Link to="/register" className="lt-auth-link">Criar conta</Link>
      </div>
    </AuthShell>
  )
}
