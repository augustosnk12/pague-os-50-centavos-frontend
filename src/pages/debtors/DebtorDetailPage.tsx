import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useDebtor } from '../../hooks/debtors/useDebtor'
import { useUpdateDebtor } from '../../hooks/debtors/useUpdateDebtor'
import { useDeleteDebtor } from '../../hooks/debtors/useDeleteDebtor'
import { useDebtsByDebtor } from '../../hooks/debts/useDebtsByDebtor'
import { useMarkAsPaid } from '../../hooks/installments/useMarkAsPaid'
import { useToast } from '../../contexts/ToastContext'
import { translateApiError } from '../../lib/utils'
import { getApiError } from '../../lib/api'
import { Avatar } from '../../components/ui/Avatar'
import { Money } from '../../components/ui/Money'
import { Button } from '../../components/ui/Button'
import { Icon } from '../../components/ui/Icon'
import { IconButton } from '../../components/ui/IconButton'
import { Progress } from '../../components/ui/Progress'
import { EmptyState } from '../../components/ui/EmptyState'
import { Modal } from '../../components/ui/Modal'
import { StatusBadge } from '../../components/ui/Badge'
import { DebtorForm } from '../../components/shared/DebtorForm'
import { DebtCard } from '../../components/shared/DebtCard'
import { money } from '../../lib/utils'
import type { Installment } from '../../types/installment'
import type { DebtWithInstallments } from '../../hooks/debts/useDebtsByDebtor'

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

  const { data: debtor, isLoading } = useDebtor(id!)
  const { data: debts = [] } = useDebtsByDebtor(id!)
  const updateDebtor = useUpdateDebtor(id!)
  const deleteDebtor = useDeleteDebtor()
  const markAsPaid = useMarkAsPaid()

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
  const paidCount = allInsts.filter((i) => i.status === 'PAID').length
  const outstanding = allInsts.filter((i) => i.status !== 'PAID').reduce((s, i) => s + Number(i.amount), 0)
  const overdueCount = allInsts.filter((i) => i.status === 'OVERDUE').length
  const ratio = allInsts.length ? paidCount / allInsts.length : 0

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
    })
  }

  const handleMarkPaid = (inst: Installment) => {
    markAsPaid.mutate(inst.id, {
      onSuccess: () => showToast('Parcela marcada como paga', { status: 'PAID', icon: 'check' }),
      onError: (e: unknown) => {
        const msg = getApiError(e)
        showToast(translateApiError(msg, 'Erro ao marcar como paga.'), { icon: msg?.includes('already paid') ? 'check' : 'alert' })
      },
    })
  }

  return (
    <main style={{ maxWidth: 680, margin: '0 auto', padding: '20px 16px 100px' }} className="lt-anim-fade">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 18 }}>
        <IconButton name="arrowLeft" onClick={() => navigate('/debtors')} label="Voltar" style={{ marginLeft: -8, marginTop: 2 }} />
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
        {allInsts.length > 0 && (
          <div style={{ marginTop: 14 }}>
            <Progress value={ratio} color="var(--paid)" height={7} />
          </div>
        )}
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
            <DebtCard key={debt.id} debt={debt} onMarkPaid={handleMarkPaid} />
          ))}
        </div>
      )}

      {/* Edit modal */}
      <DebtorForm
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSave={handleUpdate}
        onDelete={() => { setEditOpen(false); setConfirmDelete(true) }}
        editing={debtor}
        loading={updateDebtor.isPending}
      />

      {/* Delete confirm */}
      <Modal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Excluir devedor?"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmDelete(false)}>Cancelar</Button>
            <Button full variant="danger" icon="trash" onClick={handleDelete} disabled={deleteDebtor.isPending}>
              {deleteDebtor.isPending ? 'Excluindo…' : 'Excluir tudo'}
            </Button>
          </>
        }
      >
        <div style={{ paddingTop: 4 }}>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 14.5, lineHeight: 1.6 }}>
            Isso vai apagar <b style={{ color: 'var(--text)' }}>{debtor.name}</b> e todas as suas dívidas e parcelas. Esta ação não pode ser desfeita.
          </p>
        </div>
      </Modal>
    </main>
  )
}
