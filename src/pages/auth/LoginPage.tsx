import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Logo } from '../../components/layout/Logo'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { Icon } from '../../components/ui/Icon'
import { useLogin } from '../../hooks/auth/useLogin'
import { authApi } from '../../api/auth.api'
import { translateApiError } from '../../lib/utils'
import { validEmail } from '../../lib/validation'
import { getApiError } from '../../lib/api'
import { useCooldown } from '../../hooks/useCooldown'

type Step = 'form' | 'sent'

export function LoginPage() {
  const [step, setStep] = useState<Step>('form')
  const [email, setEmail] = useState('')
  const [err, setErr] = useState('')
  const [unconfirmed, setUnconfirmed] = useState(false)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const login = useLogin()
  const { cooldown, start: startCooldown } = useCooldown(60, 'lt_cd_login_resend')
  const { cooldown: resendCooldown, start: startResendCooldown } = useCooldown(60, 'lt_cd_confirm_resend')

  const confirmed = searchParams.get('confirmed') === 'true'
  const urlError = searchParams.get('error')

  const handleSubmit = () => {
    setErr('')
    setUnconfirmed(false)
    if (!validEmail(email)) return setErr('E-mail inválido.')
    login.mutate(
      { email },
      {
        onSuccess: () => setStep('sent'),
        onError: (e: unknown) => {
          const msg = getApiError(e)
          setUnconfirmed(msg === 'Account not confirmed')
          setErr(translateApiError(msg, 'Erro ao enviar link. Tente novamente.'))
        },
      },
    )
  }

  const cardStyle = {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    padding: 26,
    boxShadow: 'var(--shadow-lg)',
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 20px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* decorative glows */}
      <div style={{ position: 'absolute', top: '-20%', right: '-10%', width: 420, height: 420, borderRadius: '50%', background: 'radial-gradient(circle, var(--primary-weak-2), transparent 70%)', opacity: 0.7, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '-15%', left: '-10%', width: 360, height: 360, borderRadius: '50%', background: 'radial-gradient(circle, var(--primary-weak), transparent 70%)', opacity: 0.6, pointerEvents: 'none' }} />

      <div style={{ width: '100%', maxWidth: 400, position: 'relative', zIndex: 1 }} className="lt-anim-up">
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 26 }}>
          <Logo size={32} />
        </div>

        {step === 'form' && (
          <div style={cardStyle}>
            {confirmed && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--paid-weak)', color: 'var(--paid)', borderRadius: 'calc(var(--radius)*0.6)', padding: '11px 14px', marginBottom: 18, fontSize: 13.5, fontWeight: 700 }}>
                <Icon name="check" size={16} strokeWidth={2.6} />
                Conta confirmada! Agora é só entrar.
              </div>
            )}
            {urlError && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--overdue-weak)', color: 'var(--overdue)', borderRadius: 'calc(var(--radius)*0.6)', padding: '11px 14px', marginBottom: 18, fontSize: 13.5, fontWeight: 700 }}>
                <Icon name="alert" size={16} strokeWidth={2.6} />
                {translateApiError(decodeURIComponent(urlError))}
              </div>
            )}
            <h1 style={{ margin: '0 0 4px', fontSize: 24, fontWeight: 800, letterSpacing: '-0.03em' }}>Bem-vindo de volta</h1>
            <p style={{ margin: '0 0 22px', color: 'var(--text-muted)', fontSize: 14.5, lineHeight: 1.5 }}>
              Enviamos um link de acesso pro seu e-mail. Sem senhas.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <Input
                label="E-mail"
                value={email}
                onChange={(v) => { setEmail(v); setErr('') }}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit() }}
                placeholder="voce@email.com"
                type="email"
                required
                maxLength={254}
                error={err}
                autoFocus
              />
              <Button full size="lg" icon="send" onClick={handleSubmit} disabled={login.isPending}>
                {login.isPending ? 'Enviando…' : 'Enviar link de acesso'}
              </Button>
              {unconfirmed && (
                <div style={{ textAlign: 'center', fontSize: 13 }}>
                  <a
                    onClick={() => { if (startResendCooldown()) void authApi.resendConfirmation({ email }) }}
                    style={{ color: resendCooldown > 0 ? 'var(--text-faint)' : 'var(--primary)', fontWeight: 700, cursor: resendCooldown > 0 ? 'default' : 'pointer' }}
                  >
                    {resendCooldown > 0 ? `E-mail reenviado · aguarde ${resendCooldown}s` : 'Reenviar e-mail de confirmação'}
                  </a>
                </div>
              )}
            </div>
            <div style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: 'var(--text-muted)' }}>
              Ainda não tem conta?{' '}
              <a onClick={() => navigate('/register')} style={{ color: 'var(--primary)', fontWeight: 700, cursor: 'pointer' }}>
                Criar conta
              </a>
            </div>
          </div>
        )}

        {step === 'sent' && (
          <div style={cardStyle} className="lt-anim-up">
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: 22 }}>
              <div style={{ width: 84, height: 84, borderRadius: '30%', background: 'var(--primary-weak)', display: 'grid', placeItems: 'center', marginBottom: 18, animation: 'ltPopItem 0.5s cubic-bezier(0.22,1,0.36,1) 0.08s both' }}>
                <Icon name="mail" size={38} color="var(--primary)" strokeWidth={1.8} />
              </div>
            </div>
            <h1 style={{ margin: '0 0 8px', fontSize: 23, fontWeight: 800, letterSpacing: '-0.03em', textAlign: 'center', animation: 'ltRise 0.4s cubic-bezier(0.22,1,0.36,1) 0.15s both' }}>
              Link de acesso enviado
            </h1>
            <p style={{ margin: '0 auto 22px', color: 'var(--text-muted)', fontSize: 14.5, lineHeight: 1.55, textAlign: 'center', maxWidth: 300, animation: 'ltRise 0.4s cubic-bezier(0.22,1,0.36,1) 0.22s both' }}>
              Enviamos um link mágico para <b style={{ color: 'var(--text)' }}>{email}</b>. Clique nele para entrar.
            </p>
            <div style={{ textAlign: 'center', fontSize: 13.5, color: 'var(--text-muted)', animation: 'ltRise 0.4s cubic-bezier(0.22,1,0.36,1) 0.28s both' }}>
              Não recebeu?{' '}
              <a
                onClick={() => { if (startCooldown()) void authApi.login({ email }) }}
                style={{ color: cooldown > 0 ? 'var(--text-faint)' : 'var(--primary)', fontWeight: 700, cursor: cooldown > 0 ? 'default' : 'pointer' }}
              >
                {cooldown > 0 ? `Reenviar em ${cooldown}s` : 'Reenviar'}
              </a>
              <span style={{ margin: '0 8px', opacity: 0.4 }}>·</span>
              <a onClick={() => setStep('form')} style={{ color: 'var(--text-muted)', fontWeight: 700, cursor: 'pointer' }}>Voltar</a>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
