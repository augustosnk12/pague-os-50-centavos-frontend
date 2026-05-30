import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDashboard } from '../../hooks/dashboard/useDashboard'
import { useInstallmentsByPeriod } from '../../hooks/installments/useInstallmentsByMonth'
import { useMarkAsPaid } from '../../hooks/installments/useMarkAsPaid'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { Card } from '../../components/ui/Card'
import { Progress } from '../../components/ui/Progress'
import { EmptyState } from '../../components/ui/EmptyState'
import { Money } from '../../components/ui/Money'
import { Icon } from '../../components/ui/Icon'
import { IconButton } from '../../components/ui/IconButton'
import { InstallmentRow } from '../../components/shared/InstallmentRow'
import { MonthSwitcher } from '../../components/shared/MonthSwitcher'
import { StatTile } from '../../components/shared/StatTile'
import { monthKey, monthLabel, money, translateApiError, deriveInstStatus } from '../../lib/utils'
import { getApiError } from '../../lib/api'
import type { InstallmentEnriched } from '../../types/installment'

export function DashboardPage() {
  const [mKey, setMKey] = useState(() => monthKey(new Date()))
  const navigate = useNavigate()
  const { lender } = useAuth()
  const { showToast } = useToast()

  const today = new Date().toISOString().slice(0, 10)
  const { data: dashData, isLoading: dashLoading } = useDashboard(mKey)

  // current month installments (enriched with debtor info)
  const { data: monthInstallments = [] } = useInstallmentsByPeriod({ period: 'month', date: today })

  const markAsPaid = useMarkAsPaid()

  // action list: non-paid, overdue first, then by due date, max 6
  const actionItems: InstallmentEnriched[] = monthInstallments
    .filter((i) => deriveInstStatus(i) !== 'PAID')
    .sort((a, b) => {
      const ao = deriveInstStatus(a) === 'OVERDUE' ? 0 : 1
      const bo = deriveInstStatus(b) === 'OVERDUE' ? 0 : 1
      if (ao !== bo) return ao - bo
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
    })
    .slice(0, 6)

  const handleMarkPaid = (inst: InstallmentEnriched) => {
    markAsPaid.mutate(inst.id, {
      onSuccess: () => showToast('Parcela marcada como paga', { status: 'PAID', icon: 'check' }),
      onError: (e: unknown) => {
        const msg = getApiError(e)
        showToast(translateApiError(msg, 'Erro ao marcar como paga.'), { icon: msg?.includes('already paid') ? 'check' : 'alert' })
      },
    })
  }

  const totalOwedNow = monthInstallments.filter((i) => deriveInstStatus(i) !== 'PAID').reduce((s, i) => s + Number(i.amount), 0)
  const overdueNow = monthInstallments.filter((i) => deriveInstStatus(i) === 'OVERDUE').reduce((s, i) => s + Number(i.amount), 0)
  const pendingNow = monthInstallments.filter((i) => deriveInstStatus(i) === 'PENDING').reduce((s, i) => s + Number(i.amount), 0)

  const receivedPct = dashData && Number(dashData.totalExpected) > 0
    ? Number(dashData.totalReceived) / Number(dashData.totalExpected)
    : 0

  const firstName = lender?.name?.split(' ')[0] ?? 'você'

  return (
    <main style={{ maxWidth: 1080, margin: '0 auto', padding: '20px 16px 100px' }} className="lt-anim-fade">
      {/* greeting + month switcher */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 25, fontWeight: 800, letterSpacing: '-0.03em' }}>Olá, {firstName} 👋</h1>
          <p style={{ margin: '3px 0 0', color: 'var(--text-muted)', fontSize: 14.5 }}>Veja quem precisa te pagar.</p>
        </div>
        <MonthSwitcher mKey={mKey} setMKey={setMKey} />
      </div>

      {/* HERO */}
      <div
        className="lt-anim-up"
        style={{
          position: 'relative',
          overflow: 'hidden',
          borderRadius: 'calc(var(--radius)*1.15)',
          padding: '24px 24px 22px',
          background: 'linear-gradient(135deg, var(--primary), oklch(0.42 0.2 calc(var(--accent-h) + 25)))',
          color: '#fff',
          boxShadow: 'var(--shadow-primary)',
          marginBottom: 14,
        }}
      >
        <div style={{ position: 'absolute', top: -40, right: -30, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.12)' }} />
        <div style={{ position: 'absolute', bottom: -60, right: 40, width: 150, height: 150, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
        <div style={{ position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, fontWeight: 700, opacity: 0.92, marginBottom: 8 }}>
            <Icon name="wallet" size={17} /> Total a receber agora
          </div>
          <div style={{ fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1 }}>
            <span style={{ fontSize: 22, opacity: 0.85, marginRight: 4 }}>R$</span>
            <span style={{ fontSize: 46 }}>{money(totalOwedNow).replace('R$', '').trim()}</span>
          </div>
          <div style={{ display: 'flex', gap: 18, marginTop: 18, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 12.5, opacity: 0.85, fontWeight: 600 }}>Atrasado</div>
              <div style={{ fontSize: 18, fontWeight: 800 }}>{money(overdueNow)}</div>
            </div>
            <div style={{ width: 1, background: 'rgba(255,255,255,0.25)' }} />
            <div>
              <div style={{ fontSize: 12.5, opacity: 0.85, fontWeight: 600 }}>A vencer</div>
              <div style={{ fontSize: 18, fontWeight: 800 }}>{money(pendingNow)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Month summary */}
      {!dashLoading && dashData && (
        <Card style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-muted)' }}>{monthLabel(mKey)}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--paid)' }}>{Math.round(receivedPct * 100)}% recebido</div>
          </div>
          <Progress value={receivedPct} color="var(--paid)" height={9} />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontSize: 13 }}>
            <span style={{ color: 'var(--text-muted)' }}>Recebido <b style={{ color: 'var(--text)' }}>{money(dashData.totalReceived)}</b></span>
            <span style={{ color: 'var(--text-muted)' }}>Esperado <b style={{ color: 'var(--text)' }}>{money(dashData.totalExpected)}</b></span>
          </div>
        </Card>
      )}

      {/* Stat tiles */}
      {dashData && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 24 }}>
          <StatTile label="Recebido" status="PAID" value={dashData.totalReceived} count={dashData.counts.paid} />
          <StatTile label="Pendente" status="PENDING" value={dashData.totalPending} count={dashData.counts.pending} />
          <StatTile label="Atrasado" status="OVERDUE" value={dashData.totalOverdue} count={dashData.counts.overdue} />
        </div>
      )}

      {/* Action list */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em' }}>Precisa de atenção</h2>
        <a onClick={() => navigate('/installments')} style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--primary)', cursor: 'pointer' }}>Ver tudo</a>
      </div>

      {actionItems.length === 0 ? (
        <EmptyState icon="check" title="Tudo em dia!" sub="Nenhuma parcela atrasada ou pendente no momento." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {actionItems.map((inst, idx) => (
            <InstallmentRow
              key={inst.id}
              enriched={{
                inst,
                debtDescription: inst.debt?.description ?? null,
                debtorId: inst.debt?.debtor?.id ?? inst.debt?.debtorId ?? '',
                debtorName: inst.debt?.debtor?.name ?? '',
                status: inst.status,
              }}
              onOpenDebtor={(id) => navigate(`/debtors/${id}`)}
              onMarkPaid={() => handleMarkPaid(inst)}
              index={idx}
            />
          ))}
        </div>
      )}
    </main>
  )
}
