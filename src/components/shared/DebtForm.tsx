import { useState, useEffect } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Icon } from '../ui/Icon'
import type { DebtType } from '../../types/debt'
import type { DebtWithInstallments } from '../../hooks/debts/useDebtsByDebtor'

const TYPE_OPTIONS: { type: DebtType; label: string; icon: string }[] = [
  { type: 'CASH', label: 'Dinheiro', icon: 'banknote' },
  { type: 'PIX', label: 'Pix', icon: 'zap' },
  { type: 'CREDIT_CARD', label: 'Cartão de crédito', icon: 'card' },
  { type: 'PIX_INSTALLMENT', label: 'Pix parcelado', icon: 'layers' },
]

interface DebtFormProps {
  open: boolean
  onClose: () => void
  editing: DebtWithInstallments | null
  onSave: (data: { id: string; description: string | null; type: DebtType }) => void
  onDelete?: (debt: DebtWithInstallments) => void
  loading?: boolean
}

export function DebtForm({ open, onClose, editing, onSave, onDelete, loading }: DebtFormProps) {
  const [description, setDescription] = useState('')
  const [type, setType] = useState<DebtType>('PIX_INSTALLMENT')

  useEffect(() => {
    if (open && editing) {
      setDescription(editing.description ?? '')
      setType(editing.type)
    }
  }, [open, editing])

  function handleSave() {
    if (!editing) return
    onSave({ id: editing.id, description: description.trim() || null, type })
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Editar dívida"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button full icon="check" onClick={handleSave} disabled={loading}>
            {loading ? 'Salvando…' : 'Salvar'}
          </Button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18, paddingTop: 4 }}>
        <Input
          label="Descrição"
          value={description}
          onChange={setDescription}
          placeholder="Empréstimo de junho"
          hint="Opcional"
        />
        <div>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 7 }}>Tipo</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {TYPE_OPTIONS.map((opt) => {
              const active = type === opt.type
              return (
                <button
                  key={opt.type}
                  type="button"
                  onClick={() => setType(opt.type)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 9,
                    padding: '13px 14px', borderRadius: 'calc(var(--radius)*0.6)',
                    cursor: 'pointer', textAlign: 'left',
                    background: active ? 'var(--primary-weak)' : 'var(--surface)',
                    border: `1.5px solid ${active ? 'var(--primary)' : 'var(--border)'}`,
                    color: active ? 'var(--primary)' : 'var(--text)',
                    fontWeight: 700, fontSize: 14, transition: 'all .15s', fontFamily: 'inherit',
                  }}
                >
                  <Icon name={opt.icon} size={18} /> {opt.label}
                </button>
              )
            })}
          </div>
        </div>

        {onDelete && editing && (
          <div style={{ marginTop: 4, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
            <button
              type="button"
              onClick={() => onDelete(editing)}
              style={{ width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px', borderRadius: 'calc(var(--radius)*0.6)', border: 'none', background: 'transparent', color: 'var(--overdue)', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', transition: 'background .15s' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--overdue-weak)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
            >
              <Icon name="trash" size={16} /> Excluir dívida
            </button>
          </div>
        )}
      </div>
    </Modal>
  )
}
