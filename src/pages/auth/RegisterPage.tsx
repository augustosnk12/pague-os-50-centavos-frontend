import { useId, useState } from 'react'
import { Link } from 'react-router-dom'
import { AuthShell } from '../../components/auth/AuthShell'
import { CheckEmail } from '../../components/auth/CheckEmail'
import { Icon } from '../../components/ui/Icon'
import { authApi } from '../../api/auth.api'
import { useRegister } from '../../hooks/auth/useRegister'
import { translateApiError } from '../../lib/utils'
import { validEmail } from '../../lib/validation'
import { getApiError } from '../../lib/api'

/**
 * Criar conta (S13, improvement 44): name and e-mail; confirming (link or
 * code) already logs in — one e-mail only.
 */
export function RegisterPage() {
  const [sent, setSent] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [err, setErr] = useState<{ field: 'name' | 'email'; msg: string } | null>(null)
  const register = useRegister()
  const nameErr = useId()
  const emailErr = useId()

  const submit = () => {
    setErr(null)
    if (!name.trim()) return setErr({ field: 'name', msg: 'Informe seu nome.' })
    if (!validEmail(email.trim())) return setErr({ field: 'email', msg: 'E-mail inválido. Confira o endereço.' })
    register.mutate(
      { name: name.trim(), email: email.trim() },
      {
        onSuccess: () => {
          try {
            localStorage.setItem('pague50_last_email', email.trim())
          } catch {
            // private mode: fine
          }
          setSent(true)
        },
        onError: (e: unknown) => setErr({ field: 'email', msg: translateApiError(getApiError(e), 'Não foi possível criar a conta agora. Tente de novo.') }),
      },
    )
  }

  if (sent) {
    return (
      <AuthShell>
        <CheckEmail email={email.trim()} type="CONFIRMATION" onResend={() => authApi.resendConfirmation({ email: email.trim() })} onOtherEmail={() => setSent(false)} />
      </AuthShell>
    )
  }

  return (
    <AuthShell>
      <h1 className="lt-auth-h">Criar conta</h1>
      <p className="lt-auth-p">Grátis. Você confirma pelo e-mail e já entra.</p>
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
      >
        <label className="lt-field-label" htmlFor="auth-name">Seu nome</label>
        <input
          id="auth-name"
          className="lt-auth-input"
          autoComplete="name"
          value={name}
          onChange={(e) => {
            setName(e.target.value)
            setErr(null)
          }}
          placeholder="Como quer ser chamado"
          maxLength={100}
          aria-invalid={err?.field === 'name' || undefined}
          aria-describedby={err?.field === 'name' ? nameErr : undefined}
          autoFocus
        />
        <div id={nameErr} className="lt-auth-err" role="alert">
          {err?.field === 'name' && <><Icon name="alert" size={14} /> {err.msg}</>}
        </div>
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
            setErr(null)
          }}
          placeholder="voce@email.com"
          maxLength={254}
          aria-invalid={err?.field === 'email' || undefined}
          aria-describedby={err?.field === 'email' ? emailErr : undefined}
        />
        <div id={emailErr} className="lt-auth-err" role="alert">
          {err?.field === 'email' && <><Icon name="alert" size={14} /> {err.msg}</>}
        </div>
        <button type="submit" className="lt-btn-lg" data-variant="primary" style={{ width: '100%' }} disabled={register.isPending}>
          <Icon name="mail" size={16} /> {register.isPending ? 'Criando…' : 'Criar conta'}
        </button>
      </form>
      <div className="lt-auth-links">
        <span className="lt-auth-muted">Já tem conta?</span>
        <Link to="/login" className="lt-auth-link">Entrar</Link>
      </div>
    </AuthShell>
  )
}
