import { useEffect, useId, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon } from '../ui/Icon'
import { LinkButton } from '../ui/LinkButton'
import { authApi } from '../../api/auth.api'
import { useAuth } from '../../contexts/AuthContext'
import { useCooldown } from '../../hooks/useCooldown'
import { getApiError } from '../../lib/api'
import { inboxUrl } from '../../lib/mailApp'
import { takeReturnPath } from '../../lib/returnPath'

interface CheckEmailProps {
  email: string
  /** LOGIN: "Entrar" (POST /auth/verify-code). CONFIRMATION: new account (POST /auth/confirm-code, also logs in). */
  type: 'LOGIN' | 'CONFIRMATION'
  /** Sends the e-mail again (link + code). */
  onResend: () => Promise<unknown>
  onOtherEmail: () => void
}

const fmtCountdown = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

/**
 * "Confira seu e-mail" (improvement 44): the address, a 6-digit code field
 * (numeric keyboard, one-time-code autofill, enters by itself when
 * complete), "Abrir app de e-mail" for the big webmails, "Reenviar em 0:42"
 * and "Usar outro e-mail". The link in the e-mail keeps working.
 */
export function CheckEmail({ email, type, onResend, onOtherEmail }: CheckEmailProps) {
  const navigate = useNavigate()
  const { authenticate } = useAuth()
  const [code, setCode] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [resent, setResent] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  const errId = useId()
  const { cooldown, start } = useCooldown(60, `lt_cd_${type.toLowerCase()}_resend`)
  const inbox = inboxUrl(email)

  // The e-mail was just sent: the resend countdown starts now.
  useEffect(() => {
    start()
    input.current?.focus()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const submit = async (value: string) => {
    if (busy || value.length !== 6) return
    setBusy(true)
    setErr('')
    try {
      const call = type === 'LOGIN' ? authApi.verifyCode : authApi.confirmCode
      const { data } = await call({ email, code: value })
      authenticate(data.accessToken, { id: data.lender.id, email: data.lender.email, name: data.lender.name ?? null })
      navigate(takeReturnPath() ?? '/dashboard', { replace: true })
    } catch (e) {
      const msg = getApiError(e)
      setErr(
        msg === 'Too many attempts. Request a new code'
          ? 'Muitas tentativas. Toque em “Reenviar” para receber um código novo.'
          : msg === 'Invalid or expired code'
            ? 'Código incorreto ou expirado. Confira e tente de novo.'
            : 'Não foi possível entrar agora. Tente de novo.',
      )
      setCode('')
      input.current?.focus()
    } finally {
      setBusy(false)
    }
  }

  const resend = async () => {
    if (cooldown > 0) return
    start()
    setErr('')
    setCode('')
    try {
      await onResend()
      setResent(true)
    } catch {
      setErr('Não foi possível reenviar agora. Tente de novo em instantes.')
    }
  }

  return (
    <>
      <div className="lt-auth-ic" aria-hidden="true"><Icon name="mail" size={26} /></div>
      <h1 className="lt-auth-h">Confira seu e-mail</h1>
      <p className="lt-auth-p">
        Enviamos {type === 'LOGIN' ? 'um link' : 'um link de confirmação'} para <b>{email}</b>. Toque nele neste aparelho ou digite o código:
      </p>
      <label className="lt-sr-only" htmlFor="auth-code">Código de 6 dígitos</label>
      <input
        ref={input}
        id="auth-code"
        className="lt-code-input"
        data-invalid={!!err || undefined}
        value={code}
        onChange={(e) => {
          const v = e.target.value.replace(/\D/g, '').slice(0, 6)
          setCode(v)
          setErr('')
          if (v.length === 6) void submit(v)
        }}
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        placeholder="••••••"
        aria-invalid={!!err || undefined}
        aria-describedby={err ? errId : undefined}
        disabled={busy}
      />
      <div id={errId} className="lt-auth-err" role="alert">
        {err && (
          <>
            <Icon name="alert" size={14} /> {err}
          </>
        )}
      </div>
      <button type="button" className="lt-btn-lg" data-variant="primary" style={{ width: '100%' }} onClick={() => void submit(code)} disabled={busy || code.length !== 6}>
        {busy ? 'Entrando…' : 'Entrar'}
      </button>
      <div className="lt-auth-links">
        {inbox && (
          <a className="lt-auth-link lt-mobile-only" href={inbox} target="_blank" rel="noopener noreferrer">
            <Icon name="mail" size={14} /> Abrir app de e-mail
          </a>
        )}
        <LinkButton onClick={() => void resend()} disabled={cooldown > 0} aria-live="polite">
          {cooldown > 0 ? `Reenviar em ${fmtCountdown(cooldown)}` : 'Reenviar'}
        </LinkButton>
        <LinkButton onClick={onOtherEmail}>Usar outro e-mail</LinkButton>
      </div>
      {resent && cooldown > 0 && <p className="lt-auth-note" role="status">Enviamos um novo e-mail. O código anterior deixou de valer.</p>}
      <p className="lt-auth-note">O link e o código valem por 15 minutos e funcionam uma vez.</p>
    </>
  )
}
