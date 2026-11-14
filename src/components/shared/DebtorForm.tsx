import { useEffect, useState } from 'react'
import { Modal } from '../ui/Modal'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { Icon } from '../ui/Icon'
import { Avatar } from '../ui/Avatar'
import { parseCep, formatCep } from '../../lib/cep'
import { fetchCep } from '../../lib/viacep'
import { maskPhone, phoneProblem } from '../../lib/phone'
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
  editing?: Debtor | null
  loading?: boolean
  /** Name typed in a search ("Cadastrar 'nome'"), for a new debtor. */
  initialName?: string
}

const UF_OPTIONS = [
  { value: '', label: 'UF' },
  ...['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'].map((uf) => ({ value: uf, label: uf })),
]

interface Values {
  name: string
  phone: string
  email: string
  notes: string
  reliability: DebtorReliability | null
  avatarHue: number | null
  avatarEmoji: string | null
  zip: string
  street: string
  number: string
  complement: string
  neighborhood: string
  city: string
  state: string
}
type Errors = Partial<Record<'name' | 'phone' | 'email', string>>
/** hidden: only "Adicionar endereço"; cep: the CEP first; full: every field. */
type AddressStep = 'hidden' | 'cep' | 'full'
type CepStatus = 'idle' | 'loading' | 'found' | 'notfound'

const ADDRESS_KEYS = ['zip', 'street', 'number', 'complement', 'neighborhood', 'city', 'state'] as const

function fromDebtor(d: Debtor | null | undefined, initialName: string): Values {
  const a = d?.address
  return {
    name: d?.name ?? initialName,
    phone: d?.phone ? maskPhone(d.phone) : '',
    email: d?.email ?? '',
    notes: d?.notes ?? '',
    reliability: d?.reliability ?? null,
    avatarHue: d?.avatarHue ?? null,
    avatarEmoji: d?.avatarEmoji ?? null,
    zip: a?.zip ?? '',
    street: a?.street ?? '',
    number: a?.number ?? '',
    complement: a?.complement ?? '',
    neighborhood: a?.neighborhood ?? '',
    city: a?.city ?? '',
    state: a?.state ?? '',
  }
}

const focusIn = (id: string) => requestAnimationFrame(() => document.querySelector<HTMLElement>(`#${id} input, #${id} textarea`)?.focus())

/**
 * Novo devedor / Editar cadastro (improvement 45): Nome (the only required
 * field) and Telefone with a mask; "Mais dados" reveals e-mail, how they
 * usually pay, a note and the address — the CEP first (ViaCEP fills the
 * rest and the cursor goes to Número), every field by hand when the CEP is
 * unknown or not found. Errors show on the field itself.
 */
export function DebtorForm({ open, onClose, onSave, editing, loading, initialName = '' }: DebtorFormProps) {
  const [v, setV] = useState<Values>(() => fromDebtor(editing, initialName))
  const [errors, setErrors] = useState<Errors>({})
  const [more, setMore] = useState(false)
  const [pickAvatar, setPickAvatar] = useState(false)
  const [addr, setAddr] = useState<AddressStep>('hidden')
  const [cep, setCep] = useState<CepStatus>('idle')

  // Fresh state each time it opens.
  useEffect(() => {
    if (!open) return
    const start = fromDebtor(editing, initialName)
    setV(start)
    setErrors({})
    setPickAvatar(false)
    const hasAddress = ADDRESS_KEYS.some((k) => start[k].trim())
    setMore(!!editing && (hasAddress || !!start.email || !!start.notes || !!start.reliability))
    setAddr(hasAddress ? 'full' : 'hidden')
    setCep('idle')
  }, [open, editing]) // eslint-disable-line react-hooks/exhaustive-deps -- initialName is read when it opens

  const set = <K extends keyof Values>(k: K, value: Values[K]) => {
    setV((cur) => ({ ...cur, [k]: value }))
    if (k in errors) setErrors((e) => ({ ...e, [k]: undefined }))
  }

  const lookUp = async (digits: string) => {
    setCep('loading')
    const found = await fetchCep(digits)
    if (!found) {
      // Not found or ViaCEP down: fill it in by hand.
      setCep('notfound')
      setAddr('full')
      focusIn('df-street')
      return
    }
    setV((cur) => ({
      ...cur,
      street: found.street || cur.street,
      neighborhood: found.neighborhood || cur.neighborhood,
      city: found.city || cur.city,
      state: found.state || cur.state,
    }))
    setCep('found')
    setAddr('full')
    focusIn('df-number')
  }

  const onZip = (raw: string) => {
    const digits = parseCep(raw)
    set('zip', digits)
    if (digits.length === 8 && digits !== v.zip) void lookUp(digits)
    else if (digits.length < 8) setCep('idle')
  }

  const save = () => {
    const name = v.name.trim()
    const email = v.email.trim()
    const next: Errors = {
      name: name ? undefined : 'Informe o nome',
      phone: phoneProblem(v.phone) ?? undefined,
      email: email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) ? 'E-mail inválido' : undefined,
    }
    setErrors(next)
    const first = (['name', 'phone', 'email'] as const).find((k) => next[k])
    if (first) {
      if (first === 'email') setMore(true)
      focusIn(`df-${first}`)
      return
    }
    const filled = ADDRESS_KEYS.some((k) => v[k].trim())
    const address: AddressPayload | null = filled
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
      name,
      email: email || null,
      phone: v.phone.trim() || null,
      notes: v.notes.trim() || null,
      reliability: v.reliability,
      avatarHue: v.avatarHue,
      avatarEmoji: v.avatarEmoji,
      address,
    })
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Editar cadastro' : 'Novo devedor'}
      footer={
        <button type="button" className="lt-btn-lg" data-variant="primary" onClick={save} disabled={loading}>
          <Icon name="check" size={17} /> {loading ? 'Salvando…' : editing ? 'Salvar alterações' : 'Salvar devedor'}
        </button>
      }
    >
      <div className="lt-df">
        <div className="lt-df-av">
          <button type="button" className="lt-df-av-btn" aria-expanded={pickAvatar} aria-label="Trocar avatar" onClick={() => setPickAvatar((p) => !p)}>
            <Avatar name={v.name.trim() || 'Novo devedor'} size={48} hue={v.avatarHue} emoji={v.avatarEmoji} />
          </button>
          <button type="button" className="lt-more-link" style={{ padding: 0 }} aria-expanded={pickAvatar} onClick={() => setPickAvatar((p) => !p)}>
            Trocar avatar
          </button>
        </div>
        {pickAvatar && (
          <AvatarPicker
            name={v.name}
            hue={v.avatarHue}
            emoji={v.avatarEmoji}
            onChange={({ hue, emoji }) => setV((cur) => ({ ...cur, avatarHue: hue, avatarEmoji: emoji }))}
          />
        )}

        <div id="df-name">
          <Input label="Nome" value={v.name} onChange={(x) => set('name', x)} placeholder="Maria Souza" required maxLength={100} error={errors.name} autoFocus={!editing} />
        </div>
        <div id="df-phone">
          <Input
            label="Telefone"
            value={v.phone}
            onChange={(x) => set('phone', maskPhone(x))}
            placeholder="(11) 98765-4321"
            inputMode="tel"
            maxLength={20}
            hint={errors.phone ? undefined : 'Para cobrar no WhatsApp'}
            error={errors.phone}
          />
        </div>

        <button type="button" className="lt-more-link lt-df-more" aria-expanded={more} onClick={() => setMore((m) => !m)}>
          {more ? 'Menos dados' : 'Mais dados'}
          <Icon name="chevronDown" size={13} style={more ? { transform: 'rotate(180deg)' } : undefined} />
        </button>

        {more && (
          <>
            <div id="df-email">
              <Input label="E-mail" value={v.email} onChange={(x) => set('email', x)} placeholder="maria@email.com" type="email" maxLength={254} error={errors.email} />
            </div>
            <div>
              <div className="lt-flabel" id="df-rel-l">Como costuma pagar</div>
              <div className="lt-df-chips" role="group" aria-labelledby="df-rel-l">
                {RELIABILITY_OPTIONS.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    className="lt-chip lt-df-rel"
                    aria-pressed={v.reliability === o.id}
                    style={v.reliability === o.id ? { color: o.color, borderColor: o.color } : undefined}
                    onClick={() => set('reliability', v.reliability === o.id ? null : o.id)}
                  >
                    <Icon name={o.icon} size={13} strokeWidth={3} /> {o.label}
                  </button>
                ))}
              </div>
            </div>
            <Input label="Anotação" value={v.notes} onChange={(x) => set('notes', x)} placeholder="Ex.: prefere ser lembrada de manhã" textarea rows={2} maxLength={500} />

            {addr === 'hidden' ? (
              <button
                type="button"
                className="lt-more-link lt-df-more"
                onClick={() => {
                  setAddr('cep')
                  focusIn('df-zip')
                }}
              >
                <Icon name="plus" size={13} /> Adicionar endereço
              </button>
            ) : (
              <fieldset className="lt-df-addr">
                <legend className="lt-flabel">Endereço</legend>
                <div className="lt-df-zip">
                  <div id="df-zip" style={{ maxWidth: 200 }}>
                    <Input label="CEP" value={formatCep(v.zip)} onChange={onZip} placeholder="00000-000" inputMode="numeric" maxLength={9} />
                  </div>
                  {addr === 'cep' && cep !== 'loading' && (
                    <button
                      type="button"
                      className="lt-more-link"
                      style={{ padding: 0 }}
                      onClick={() => {
                        setAddr('full')
                        focusIn('df-street')
                      }}
                    >
                      Não sei o CEP
                    </button>
                  )}
                </div>
                <div className="lt-df-cep" role="status" data-tone={cep}>
                  {cep === 'loading' && 'Buscando o endereço…'}
                  {cep === 'found' && (
                    <>
                      <Icon name="check" size={13} strokeWidth={3} /> Endereço encontrado
                    </>
                  )}
                  {cep === 'notfound' && (
                    <>
                      <Icon name="alert" size={13} /> CEP não encontrado. Preencha o endereço.
                    </>
                  )}
                </div>
                {addr === 'full' && (
                  <>
                    <div id="df-street">
                      <Input label="Rua" value={v.street} onChange={(x) => set('street', x)} placeholder="Rua ou avenida" maxLength={200} />
                    </div>
                    <div className="lt-df-2">
                      <div id="df-number">
                        <Input label="Número" value={v.number} onChange={(x) => set('number', x)} placeholder="123" inputMode="numeric" maxLength={20} />
                      </div>
                      <Input label="Complemento" value={v.complement} onChange={(x) => set('complement', x)} placeholder="Apto, bloco" maxLength={100} />
                    </div>
                    <Input label="Bairro" value={v.neighborhood} onChange={(x) => set('neighborhood', x)} placeholder="Bairro" maxLength={100} />
                    <div className="lt-df-city">
                      <Input label="Cidade" value={v.city} onChange={(x) => set('city', x)} placeholder="Cidade" maxLength={100} />
                      <Select label="UF" value={v.state} onChange={(x) => set('state', x)} options={UF_OPTIONS} />
                    </div>
                  </>
                )}
              </fieldset>
            )}
          </>
        )}
      </div>
    </Modal>
  )
}
