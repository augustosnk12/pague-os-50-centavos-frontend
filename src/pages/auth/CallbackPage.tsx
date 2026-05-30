import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { Logo } from '../../components/layout/Logo'
import { Icon } from '../../components/ui/Icon'

export function CallbackPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { authenticate } = useAuth()
  const [error, setError] = useState('')

  useEffect(() => {
    const accessToken = searchParams.get('accessToken')
    const lenderId = searchParams.get('lenderId')
    const lenderEmail = searchParams.get('lenderEmail')
    const lenderName = searchParams.get('lenderName')

    if (!accessToken || !lenderId || !lenderEmail) {
      setError('Link de acesso inválido.')
      return
    }

    authenticate(accessToken, {
      id: lenderId,
      email: lenderEmail,
      name: lenderName ?? null,
    })

    // Clean URL before navigating so the token isn't visible in history
    navigate('/dashboard', { replace: true })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        gap: 16,
      }}
    >
      <Logo size={32} />
      {error ? (
        <>
          <div style={{ width: 64, height: 64, borderRadius: '26%', background: 'var(--overdue-weak)', display: 'grid', placeItems: 'center' }}>
            <Icon name="alert" size={28} color="var(--overdue)" />
          </div>
          <div style={{ fontSize: 17, fontWeight: 800 }}>Link inválido</div>
          <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>{error}</div>
          <a onClick={() => navigate('/login')} style={{ color: 'var(--primary)', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>
            Voltar para o login
          </a>
        </>
      ) : (
        <>
          <div style={{ width: 64, height: 64, borderRadius: '26%', background: 'var(--primary-weak)', display: 'grid', placeItems: 'center' }}>
            <Icon name="check" size={28} color="var(--primary)" />
          </div>
          <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-muted)' }}>Entrando…</div>
        </>
      )}
    </div>
  )
}
