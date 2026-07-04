import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useInstallmentsByPeriod } from '../../hooks/installments/useInstallmentsByMonth'
import { useRegisterPayment } from '../../hooks/installments/useRegisterPayment'
import { useDeletePayment } from '../../hooks/installments/useDeletePayment'
import { useDebtors } from '../../hooks/debtors/useDebtors'
import { useToast } from '../../contexts/ToastContext'
import { EmptyState } from '../../components/ui/EmptyState'
import { IconButton } from '../../components/ui/IconButton'
import { Icon } from '../../components/ui/Icon'
import { Avatar } from '../../components/ui/Avatar'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
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
  const [debtorIds, setDebtorIds] = useState<string[]>([]) // empty = all debtors
  const [debtorPickerOpen, setDebtorPickerOpen] = useState(false)
  const [debtorSearch, setDebtorSearch] = useState('')
  const [paymentContext, setPaymentContext] = useState<{ installment: InstallmentEnriched; debtorName: string; debtDescription: string | null } | null>(null)
  const [deletingPaymentId, setDeletingPaymentId] = useState<string | undefined>()

  const { data: allItems = [], isLoading } = useInstallmentsByPeriod({ period, date: dateKey })
  const { data: debtors = [] } = useDebtors()
  const registerPayment = useRegisterPayment()
  const deletePayment = useDeletePayment()

  const derivedItems = allItems.map((i) => ({
    ...i,
    status: deriveInstStatus({ dueDate: i.dueDate, paidAt: i.paidAt, paidAmount: i.paidAmount, amount: i.amount }),
  }))

  // Debtor filter (client-side). Empty selection = all debtors.
  const debtorItems = debtorIds.length > 0
    ? derivedItems.filter((i) => debtorIds.includes(i.debt?.debtor?.id ?? i.debt?.debtorId ?? ''))
    : derivedItems

  const filtered: InstallmentEnriched[] = (filter === 'ALL' ? debtorItems : debtorItems.filter((i) => i.status === filter))
    .sort((a, b) => (a.status === 'PAID' ? 1 : 0) - (b.status === 'PAID' ? 1 : 0))

  const counts: Record<Filter, number> = {
    ALL: debtorItems.length,
    OVERDUE: debtorItems.filter((i) => i.status === 'OVERDUE').length,
    PENDING: debtorItems.filter((i) => i.status === 'PENDING').length,
    PARTIALLY_PAID: debtorItems.filter((i) => i.status === 'PARTIALLY_PAID').length,
    PAID: debtorItems.filter((i) => i.status === 'PAID').length,
  }

  const debtorFilterLabel = debtorIds.length === 0
    ? 'Todos os devedores'
    : debtorIds.length === 1
      ? debtors.find((d) => d.id === debtorIds[0])?.name ?? '1 devedor'
      : `${debtorIds.length} devedores`

  const debtorMatches = debtors.filter((d) => d.name.toLowerCase().includes(debtorSearch.trim().toLowerCase()))

  const toggleDebtor = (id: string) =>
    setDebtorIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]))

  const closeDebtorPicker = () => { setDebtorPickerOpen(false); setDebtorSearch('') }

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

  const handleDeletePayment = (installmentId: string, paymentId: string) => {
    setDeletingPaymentId(paymentId)
    deletePayment.mutate({ installmentId, paymentId }, {
      onSuccess: (updatedInstallment) => {
        setDeletingPaymentId(undefined)
        showToast('Pagamento removido')
        setPaymentContext((ctx) => ctx ? { ...ctx, installment: { ...ctx.installment, ...updatedInstallment } } : null)
      },
      onError: (e: unknown) => {
        setDeletingPaymentId(undefined)
        const msg = getApiError(e)
        showToast(translateApiError(msg, 'Erro ao excluir pagamento.'), { icon: 'alert' })
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
                color: active ? 'var(--on-primary)' : 'var(--text-muted)',
              }}
            >
              {f.label} <span style={{ opacity: 0.7 }}>{counts[f.id]}</span>
            </button>
          )
        })}
      </div>

      {/* Debtor filter */}
      <div style={{ marginBottom: 16 }}>
        <button
          type="button"
          onClick={() => setDebtorPickerOpen(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px', borderRadius: 99,
            cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, fontSize: 13.5,
            border: `1.5px solid ${debtorIds.length ? 'var(--primary)' : 'var(--border)'}`,
            background: debtorIds.length ? 'var(--primary-weak)' : 'var(--surface)',
            color: debtorIds.length ? 'var(--primary)' : 'var(--text-muted)',
          }}
        >
          <Icon name="user" size={15} />
          {debtorFilterLabel}
          <Icon name="chevronDown" size={13} />
        </button>
      </div>

      {/* Debtor picker */}
      <Modal
        open={debtorPickerOpen}
        onClose={closeDebtorPicker}
        title="Filtrar por devedor"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDebtorIds([])}>Limpar</Button>
            <Button full onClick={closeDebtorPicker}>Aplicar</Button>
          </>
        }
      >
        <div style={{ marginBottom: 10, paddingTop: 4 }}>
          <Input value={debtorSearch} onChange={setDebtorSearch} placeholder="Buscar devedor…" autoFocus />
        </div>
        {debtorIds.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px 8px' }}>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-faint)' }}>
              {debtorIds.length} selecionado{debtorIds.length > 1 ? 's' : ''}
            </span>
            <button
              type="button"
              onClick={() => setDebtorIds([])}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12.5, fontWeight: 700, color: 'var(--primary)', padding: 0, fontFamily: 'inherit' }}
            >
              Limpar
            </button>
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, maxHeight: '44vh', overflowY: 'auto' }}>
          {debtorMatches.map((dt) => {
            const checked = debtorIds.includes(dt.id)
            return (
              <button
                key={dt.id}
                type="button"
                onClick={() => toggleDebtor(dt.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '10px 8px', borderRadius: 12, border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', color: 'var(--text)' }}
              >
                <div
                  style={{
                    width: 22, height: 22, borderRadius: 7, flexShrink: 0, display: 'grid', placeItems: 'center',
                    border: `1.5px solid ${checked ? 'var(--primary)' : 'var(--border-strong)'}`,
                    background: checked ? 'var(--primary)' : 'transparent',
                  }}
                >
                  {checked && <Icon name="check" size={13} color="var(--on-primary)" strokeWidth={3} />}
                </div>
                <Avatar name={dt.name} size={34} />
                <span style={{ fontWeight: 700, fontSize: 14.5 }}>{dt.name}</span>
              </button>
            )
          })}
          {debtorMatches.length === 0 && (
            <div style={{ padding: '18px 4px', textAlign: 'center', color: 'var(--text-faint)', fontSize: 13.5, fontWeight: 600 }}>
              Nenhum devedor encontrado.
            </div>
          )}
        </div>
      </Modal>

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
        onDeletePayment={handleDeletePayment}
        deletingPaymentId={deletingPaymentId}
        loading={registerPayment.isPending}
      />
    </main>
  )
}
