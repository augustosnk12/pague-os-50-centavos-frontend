import { useState } from 'react'
import { Modal } from '../ui/Modal'
import { Input } from '../ui/Input'
import { Icon } from '../ui/Icon'
import type { DebtType } from '../../types/debt'
import type { DebtWithInstallments } from '../../hooks/debts/useDebtsByDebtor'

const TYPES: { type: DebtType; label: string; icon: string }[] = [
  { type: 'CASH', label: 'Dinheiro', icon: 'banknote' },
  { type: 'PIX', label: 'Pix', icon: 'zap' },
  { type: 'CREDIT_CARD', label: 'Cartão de crédito', icon: 'card' },
  { type: 'PIX_INSTALLMENT', label: 'Pix parcelado', icon: 'layers' },
]
const A_VISTA: DebtType[] = ['CASH', 'PIX']

const paymentsOf = (d: DebtWithInstallments) => d.installments.reduce((n, i) => n + (i.payments?.length ?? 0), 0)

interface DebtFormProps {
  open: boolean
  onClose: () => void
  editing: DebtWithInstallments | null
  onSave: (data: { id: string; description: string | null; type: DebtType }) => void
  /** Asks to delete (only offered when nothing was paid). */
  onDelete?: (debt: DebtWithInstallments) => void
  loading?: boolean
}

/**
 * Editar dívida (improvement 46): description and type. With payments the
 * type is fixed (it would change what the installments mean); a monthly debt
 * stays Dinheiro or Pix. Deleting is only offered when nothing was paid —
 * otherwise it explains what to do instead.
 */
export function DebtForm({ open, onClose, editing, onSave, onDelete, loading }: DebtFormProps) {
  const [last, setLast] = useState(editing)
  const [description, setDescription] = useState(editing?.description ?? '')
  const [type, setType] = useState<DebtType>(editing?.type ?? 'PIX')
  if (editing && editing !== last) {
    setLast(editing)
    setDescription(editing.description ?? '')
    setType(editing.type)
  }
  const d = editing ?? last
  if (!d) return null

  const paid = paymentsOf(d)
  const monthly = d.recurrence === 'MONTHLY'
  const choices = paid > 0 ? TYPES.filter((t) => t.type === d.type) : monthly ? TYPES.filter((t) => A_VISTA.includes(t.type)) : TYPES
  const unchanged = (description.trim() || null) === (d.description || null) && type === d.type

  return (
    <Modal
      open={open && !!editing}
      onClose={onClose}
      title="Editar dívida"
      footer={
        <button
          type="button"
          className="lt-btn-lg"
          data-variant="primary"
          disabled={loading || unchanged}
          onClick={() => onSave({ id: d.id, description: description.trim() || null, type })}
        >
          <Icon name="check" size={17} /> {loading ? 'Salvando…' : 'Salvar'}
        </button>
      }
    >
      <div className="lt-df">
        <Input label="Descrição" value={description} onChange={setDescription} placeholder="Empréstimo de junho" maxLength={120} />
        <div>
          <div className="lt-flabel lt-de-label" id="de-type-l">
            <span>Tipo</span>
            {paid > 0 ? <span className="lt-de-fixed">Fixo: já há pagamentos</span> : monthly ? <span className="lt-de-fixed">Mensal: só Dinheiro ou Pix</span> : null}
          </div>
          {paid > 0 ? (
            <div className="lt-nd-type lt-de-type-fixed" aria-labelledby="de-type-l">
              <Icon name={choices[0]?.icon ?? 'layers'} size={19} />
              <span className="lt-nd-type-t">{choices[0]?.label ?? d.type}</span>
            </div>
          ) : (
            <div className="lt-nd-types" role="group" aria-labelledby="de-type-l">
              {choices.map((t) => (
                <button key={t.type} type="button" className="lt-nd-type" aria-pressed={type === t.type} onClick={() => setType(t.type)}>
                  <Icon name={t.icon} size={19} />
                  <span className="lt-nd-type-t">{t.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="lt-de-danger">
          {paid > 0 ? (
            <>
              <div className="lt-de-danger-t">Não dá para excluir</div>
              <div className="lt-de-danger-s">
                {paid === 1 ? 'Há 1 pagamento registrado.' : `Há ${paid} pagamentos registrados.`} Para tirar do caminho, use “Quitar” na dívida ou arquive o devedor depois de quitar.
              </div>
            </>
          ) : (
            onDelete && (
              <button type="button" className="lt-de-del" onClick={() => onDelete(d)}>
                <Icon name="trash" size={15} /> Excluir dívida
              </button>
            )
          )}
        </div>
      </div>
    </Modal>
  )
}
