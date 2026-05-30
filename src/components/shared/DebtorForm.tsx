import { useEffect, useState } from 'react'
import { Modal } from '../ui/Modal'
import { Input } from '../ui/Input'
import { Button } from '../ui/Button'
import type { Debtor } from '../../types/debtor'

interface DebtorFormProps {
  open: boolean
  onClose: () => void
  onSave: (data: { id?: string; name: string; email: string | null; phone: string | null; notes: string | null }) => void
  onDelete?: () => void
  editing?: Debtor | null
  loading?: boolean
}

export function DebtorForm({ open, onClose, onSave, onDelete, editing, loading }: DebtorFormProps) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [notes, setNotes] = useState('')
  const [err, setErr] = useState('')

  useEffect(() => {
    if (open) {
      setName(editing?.name ?? '')
      setEmail(editing?.email ?? '')
      setPhone(editing?.phone ?? '')
      setNotes(editing?.notes ?? '')
      setErr('')
    }
  }, [open, editing])

  const save = () => {
    if (!name.trim()) return setErr('O nome é obrigatório.')
    onSave({
      id: editing?.id,
      name: name.trim(),
      email: email.trim() || null,
      phone: phone.trim() || null,
      notes: notes.trim() || null,
    })
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Editar devedor' : 'Novo devedor'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button full icon="check" onClick={save} disabled={loading}>
            {loading ? 'Salvando…' : editing ? 'Salvar' : 'Adicionar'}
          </Button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 4 }}>
        <Input label="Nome" value={name} onChange={(v) => { setName(v); setErr('') }} placeholder="Maria Souza" required maxLength={100} error={err} autoFocus />
        <Input label="E-mail" value={email} onChange={setEmail} placeholder="maria@email.com" type="email" maxLength={254} hint="Opcional" />
        <Input label="Telefone" value={phone} onChange={setPhone} placeholder="+55 11 91234-5678" inputMode="tel" maxLength={20} hint="Opcional" />
        <Input label="Observações" value={notes} onChange={setNotes} placeholder="Vizinha do bloco B" textarea maxLength={500} hint="Opcional" />
        {editing && onDelete && (
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14, marginTop: 2 }}>
            <Button full variant="danger" icon="trash" onClick={onDelete}>
              Excluir devedor
            </Button>
          </div>
        )}
      </div>
    </Modal>
  )
}
