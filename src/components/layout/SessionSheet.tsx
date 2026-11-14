import { useEffect, useId, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Modal } from '../ui/Modal'
import { Icon } from '../ui/Icon'
import { useAuth } from '../../contexts/AuthContext'
import { authApi } from '../../api/auth.api'
import { getApiError } from '../../lib/api'
import { onSessionExpired } from '../../lib/session'
import { maskEmail } from '../../lib/mailApp'

/**
 * "Sua sessão expirou" (improvement 47): log in again without leaving the
 * screen — a code goes to the e-mail, and after it everything reloads where
 * you were (whatever was typed on the screen stays).
 */
export function SessionSheet() {
  const { lender, authenticate, logout } = useAuth()
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<'ask' | 'code'>('ask')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const input = useRef<HTMLInputElement>(null)
  const errId = useId()
  const email = lender?.email ?? ''

  useEffect(() => {
    onSessionExpired(() => setOpen(true))
    return () => onSessionExpired(null)
  }, [])

  useEffect(() => {
    if (step === 'code') input.current?.focus()
  }, [step])

  const send = async () => {
    setBusy(true)
    setErr('')
    try {
      await authApi.login({ email })
      setStep('code')
    } catch {
      setErr('Não foi possível enviar agora. Tente de novo.')
    } finally {
      setBusy(false)
    }
  }

  const submit = async (value: string) => {
    if (busy || value.length !== 6) return
    setBusy(true)
    setErr('')
    try {
      const { data } = await authApi.verifyCode({ email, code: value })
      authenticate(data.accessToken, { id: data.lender.id, email: data.lender.email, name: data.lender.name ?? null })
      setOpen(false)
      setStep('ask')
      setCode('')
      // Back where you were: everything that failed loads again.
      void qc.invalidateQueries()
    } catch (e) {
      const msg = getApiError(e)
      setErr(msg === 'Too many attempts. Request a new code' ? 'Muitas tentativas. Peça um código novo.' : 'Código incorreto ou expirado. Confira e tente de novo.')
      setCode('')
      input.current?.focus()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => setOpen(false)}
      title="Sua sessão expirou"
      footer={
        step === 'ask' ? (
          <button type="button" className="lt-btn-lg" data-variant="primary" onClick={() => void send()} disabled={busy || !email}>
            <Icon name="mail" size={16} /> {busy ? 'Enviando…' : 'Enviar código'}
          </button>
        ) : (
          <button type="button" className="lt-btn-lg" data-variant="primary" onClick={() => void submit(code)} disabled={busy || code.length !== 6}>
            {busy ? 'Entrando…' : 'Entrar'}
          </button>
        )
      }
    >
      <div className="lt-df">
        <p className="lt-del-p">
          {step === 'ask' ? (
            <>Entre de novo; depois você volta para esta tela, sem perder o que estava nela. Vamos mandar um código para <b>{maskEmail(email)}</b>.</>
          ) : (
            <>Digite o código de 6 dígitos que enviamos para <b>{maskEmail(email)}</b>.</>
          )}
        </p>
        {step === 'code' && (
          <>
            <label className="lt-sr-only" htmlFor="session-code">Código de 6 dígitos</label>
            <input
              ref={input}
              id="session-code"
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
          </>
        )}
        <div id={errId} className="lt-auth-err" role="alert">
          {err && (
            <>
              <Icon name="alert" size={14} /> {err}
            </>
          )}
        </div>
        <button type="button" className="lt-more-link" style={{ padding: 0, alignSelf: 'flex-start' }} onClick={logout}>
          Sair e entrar com outra conta
        </button>
      </div>
    </Modal>
  )
}
