import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useDebtor } from '../../hooks/debtors/useDebtor'
import { useUpdateDebtor } from '../../hooks/debtors/useUpdateDebtor'
import { useDeleteDebtor } from '../../hooks/debtors/useDeleteDebtor'
import { useDebtsByDebtor } from '../../hooks/debts/useDebtsByDebtor'
import { useUpdateDebt } from '../../hooks/debts/useUpdateDebt'
import { useDeleteDebt } from '../../hooks/debts/useDeleteDebt'
import { useRegisterPayment } from '../../hooks/installments/useRegisterPayment'
import { useDeletePayment } from '../../hooks/installments/useDeletePayment'
import { useToast } from '../../contexts/ToastContext'
import { translateApiError, deriveInstStatus } from '../../lib/utils'
import { getApiError } from '../../lib/api'
import { Avatar } from '../../components/ui/Avatar'
import { Money } from '../../components/ui/Money'
import { Button } from '../../components/ui/Button'
import { Icon } from '../../components/ui/Icon'
import { IconButton } from '../../components/ui/IconButton'
import { EmptyState } from '../../components/ui/EmptyState'
import { Modal } from '../../components/ui/Modal'
import { Input } from '../../components/ui/Input'
import { DebtorForm } from '../../components/shared/DebtorForm'
import { DebtForm } from '../../components/shared/DebtForm'
import { DebtCard } from '../../components/shared/DebtCard'
import { PaymentSheet } from '../../components/shared/PaymentSheet'
import type { Installment } from '../../types/installment'
import type { DebtWithInstallments } from '../../hooks/debts/useDebtsByDebtor'
import type { DebtType } from '../../types/debt'

function ContactLine({ icon, text, action, muted }: { icon?: string; text: string; action?: React.ReactNode; muted?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
      {icon && (
        <span style={{ width: 32, height: 32, borderRadius: 9, background: 'var(--surface-2)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
          <Icon name={icon} size={16} color="var(--text-muted)" />
        </span>
      )}
      <span style={{ flex: 1, fontSize: 14, color: muted ? 'var(--text-muted)' : 'var(--text)', fontWeight: muted ? 500 : 600 }}>{text}</span>
      {action}
    </div>
  )
}


export function DebtorDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { showToast } = useToast()

  const [editOpen, setEditOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleteConfirmName, setDeleteConfirmName] = useState('')
  const [paymentContext, setPaymentContext] = useState<{ installment: Installment; debtorName: string; debtDescription: string | null } | null>(null)
  const [deletingPaymentId, setDeletingPaymentId] = useState<string | undefined>()
  const [debtForm, setDebtForm] = useState<{ open: boolean; editing: DebtWithInstallments | null }>({ open: false, editing: null })
  const [confirmDelDebt, setConfirmDelDebt] = useState<DebtWithInstallments | null>(null)

  const { data: debtor, isLoading } = useDebtor(id!)
  const { data: debts = [] } = useDebtsByDebtor(id!)
  const updateDebtor = useUpdateDebtor(id!)
  const deleteDebtor = useDeleteDebtor()
  const updateDebt = useUpdateDebt(id!)
  const deleteDebt = useDeleteDebt(id!)
  const registerPayment = useRegisterPayment()
  const deletePayment = useDeletePayment()

  if (isLoading) {
    return (
      <main style={{ maxWidth: 680, margin: '0 auto', padding: '20px 16px 100px' }}>
        <div style={{ color: 'var(--text-muted)', fontSize: 14, textAlign: 'center', paddingTop: 60 }}>Carregando…</div>
      </main>
    )
  }

  if (!debtor) {
    return (
      <main style={{ maxWidth: 680, margin: '0 auto', padding: '20px 16px 100px' }}>
        <EmptyState title="Devedor não encontrado" icon="users" />
      </main>
    )
  }

  const allInsts = debts.flatMap((d) => d.installments ?? [])
  const paidCount = allInsts.filter((i) => {
    const s = deriveInstStatus({ dueDate: i.dueDate, paidAt: i.paidAt, paidAmount: i.paidAmount, amount: i.amount })
    return s === 'PAID'
  }).length
  const outstanding = allInsts.reduce((s, i) => s + (Number(i.amount) - Number(i.paidAmount ?? '0')), 0)
  const overdueCount = allInsts.filter((i) => {
    const s = deriveInstStatus({ dueDate: i.dueDate, paidAt: i.paidAt, paidAmount: i.paidAmount, amount: i.amount })
    return s === 'OVERDUE'
  }).length
  const confirmDelDebtHasPayments = confirmDelDebt != null &&
    (confirmDelDebt.installments ?? []).some((i) => (i.payments?.length ?? 0) > 0)

  const handleUpdate = (data: { id?: string; name: string; email: string | null; phone: string | null; notes: string | null }) => {
    updateDebtor.mutate(data, {
      onSuccess: () => { setEditOpen(false); showToast('Devedor atualizado') },
      onError: (e: unknown) => {
        const msg = getApiError(e)
        showToast(translateApiError(msg, 'Erro ao atualizar.'), { icon: 'alert' })
      },
    })
  }

  const handleDelete = () => {
    deleteDebtor.mutate(id!, {
      onSuccess: () => { showToast('Devedor excluído'); navigate('/debtors') },
      onError: (e: unknown) => {
        showToast(translateApiError(getApiError(e), 'Erro ao excluir devedor.'), { icon: 'alert' })
      },
    })
  }

  const handleSaveDebt = (data: { id: string; description: string | null; type: DebtType }) => {
    updateDebt.mutate({ id: data.id, data: { description: data.description, type: data.type } }, {
      onSuccess: () => { setDebtForm({ open: false, editing: null }); showToast('Dívida atualizada') },
      onError: (e: unknown) => {
        showToast(translateApiError(getApiError(e), 'Erro ao atualizar.'), { icon: 'alert' })
      },
    })
  }

  const handleDeleteDebt = () => {
    if (!confirmDelDebt) return
    deleteDebt.mutate(confirmDelDebt.id, {
      onSuccess: () => { setConfirmDelDebt(null); showToast('Dívida excluída') },
      onError: (e: unknown) => {
        setConfirmDelDebt(null)
        showToast(translateApiError(getApiError(e), 'Erro ao excluir.'), { icon: 'alert' })
      },
    })
  }

  const handleReceive = (inst: Installment, debt: { description: string | null }) => {
    setPaymentContext({ installment: inst, debtorName: debtor.name, debtDescription: debt.description })
  }

  const handleDeletePayment = (installmentId: string, paymentId: string) => {
    setDeletingPaymentId(paymentId)
    deletePayment.mutate({ installmentId, paymentId }, {
      onSuccess: (updatedInstallment) => {
        setDeletingPaymentId(undefined)
        showToast('Pagamento removido')
        setPaymentContext((ctx) => ctx ? { ...ctx, installment: updatedInstallment } : null)
      },
      onError: (e: unknown) => {
        setDeletingPaymentId(undefined)
        const msg = getApiError(e)
        showToast(translateApiError(msg, 'Erro ao excluir pagamento.'), { icon: 'alert' })
      },
    })
  }

  const handleConfirmPayment = (installmentId: string, amount: number, paidAt: string) => {
    registerPayment.mutate({ id: installmentId, body: { amount, paidAt } }, {
      onSuccess: ({ installment }) => {
        setPaymentContext(null)
        const wasFullyPaid = deriveInstStatus({
          dueDate: installment.dueDate,
          paidAt: installment.paidAt,
          paidAmount: installment.paidAmount,
          amount: installment.amount,
        }) === 'PAID'
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
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
        <IconButton name="arrowLeft" onClick={() => navigate('/debtors')} label="Voltar" style={{ marginLeft: -8 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ margin: 0, fontSize: 25, fontWeight: 800, letterSpacing: '-0.03em' }}>{debtor.name}</h1>
        </div>
        <IconButton name="edit" onClick={() => setEditOpen(true)} label="Editar" />
      </div>

      {/* Summary card */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 18, boxShadow: 'var(--shadow-sm)', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 15, alignItems: 'center' }}>
          <Avatar name={debtor.name} size={58} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, color: 'var(--text-faint)', fontWeight: 700 }}>Saldo devedor</div>
            <Money
              value={outstanding}
              size={26}
              weight={800}
              color={overdueCount > 0 ? 'var(--overdue)' : outstanding > 0 ? 'var(--text)' : 'var(--paid)'}
            />
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>{paidCount} de {allInsts.length} parcelas pagas</div>
          </div>
        </div>
        {(debtor.phone ?? debtor.email ?? debtor.notes) && (
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {debtor.phone && (
              <ContactLine
                icon="phone"
                text={debtor.phone}
                action={
                  <a
                    href={`https://wa.me/${debtor.phone.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: 'var(--paid)', fontWeight: 700, fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 5 }}
                  >
                    <Icon name="whatsapp" size={15} />Lembrar
                  </a>
                }
              />
            )}
            {debtor.email && <ContactLine icon="mail" text={debtor.email} />}
            {debtor.notes && <ContactLine text={debtor.notes} muted />}
          </div>
        )}
      </div>

      {/* Debts */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em' }}>
          Dívidas <span style={{ color: 'var(--text-faint)', fontWeight: 700 }}>{debts.length}</span>
        </h2>
        <Button size="sm" icon="plus" onClick={() => navigate(`/debts/new?debtorId=${id}`)}>Nova dívida</Button>
      </div>

      {debts.length === 0 ? (
        <EmptyState
          icon="wallet"
          title="Sem dívidas"
          sub="Registre o que essa pessoa te deve."
          action={<Button icon="plus" onClick={() => navigate(`/debts/new?debtorId=${id}`)}>Nova dívida</Button>}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {debts.map((debt) => (
            <DebtCard
              key={debt.id}
              debt={debt}
              onReceive={(inst) => handleReceive(inst, debt)}
              onEditDebt={(d) => setDebtForm({ open: true, editing: d })}
            />
          ))}
        </div>
      )}

      {/* Edit debtor modal */}
      <DebtorForm
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSave={handleUpdate}
        onDelete={() => { setEditOpen(false); setDeleteConfirmName(''); setConfirmDelete(true) }}
        editing={debtor}
        loading={updateDebtor.isPending}
      />

      {/* Delete debtor confirm */}
      <Modal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Excluir devedor?"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmDelete(false)}>Cancelar</Button>
            <Button full variant="danger" icon="trash" onClick={handleDelete} disabled={deleteDebtor.isPending || deleteConfirmName !== debtor.name}>
              {deleteDebtor.isPending ? 'Excluindo…' : 'Excluir tudo'}
            </Button>
          </>
        }
      >
        <div style={{ paddingTop: 4, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 14.5, lineHeight: 1.6 }}>
            Isso vai apagar <b style={{ color: 'var(--text)' }}>{debtor.name}</b> e todas as suas dívidas e parcelas. Esta ação não pode ser desfeita.
          </p>
          <Input
            label={`Digite "${debtor.name}" para confirmar`}
            value={deleteConfirmName}
            onChange={setDeleteConfirmName}
            placeholder={debtor.name}
          />
        </div>
      </Modal>

      {/* Edit debt modal */}
      <DebtForm
        open={debtForm.open}
        onClose={() => setDebtForm({ open: false, editing: null })}
        editing={debtForm.editing}
        onSave={handleSaveDebt}
        onDelete={(debt) => { setDebtForm({ open: false, editing: null }); setConfirmDelDebt(debt) }}
        loading={updateDebt.isPending}
      />

      {/* Delete debt confirm */}
      <Modal
        open={confirmDelDebt != null}
        onClose={() => setConfirmDelDebt(null)}
        title={confirmDelDebtHasPayments ? 'Não é possível excluir' : 'Excluir dívida?'}
        footer={
          confirmDelDebtHasPayments ? (
            <Button full variant="secondary" onClick={() => setConfirmDelDebt(null)}>Fechar</Button>
          ) : (
            <>
              <Button variant="ghost" onClick={() => setConfirmDelDebt(null)}>Cancelar</Button>
              <Button full variant="danger" icon="trash" onClick={handleDeleteDebt} disabled={deleteDebt.isPending}>
                {deleteDebt.isPending ? 'Excluindo…' : 'Excluir'}
              </Button>
            </>
          )
        }
      >
        <div style={{ paddingTop: 4, display: 'flex', gap: 13, alignItems: 'flex-start' }}>
          {confirmDelDebtHasPayments && (
            <span style={{ width: 38, height: 38, borderRadius: 11, background: 'var(--overdue-weak)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
              <Icon name="alert" size={20} color="var(--overdue)" />
            </span>
          )}
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 14.5, lineHeight: 1.6 }}>
            {confirmDelDebtHasPayments
              ? 'Esta dívida tem pagamentos registrados e não pode ser excluída.'
              : 'Isso vai apagar esta dívida e todas as suas parcelas. Esta ação não pode ser desfeita.'}
          </p>
        </div>
      </Modal>

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
