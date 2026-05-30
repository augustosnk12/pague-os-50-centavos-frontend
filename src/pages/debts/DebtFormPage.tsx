import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useDebtors } from '../../hooks/debtors/useDebtors'
import { useCreateDebt } from '../../hooks/debts/useCreateDebt'
import { useCreateDebtor } from '../../hooks/debtors/useCreateDebtor'
import { useToast } from '../../contexts/ToastContext'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { Icon } from '../../components/ui/Icon'
import { IconButton } from '../../components/ui/IconButton'
import { DebtorForm } from '../../components/shared/DebtorForm'
import { genInstallments, fmtDate, money, translateApiError } from '../../lib/utils'
import { formatCents, parseCurrencyDigits } from '../../lib/currency'
import { getApiError } from '../../lib/api'
import type { DebtType } from '../../types/debt'

const TYPE_OPTIONS: { type: DebtType; label: string; icon: string }[] = [
  { type: 'CASH', label: 'Dinheiro', icon: 'banknote' },
  { type: 'PIX', label: 'Pix', icon: 'zap' },
  { type: 'CREDIT_CARD', label: 'Cartão de crédito', icon: 'card' },
  { type: 'PIX_INSTALLMENT', label: 'Pix parcelado', icon: 'layers' },
]

export function DebtFormPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const presetDebtorId = searchParams.get('debtorId') ?? ''
  const { showToast } = useToast()

  const { data: debtors = [] } = useDebtors()
  const createDebt = useCreateDebt()
  const createDebtor = useCreateDebtor()

  const [debtorId, setDebtorId] = useState(presetDebtorId || (debtors[0]?.id ?? ''))
  const [type, setType] = useState<DebtType>('PIX_INSTALLMENT')
  const [amountCents, setAmountCents] = useState('')
  const [count, setCount] = useState('')
  const [firstDue, setFirstDue] = useState(() => {
    const t = new Date()
    const dd = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + 1, 1))
    return dd.toISOString().slice(0, 10)
  })
  const [description, setDescription] = useState('')
  const [err, setErr] = useState('')
  const [debtorFormOpen, setDebtorFormOpen] = useState(false)

  const isInstallment = type === 'PIX_INSTALLMENT' || type === 'CREDIT_CARD'
  const effCount = isInstallment ? Math.max(1, parseInt(count) || 1) : 1
  const numAmount = amountCents ? parseInt(amountCents, 10) / 100 : 0
  const preview = numAmount > 0 ? genInstallments(numAmount, effCount, firstDue + 'T00:00:00.000Z') : []

  const handleAmountChange = (v: string) => {
    setAmountCents(parseCurrencyDigits(v))
    setErr('')
  }

  const selectedDebtor = debtors.find((d) => d.id === debtorId)

  const handleSubmit = () => {
    setErr('')
    if (!debtorId) return setErr('Selecione um devedor.')
    if (!(numAmount > 0)) return setErr('Informe um valor válido.')
    createDebt.mutate(
      {
        debtorId,
        type,
        totalAmount: numAmount.toFixed(2),
        numberOfInstallments: effCount,
        firstDueDate: firstDue + 'T00:00:00.000Z',
        description: description.trim() || null,
      },
      {
        onSuccess: (data) => {
          showToast(`Cobrança criada · ${data.installments.length}× parcela${data.installments.length > 1 ? 's' : ''}`, { status: 'PENDING', icon: 'check' })
          navigate(`/debtors/${debtorId}`)
        },
        onError: (e: unknown) => {
          const msg = getApiError(e)
          setErr(translateApiError(msg, 'Erro ao criar cobrança.'))
        },
      },
    )
  }

  const handleCreateDebtor = (data: { name: string; email: string | null; phone: string | null; notes: string | null }) => {
    createDebtor.mutate(data, {
      onSuccess: (newDebtor) => {
        setDebtorId(newDebtor.id)
        setDebtorFormOpen(false)
        showToast('Devedor adicionado')
      },
      onError: (e: unknown) => {
        const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error
        showToast(translateApiError(msg, 'Erro ao criar devedor.'), { icon: 'alert' })
      },
    })
  }

  // Sync debtorId when debtors load
  if (!debtorId && debtors.length > 0) {
    setDebtorId(presetDebtorId || debtors[0].id)
  }

  return (
    <main style={{ maxWidth: 680, margin: '0 auto', padding: '20px 16px 100px' }} className="lt-anim-fade">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 18 }}>
        <IconButton name="arrowLeft" onClick={() => navigate(-1)} label="Voltar" style={{ marginLeft: -8, marginTop: 2 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ margin: 0, fontSize: 25, fontWeight: 800, letterSpacing: '-0.03em' }}>Nova cobrança</h1>
          <p style={{ margin: '3px 0 0', color: 'var(--text-muted)', fontSize: 14.5 }}>Registre uma dívida e gere as parcelas.</p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {/* Debtor */}
        <div>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 7 }}>
            Devedor <span style={{ color: 'var(--primary)' }}>*</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <select
                value={debtorId}
                onChange={(e) => { setDebtorId(e.target.value); setErr('') }}
                style={{ width: '100%', appearance: 'none', background: 'var(--surface)', border: '1.5px solid var(--border-strong)', borderRadius: 'calc(var(--radius)*0.6)', padding: '14px 40px 14px 15px', fontSize: 16, fontWeight: 600, color: 'var(--text)', fontFamily: 'inherit', cursor: 'pointer' }}
              >
                {debtors.length === 0 && <option value="">Nenhum devedor</option>}
                {debtors.map((dt) => <option key={dt.id} value={dt.id}>{dt.name}</option>)}
              </select>
              <Icon name="chevronDown" size={18} color="var(--text-faint)" style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            </div>
            <Button variant="secondary" icon="plus" onClick={() => setDebtorFormOpen(true)}>Novo</Button>
          </div>
        </div>

        {/* Type */}
        <div>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 7 }}>Tipo</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {TYPE_OPTIONS.map((t) => {
              const active = type === t.type
              return (
                <button
                  key={t.type}
                  onClick={() => setType(t.type)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 9, padding: '13px 14px',
                    borderRadius: 'calc(var(--radius)*0.6)', cursor: 'pointer', textAlign: 'left',
                    background: active ? 'var(--primary-weak)' : 'var(--surface)',
                    border: `1.5px solid ${active ? 'var(--primary)' : 'var(--border)'}`,
                    color: active ? 'var(--primary)' : 'var(--text)',
                    fontWeight: 700, fontSize: 14, transition: 'all .15s',
                  }}
                >
                  <Icon name={t.icon} size={18} /> {t.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Amount + installments */}
        <div style={{ display: 'grid', gridTemplateColumns: isInstallment ? '1.4fr 1fr' : '1fr', gap: 12 }}>
          <Input
            label="Valor total"
            value={formatCents(amountCents)}
            onChange={handleAmountChange}
            placeholder="0,00"
            prefix="R$"
            inputMode="numeric"
            required
            error={err && !(numAmount > 0) ? err : ''}
          />
          {isInstallment && (
            <Input
              label="Parcelas"
              value={count}
              onChange={(v) => setCount(v.replace(/\D/g, ''))}
              inputMode="numeric"
              maxLength={4}
            />
          )}
        </div>

        <Input label="Primeiro vencimento" value={firstDue} onChange={setFirstDue} type="date" required />
        <Input label="Descrição" value={description} onChange={setDescription} placeholder="Empréstimo de junho" hint="Opcional" maxLength={120} />

        {/* Preview */}
        {preview.length > 0 && (
          <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: 13.5, fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                <Icon name="layers" size={16} color="var(--primary)" />Prévia das parcelas
              </span>
              <span style={{ fontSize: 12.5, color: 'var(--text-muted)', fontWeight: 700 }}>{preview.length}× de até {money(preview[0].amount)}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7, maxHeight: 220, overflowY: 'auto' }}>
              {preview.slice(0, 12).map((p) => (
                <div key={p.number} style={{ display: 'flex', alignItems: 'center', gap: 11, fontSize: 13.5 }}>
                  <span style={{ width: 24, height: 24, borderRadius: 7, background: 'var(--surface)', border: '1px solid var(--border)', display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 12, flexShrink: 0 }}>{p.number}</span>
                  <span style={{ flex: 1, color: 'var(--text-muted)' }}>{fmtDate(p.dueDate)}</span>
                  <span style={{ fontWeight: 800 }}>{money(p.amount)}</span>
                </div>
              ))}
              {preview.length > 12 && (
                <div style={{ fontSize: 12.5, color: 'var(--text-faint)', textAlign: 'center', paddingTop: 4 }}>+ {preview.length - 12} parcelas</div>
              )}
            </div>
          </div>
        )}

        {err && numAmount > 0 && (
          <div style={{ fontSize: 13, color: 'var(--overdue)', fontWeight: 600 }}>{err}</div>
        )}

        <div style={{ position: 'sticky', bottom: 16, display: 'flex', gap: 10, marginTop: 4 }}>
          <Button variant="secondary" onClick={() => navigate(-1)}>Cancelar</Button>
          <Button full size="lg" icon="check" onClick={handleSubmit} disabled={createDebt.isPending}>
            {createDebt.isPending
              ? 'Criando…'
              : `Criar cobrança${selectedDebtor ? ` p/ ${selectedDebtor.name.split(' ')[0]}` : ''}`}
          </Button>
        </div>
      </div>

      <DebtorForm
        open={debtorFormOpen}
        onClose={() => setDebtorFormOpen(false)}
        onSave={handleCreateDebtor}
        loading={createDebtor.isPending}
      />
    </main>
  )
}
