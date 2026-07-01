import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useInstallmentsByPeriod } from '../../hooks/installments/useInstallmentsByMonth'
import { useRegisterPayment } from '../../hooks/installments/useRegisterPayment'
import { useToast } from '../../contexts/ToastContext'
import { EmptyState } from '../../components/ui/EmptyState'
import { IconButton } from '../../components/ui/IconButton'
import { InstallmentRow } from '../../components/shared/InstallmentRow'
import { PaymentSheet } from '../../components/shared/PaymentSheet'
import { money, translateApiError, deriveInstStatus } from '../../lib/utils'
import { periodLabel, shiftDate, type Period } from '../../lib/period'
import { getApiError } from '../../lib/api'
import type { InstallmentEnriched, InstallmentStatus } from '../../types/installment'

type Filter = 'ALL' | InstallmentStatus

const PERIODS: { id: Period; label: string }[] = [
  { id: 'day', label: 'Dia' },
  { id: 'week', label: 'Semana' },
  { id: 'month', label: 'Mês' },
]

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'ALL', label: 'Todas' },
  { id: 'OVERDUE', label: 'Atrasadas' },
  { id: 'PENDING', label: 'Pendentes' },
  { id: 'PARTIALLY_PAID', label: 'Parciais' },
  { id: 'PAID', label: 'Pagas' },
]

export function InstallmentsPage() {
  const navigate = useNavigate()
  const { showToast } = useToast()

  const [period, setPeriod] = useState<Period>('month')
  const [dateKey, setDateKey] = useState(() => new Date().toISOString().slice(0, 10))
  const [filter, setFilter] = useState<Filter>('ALL')
  const [paymentContext, setPaymentContext] = useState<{ installment: InstallmentEnriched; debtorName: string; debtDescription: string | null } | null>(null)

  const { data: allItems = [], isLoading } = useInstallmentsByPeriod({ period, date: dateKey })
  const registerPayment = useRegisterPayment()

  const derivedItems = allItems.map((i) => ({
    ...i,
    status: deriveInstStatus({ dueDate: i.dueDate, paidAt: i.paidAt, paidAmount: i.paidAmount, amount: i.amount }),
  }))

  const filtered: InstallmentEnriched[] = (filter === 'ALL' ? derivedItems : derivedItems.filter((i) => i.status === filter))
    .sort((a, b) => (a.status === 'PAID' ? 1 : 0) - (b.status === 'PAID' ? 1 : 0))

  const counts: Record<Filter, number> = {
    ALL: derivedItems.length,
    OVERDUE: derivedItems.filter((i) => i.status === 'OVERDUE').length,
    PENDING: derivedItems.filter((i) => i.status === 'PENDING').length,
    PARTIALLY_PAID: derivedItems.filter((i) => i.status === 'PARTIALLY_PAID').length,
    PAID: derivedItems.filter((i) => i.status === 'PAID').length,
  }

  const totalDue = filtered.filter((i) => i.status !== 'PAID').reduce((s, i) => {
    return s + (Number(i.amount) - Number(i.paidAmount ?? '0'))
  }, 0)

  const filterColors: Record<Filter, string> = {
    ALL: 'var(--primary)',
    OVERDUE: 'var(--overdue)',
    PENDING: 'var(--pending)',
    PARTIALLY_PAID: 'var(--partial)',
    PAID: 'var(--paid)',
  }

  const handleReceive = (inst: InstallmentEnriched) => {
    setPaymentContext({
      installment: inst,
      debtorName: inst.debt?.debtor?.name ?? '',
      debtDescription: inst.debt?.description ?? null,
    })
  }

  const handleConfirmPayment = (installmentId: string, amount: number, paidAt: string) => {
    registerPayment.mutate({ id: installmentId, body: { amount, paidAt } }, {
      onSuccess: ({ installment }) => {
        setPaymentContext(null)
        const wasFullyPaid = installment.status === 'PAID'
        showToast(
          wasFullyPaid ? 'Parcela quitada' : `Pagamento de ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amount)} registrado`,
          { status: wasFullyPaid ? 'PAID' : undefined, icon: wasFullyPaid ? 'check' : undefined }
        )
      },
      onError: (e: unknown) => {
        const msg = getApiError(e)
        showToast(translateApiError(msg, 'Erro ao registrar pagamento.'), { icon: 'alert' })
      },
    })
  }

  return (
    <main style={{ maxWidth: 680, margin: '0 auto', padding: '20px 16px 100px' }} className="lt-anim-fade">
      {/* Header */}
      <div style={{ marginBottom: 18 }}>
        <h1 style={{ margin: 0, fontSize: 25, fontWeight: 800, letterSpacing: '-0.03em' }}>Parcelas</h1>
        <p style={{ margin: '3px 0 0', color: 'var(--text-muted)', fontSize: 14.5 }}>Acompanhe e dê baixa nos pagamentos.</p>
      </div>

      {/* Period segmented control */}
      <div style={{ display: 'flex', gap: 4, background: 'var(--surface-2)', borderRadius: 13, padding: 4, marginBottom: 14 }}>
        {PERIODS.map((p) => (
          <button
            key={p.id}
            onClick={() => setPeriod(p.id)}
            style={{
              flex: 1, padding: '10px', borderRadius: 10, border: 'none', cursor: 'pointer',
              fontWeight: 700, fontSize: 14,
              background: period === p.id ? 'var(--surface)' : 'transparent',
              color: period === p.id ? 'var(--primary)' : 'var(--text-muted)',
              boxShadow: period === p.id ? 'var(--shadow-sm)' : 'none',
              transition: 'all .15s',
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Date navigator */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px 8px', boxShadow: 'var(--shadow-sm)' }}>
        <IconButton name="chevronLeft" onClick={() => setDateKey(shiftDate(period, dateKey, -1))} label="Anterior" />
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: 800, fontSize: 15 }}>{periodLabel(period, dateKey)}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>
            {totalDue > 0 ? `${money(totalDue)} a receber` : 'Nada a receber'}
          </div>
        </div>
        <IconButton name="chevronRight" onClick={() => setDateKey(shiftDate(period, dateKey, 1))} label="Próximo" />
      </div>

      {/* Status filter chips */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, overflowX: 'auto', paddingBottom: 2 }}>
        {FILTERS.map((f) => {
          if (f.id !== 'ALL' && counts[f.id] === 0) return null
          const active = filter === f.id
          const c = filterColors[f.id]
          return (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              style={{
                flexShrink: 0, padding: '8px 14px', borderRadius: 99, cursor: 'pointer',
                fontWeight: 700, fontSize: 13.5, transition: 'all .15s',
                border: `1.5px solid ${active ? c : 'var(--border)'}`,
                background: active ? c : 'var(--surface)',
                color: active ? '#fff' : 'var(--text-muted)',
              }}
            >
              {f.label} <span style={{ opacity: 0.7 }}>{counts[f.id]}</span>
            </button>
          )
        })}
      </div>

      {/* List */}
      {isLoading ? (
        <div style={{ color: 'var(--text-muted)', fontSize: 14, textAlign: 'center', paddingTop: 40 }}>Carregando…</div>
      ) : filtered.length === 0 ? (
        <EmptyState icon="calendar" title="Nenhuma parcela" sub="Não há parcelas para este período e filtro." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map((inst, idx) => (
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
              onReceive={() => handleReceive(inst)}
              index={idx}
            />
          ))}
        </div>
      )}

      {/* Payment sheet */}
      <PaymentSheet
        open={!!paymentContext}
        onClose={() => setPaymentContext(null)}
        context={paymentContext}
        onConfirm={handleConfirmPayment}
        loading={registerPayment.isPending}
      />
    </main>
  )
}
