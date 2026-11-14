import { useEffect, useRef, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { Modal } from '../ui/Modal'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'
import { zodResolver } from '../../lib/zodResolver'
import { parseCep, formatCep } from '../../lib/cep'
import { fetchCep } from '../../lib/viacep'
import { RELIABILITY_OPTIONS } from '../../constants/reliability'
import { AvatarPicker } from './AvatarPicker'
import type { Debtor, DebtorReliability } from '../../types/debtor'
import type { AddressPayload } from '../../api/debtors.api'

export interface DebtorFormPayload {
  id?: string
  name: string
  email: string | null
  phone: string | null
  notes: string | null
  reliability: DebtorReliability | null
  avatarHue: number | null
  avatarEmoji: string | null
  address: AddressPayload | null
}

interface DebtorFormProps {
  open: boolean
  onClose: () => void
  onSave: (data: DebtorFormPayload) => void
  onDelete?: () => void
  editing?: Debtor | null
  /** Name typed in a search ("Cadastrar 'nome'"), for a new debtor. */
  initialName?: string
  loading?: boolean
}

const optional = (max: number, label: string) =>
  z.string().max(max, `${label} deve ter no máximo ${max} caracteres.`)

const debtorFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'O nome é obrigatório.')
    .max(100, 'O nome deve ter no máximo 100 caracteres.'),
  email: optional(254, 'O e-mail').refine(
    (v) => v.trim() === '' || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v.trim()),
    'E-mail inválido.',
  ),
  phone: optional(20, 'O telefone'),
  notes: optional(500, 'As observações'),
  reliability: z.enum(['GOOD_PAYER', 'LATE_BUT_PAYS', 'VEACO']).nullable(),
  avatarHue: z.number().int().min(0).max(360).nullable(),
  avatarEmoji: z.string().nullable(),
  zip: z
    .string()
    .refine((v) => v === '' || /^\d{8}$/.test(v), 'CEP deve conter 8 dígitos.'),
  street: optional(200, 'A rua'),
  number: optional(20, 'O número'),
  complement: optional(100, 'O complemento'),
  neighborhood: optional(100, 'O bairro'),
  city: optional(100, 'A cidade'),
  state: z
    .string()
    .refine((v) => v === '' || /^[A-Za-z]{2}$/.test(v), 'Estado (UF) deve conter 2 letras.'),
})

type DebtorFormValues = z.infer<typeof debtorFormSchema>

const EMPTY: DebtorFormValues = {
  name: '', email: '', phone: '', notes: '', reliability: null, avatarHue: null, avatarEmoji: null,
  zip: '', street: '', number: '', complement: '', neighborhood: '', city: '', state: '',
}

const ADDRESS_FIELDS = ['zip', 'street', 'number', 'complement', 'neighborhood', 'city', 'state'] as const

const UF_OPTIONS = [
  { value: '', label: 'UF' },
  ...['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'].map((uf) => ({ value: uf, label: uf })),
]

export function DebtorForm({ open, onClose, onSave, onDelete, editing, loading, initialName }: DebtorFormProps) {
  const [tab, setTab] = useState<'general' | 'address'>('general')
  const [cepLoading, setCepLoading] = useState(false)
  const lastLookedUp = useRef('')

  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<DebtorFormValues>({
    resolver: zodResolver<DebtorFormValues>(debtorFormSchema),
    defaultValues: EMPTY,
  })

  useEffect(() => {
    if (!open) return
    const a = editing?.address
    reset({
      name: editing?.name ?? initialName ?? '',
      email: editing?.email ?? '',
      phone: editing?.phone ?? '',
      notes: editing?.notes ?? '',
      reliability: editing?.reliability ?? null,
      avatarHue: editing?.avatarHue ?? null,
      avatarEmoji: editing?.avatarEmoji ?? null,
      zip: a?.zip ?? '',
      street: a?.street ?? '',
      number: a?.number ?? '',
      complement: a?.complement ?? '',
      neighborhood: a?.neighborhood ?? '',
      city: a?.city ?? '',
      state: a?.state ?? '',
    })
    setTab('general')
    lastLookedUp.current = a?.zip ?? ''
  }, [open, editing, reset]) // eslint-disable-line react-hooks/exhaustive-deps -- initialName is read when it opens

  // Auto-fill from ViaCEP once the CEP has 8 digits (debounced). Fields stay editable.
  const zip = watch('zip')
  useEffect(() => {
    if (!open || zip?.length !== 8 || zip === lastLookedUp.current) return
    const handle = setTimeout(async () => {
      lastLookedUp.current = zip
      setCepLoading(true)
      const addr = await fetchCep(zip)
      setCepLoading(false)
      if (!addr) return
      if (addr.street) setValue('street', addr.street)
      if (addr.neighborhood) setValue('neighborhood', addr.neighborhood)
      if (addr.city) setValue('city', addr.city)
      if (addr.state) setValue('state', addr.state)
    }, 400)
    return () => clearTimeout(handle)
  }, [zip, open, setValue])

  const addressHasError = ADDRESS_FIELDS.some((f) => errors[f])

  const onSubmit = (v: DebtorFormValues) => {
    const addressFilled = ADDRESS_FIELDS.some((f) => v[f].trim() !== '')
    const address: AddressPayload | null = addressFilled
      ? {
          zip: v.zip.trim() || null,
          street: v.street.trim() || null,
          number: v.number.trim() || null,
          complement: v.complement.trim() || null,
          neighborhood: v.neighborhood.trim() || null,
          city: v.city.trim() || null,
          state: v.state.trim().toUpperCase() || null,
        }
      : null

    onSave({
      id: editing?.id,
      name: v.name.trim(),
      email: v.email.trim() || null,
      phone: v.phone.trim() || null,
      notes: v.notes.trim() || null,
      reliability: v.reliability,
      avatarHue: v.avatarHue,
      avatarEmoji: v.avatarEmoji,
      address,
    })
  }

  const onInvalid = (formErrors: typeof errors) => {
    // Jump to the tab holding the first error so the user sees it.
    const generalHasError = (['name', 'email', 'phone', 'notes'] as const).some((f) => formErrors[f])
    setTab(generalHasError ? 'general' : 'address')
  }

  const tabBtn = (id: 'general' | 'address', label: string, icon: string, dot?: boolean) => (
    <button
      type="button"
      onClick={() => setTab(id)}
      style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        padding: '10px 12px', borderRadius: 'calc(var(--radius) * 0.6)', border: 'none', cursor: 'pointer',
        fontSize: 13.5, fontWeight: 700, fontFamily: 'inherit',
        background: tab === id ? 'var(--surface)' : 'transparent',
        color: tab === id ? 'var(--primary)' : 'var(--text-muted)',
        boxShadow: tab === id ? 'var(--shadow-sm)' : 'none', transition: 'all .15s',
      }}
    >
      <Icon name={icon} size={15} />
      {label}
      {dot && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--overdue)' }} />}
    </button>
  )

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Editar devedor' : 'Novo devedor'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button full icon="check" onClick={handleSubmit(onSubmit, onInvalid)} disabled={loading}>
            {loading ? 'Salvando…' : editing ? 'Salvar' : 'Adicionar'}
          </Button>
        </>
      }
    >
      <div style={{ display: 'flex', gap: 6, background: 'var(--surface-2)', padding: 4, borderRadius: 'calc(var(--radius) * 0.7)', marginBottom: 16 }}>
        {tabBtn('general', 'Geral', 'user')}
        {tabBtn('address', 'Endereço', 'home', addressHasError)}
      </div>

      <div style={{ display: tab === 'general' ? 'flex' : 'none', flexDirection: 'column', gap: 16, paddingTop: 4 }}>
        <AvatarPicker
          name={watch('name')}
          hue={watch('avatarHue')}
          emoji={watch('avatarEmoji')}
          onChange={({ hue, emoji }) => {
            setValue('avatarHue', hue)
            setValue('avatarEmoji', emoji)
          }}
        />
        <Controller control={control} name="name" render={({ field, fieldState }) => (
          <Input label="Nome" value={field.value} onChange={field.onChange} placeholder="Maria Souza" required maxLength={100} error={fieldState.error?.message} autoFocus />
        )} />
        <Controller control={control} name="email" render={({ field, fieldState }) => (
          <Input label="E-mail" value={field.value} onChange={field.onChange} placeholder="maria@email.com" type="email" maxLength={254} hint="Opcional" error={fieldState.error?.message} />
        )} />
        <Controller control={control} name="phone" render={({ field, fieldState }) => (
          <Input label="Telefone" value={field.value} onChange={field.onChange} placeholder="+55 11 91234-5678" inputMode="tel" maxLength={20} hint="Opcional" error={fieldState.error?.message} />
        )} />
        <Controller control={control} name="notes" render={({ field, fieldState }) => (
          <Input label="Observações" value={field.value} onChange={field.onChange} placeholder="Vizinha do bloco B" textarea maxLength={500} hint="Opcional" error={fieldState.error?.message} />
        )} />
        <Controller control={control} name="reliability" render={({ field }) => (
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 9 }}>Perfil de pagamento</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {RELIABILITY_OPTIONS.map((opt) => {
                const active = field.value === opt.id
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => field.onChange(active ? null : opt.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px',
                      borderRadius: 'calc(var(--radius) * 0.6)', cursor: 'pointer', textAlign: 'left',
                      fontFamily: 'inherit', fontWeight: 700, fontSize: 14, transition: 'all .15s',
                      background: active ? `color-mix(in oklch, ${opt.color} 14%, var(--surface))` : 'var(--surface)',
                      border: `1.5px solid ${active ? opt.color : 'var(--border)'}`,
                      color: active ? opt.color : 'var(--text)',
                    }}
                  >
                    <Icon name={opt.icon} size={16} strokeWidth={3} />
                    {opt.label}
                  </button>
                )
              })}
            </div>
          </div>
        )} />
        {editing && onDelete && (
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14, marginTop: 2 }}>
            <Button full variant="danger" icon="trash" onClick={onDelete}>
              Excluir devedor
            </Button>
          </div>
        )}
      </div>

      <div style={{ display: tab === 'address' ? 'flex' : 'none', flexDirection: 'column', gap: 16, paddingTop: 4 }}>
        <div style={{ fontSize: 12.5, color: 'var(--text-faint)', fontWeight: 600, lineHeight: 1.4 }}>
          Todos os campos são opcionais. Digite o CEP para preencher automaticamente.
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ width: '45%' }}>
            <Controller control={control} name="zip" render={({ field, fieldState }) => (
              <Input
                label="CEP"
                value={formatCep(field.value)}
                onChange={(v) => field.onChange(parseCep(v))}
                placeholder="01310-100"
                inputMode="numeric"
                maxLength={9}
                hint={cepLoading ? 'Buscando endereço…' : undefined}
                error={fieldState.error?.message}
              />
            )} />
          </div>
          <div style={{ flex: 1 }}>
            <Controller control={control} name="state" render={({ field, fieldState }) => (
              <Select label="Estado" value={field.value} onChange={field.onChange} options={UF_OPTIONS} error={fieldState.error?.message} />
            )} />
          </div>
        </div>
        <Controller control={control} name="street" render={({ field, fieldState }) => (
          <Input label="Rua" value={field.value} onChange={field.onChange} placeholder="Av. Paulista" maxLength={200} error={fieldState.error?.message} />
        )} />
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ width: '38%' }}>
            <Controller control={control} name="number" render={({ field, fieldState }) => (
              <Input label="Número" value={field.value} onChange={field.onChange} placeholder="1000" inputMode="numeric" maxLength={20} error={fieldState.error?.message} />
            )} />
          </div>
          <div style={{ flex: 1 }}>
            <Controller control={control} name="complement" render={({ field, fieldState }) => (
              <Input label="Complemento" value={field.value} onChange={field.onChange} placeholder="Apto 42" maxLength={100} error={fieldState.error?.message} />
            )} />
          </div>
        </div>
        <Controller control={control} name="neighborhood" render={({ field, fieldState }) => (
          <Input label="Bairro" value={field.value} onChange={field.onChange} placeholder="Bela Vista" maxLength={100} error={fieldState.error?.message} />
        )} />
        <Controller control={control} name="city" render={({ field, fieldState }) => (
          <Input label="Cidade" value={field.value} onChange={field.onChange} placeholder="São Paulo" maxLength={100} error={fieldState.error?.message} />
        )} />
      </div>
    </Modal>
  )
}
