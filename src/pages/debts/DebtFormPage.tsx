import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useDebtors } from '../../hooks/debtors/useDebtors'
import { useCreateDebt } from '../../hooks/debts/useCreateDebt'
import { useCreateDebtor } from '../../hooks/debtors/useCreateDebtor'
import { useSettings } from '../../hooks/settings/useSettings'
import { useToast } from '../../contexts/ToastContext'
import { Detail, usePreferences } from '../../contexts/PreferencesContext'
import { Input } from '../../components/ui/Input'
import { DateInput } from '../../components/ui/DateInput'
import { Icon } from '../../components/ui/Icon'
import { DebtorForm, type DebtorFormPayload } from '../../components/shared/DebtorForm'
import { DebtorPicker } from '../../components/shared/DebtorPicker'
import { rememberDebtor } from '../../lib/recentDebtors'
import { genInstallments, translateApiError } from '../../lib/utils'
import { formatCents, parseCurrencyDigits } from '../../lib/currency'
import { getApiError } from '../../lib/api'
import { localToday } from '../../lib/date'
import { backLabel } from '../../lib/navOrigin'
import { scrollBehavior } from '../../lib/scroll'
import { fmtList, fmtMoney } from '../../lib/format'
import { defaultDue, isInstallmentType, recurringPreview, type RecurrenceEnd } from '../../lib/newDebt'
import type { DebtType } from '../../types/debt'

const TYPES: { type: DebtType; label: string; sub: string; icon: string }[] = [
  { type: 'CASH', label: 'Dinheiro', sub: 'À vista', icon: 'banknote' },
  { type: 'PIX', label: 'Pix', sub: 'À vista', icon: 'zap' },
  { type: 'CREDIT_CARD', label: 'Cartão de crédito', sub: 'Parcelado', icon: 'card' },
  { type: 'PIX_INSTALLMENT', label: 'Pix parcelado', sub: 'Parcelado', icon: 'layers' },
]
const ENDS: { id: RecurrenceEnd; label: string }[] = [
  { id: 'never', label: 'Sem fim' },
  { id: 'count', label: 'Após' },
  { id: 'date', label: 'Em uma data' },
]
const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? name

/** Which field is missing (its id, to focus it) and how to say it. */
type Missing = { field: string; text: string } | null

/**
 * Nova dívida (S8, improvements 16, 18, 23 and 39): debtor picker with search,
 * À vista / Parcelado on each type, first due date from the type's default
 * day, "Repetir todo mês" for Dinheiro and Pix, a preview, and the footer says
 * what is still missing instead of a disabled button with no reason.
 */
export function DebtFormPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { showToast } = useToast()
  const { detail } = usePreferences()
  const today = localToday()

  const { data: debtors = [] } = useDebtors()
  const { data: settings } = useSettings()
  const createDebt = useCreateDebt()
  const createDebtor = useCreateDebtor()

  const [debtorId, setDebtorId] = useState(searchParams.get('debtorId') ?? '')
  const [type, setType] = useState<DebtType>('PIX')
  const [cents, setCents] = useState('')
  const [count, setCount] = useState('')
  const [dueEdited, setDueEdited] = useState<string | null>(null)
  const [desc, setDesc] = useState('')
  const [descOpen, setDescOpen] = useState(false)
  const [rec, setRec] = useState(false)
  const [recEnd, setRecEnd] = useState<RecurrenceEnd>('never')
  const [recN, setRecN] = useState('')
  const [recUntil, setRecUntil] = useState('')
  const [tried, setTried] = useState(false)
  const [newDebtor, setNewDebtor] = useState<string | null>(null)
  const [err, setErr] = useState('')

  const debtor = debtors.find((d) => d.id === debtorId) ?? null
  const inst = isInstallmentType(type)
  const isRec = rec && !inst
  // The date follows the type's default until the user changes it (improvement 23).
  const due = dueEdited ?? defaultDue(type, settings, today)
  const amount = parseInt(cents || '0', 10)
  const n = inst ? Math.max(1, parseInt(count, 10) || 1) : 1
  const months = parseInt(recN, 10) || 0
  const preview = amount > 0 && due && !isRec ? genInstallments(amount / 100, n, `${due}T00:00:00.000Z`) : []
  const recDates = isRec && due ? recurringPreview(due, recEnd, months, recUntil) : []
  const dueDay = due ? Number(due.slice(8, 10)) : 0
  const defaultDay = type === 'CREDIT_CARD' ? settings?.defaultCardDueDay : type === 'PIX_INSTALLMENT' ? settings?.defaultPixInstallmentDueDay : null

  const missing: Missing = !debtor
    ? { field: 'nd-debtor', text: 'Escolha para quem é a dívida' }
    : !(amount > 0)
      ? { field: 'nd-amount', text: isRec ? 'Informe o valor por mês' : 'Informe o valor' }
      : isRec && recEnd === 'count' && !(months > 0)
        ? { field: 'nd-recn', text: 'Informe por quantos meses' }
        : isRec && recEnd === 'date' && !(recUntil && recUntil >= due)
          ? { field: 'nd-recu', text: recUntil ? 'A última cobrança deve ser depois do primeiro vencimento' : 'Informe a data da última cobrança' }
          : !due
            ? { field: 'nd-due', text: 'Informe o vencimento' }
            : null

  const focusField = (field: string) => {
    const box = document.getElementById(field)
    const el = box?.matches('input, button') ? box : box?.querySelector<HTMLElement>('input, button')
    el?.focus()
    box?.scrollIntoView({ block: 'center', behavior: scrollBehavior() })
  }

  // "‹ Parcelas", "‹ Maria Rocha"…: where Voltar goes (improvement 24).
  const origin = (window.history.state as { idx?: number } | null)?.idx ? backLabel() : 'Painel'
  const back = () => {
    // Opened directly (no history in the app): go to the Painel.
    if ((window.history.state as { idx?: number } | null)?.idx) navigate(-1)
    else navigate('/dashboard')
  }

  const submit = () => {
    setErr('')
    if (missing) {
      setTried(true)
      focusField(missing.field)
      return
    }
    if (createDebt.isPending || !debtor) return
    createDebt.mutate(
      {
        debtorId: debtor.id,
        type,
        totalAmount: (amount / 100).toFixed(2),
        numberOfInstallments: n,
        firstDueDate: `${due}T00:00:00.000Z`,
        description: desc.trim() || null,
        ...(isRec
          ? {
              recurrence: {
                type: 'MONTHLY' as const,
                occurrences: recEnd === 'count' ? months : null,
                endsAt: recEnd === 'date' ? `${recUntil}T00:00:00.000Z` : null,
              },
              today,
            }
          : {}),
      },
      {
        onSuccess: (data) => {
          rememberDebtor(debtor.id)
          showToast(
            isRec ? `Dívida recorrente criada · ${firstName(debtor.name)}` : `Dívida criada · ${data.installments.length} ${data.installments.length === 1 ? 'parcela' : 'parcelas'}`,
            { status: 'PENDING', icon: 'check' },
          )
          // The profile opens with the new debt expanded and in view.
          navigate(`/debtors/${debtor.id}?divida=${data.debt.id}`, { replace: true })
        },
        onError: (e: unknown) => setErr(translateApiError(getApiError(e), 'Erro ao criar dívida.')),
      },
    )
  }

  const saveDebtor = (data: DebtorFormPayload) => {
    createDebtor.mutate(data, {
      onSuccess: (d) => {
        setDebtorId(d.id)
        setNewDebtor(null)
        showToast(`${firstName(d.name)} cadastrado`, { icon: 'check' })
      },
      onError: (e: unknown) => showToast(translateApiError(getApiError(e), 'Erro ao cadastrar devedor.'), { icon: 'alert' }),
    })
  }

  const showMissing = tried && missing
  return (
    <main className="lt-page lt-nd">
      <button type="button" className="lt-back" onClick={back} aria-label={`Voltar para ${origin ?? 'a tela anterior'}`}>
        <Icon name="chevronLeft" size={17} /> {origin ?? 'Voltar'}
      </button>
      <h1 className="lt-nd-h">Nova dívida</h1>
      <Detail>
        <p className="lt-nd-sub">Registre quanto a pessoa deve e gere as parcelas.</p>
      </Detail>

      <div className="lt-nd-form">
        <DebtorPicker
          debtors={debtors}
          value={debtor}
          onChange={(d) => setDebtorId(d.id)}
          onCreate={(name) => setNewDebtor(name)}
          invalid={!!showMissing && missing.field === 'nd-debtor'}
        />

        <div className="lt-field">
          <div className="lt-flabel" id="nd-type-l">Tipo</div>
          <div className="lt-nd-types" role="group" aria-labelledby="nd-type-l">
            {TYPES.map((t) => (
              <button key={t.type} type="button" className="lt-nd-type" aria-pressed={type === t.type} onClick={() => setType(t.type)}>
                <Icon name={t.icon} size={19} />
                <span>
                  <span className="lt-nd-type-t">{t.label}</span>
                  <span className="lt-nd-type-s">{t.sub}</span>
                </span>
              </button>
            ))}
          </div>
          {!inst && !isRec && (
            <Detail>
              <p className="lt-nd-tip">
                <Icon name="bulb" size={15} /> {type === 'CASH' ? 'Dinheiro' : 'Pix'} é cobrança à vista (1 parcela). Para parcelar, use Cartão ou Pix parcelado.
              </p>
            </Detail>
          )}
        </div>

        <div className="lt-nd-row" data-two={inst || undefined}>
          <div id="nd-amount">
            <Input
              label={isRec ? 'Valor por mês' : 'Valor total'}
              value={formatCents(cents)}
              onChange={(v) => setCents(parseCurrencyDigits(v))}
              placeholder="0,00"
              prefix="R$"
              inputMode="numeric"
              required
              error={showMissing && missing.field === 'nd-amount' ? missing.text : ''}
            />
          </div>
          {inst && (
            <Input label="Parcelas" value={count} onChange={(v) => setCount(v.replace(/\D/g, '').slice(0, 3))} placeholder="1" inputMode="numeric" maxLength={3} />
          )}
        </div>

        {!inst && (
          <div className="lt-field">
            <button type="button" role="switch" aria-checked={isRec} className="lt-switch-row" onClick={() => setRec((v) => !v)}>
              <Icon name="history" size={18} />
              <span style={{ flex: 1, textAlign: 'left' }}>
                <span className="lt-switch-t">Repetir todo mês</span>
                <span className="lt-switch-s">Mensalidade, aluguel, assinatura dividida</span>
              </span>
              <span className="lt-switch" aria-hidden="true"><span /></span>
            </button>
            {isRec && (
              <div className="lt-nd-ends">
                <div className="lt-flabel" id="nd-end-l">Termina</div>
                <div className="lt-seg" role="group" aria-labelledby="nd-end-l">
                  {ENDS.map((e) => (
                    <button key={e.id} type="button" aria-pressed={recEnd === e.id} onClick={() => setRecEnd(e.id)}>{e.label}</button>
                  ))}
                </div>
                {recEnd === 'count' && (
                  <div id="nd-recn" className="lt-nd-months">
                    <Input
                      value={recN}
                      onChange={(v) => setRecN(v.replace(/\D/g, '').slice(0, 3))}
                      placeholder="Qtd."
                      inputMode="numeric"
                      maxLength={3}
                      error={showMissing && missing.field === 'nd-recn' ? missing.text : ''}
                    />
                    <span className="lt-nd-months-k">meses</span>
                  </div>
                )}
                {recEnd === 'date' && (
                  <div id="nd-recu" className="lt-nd-until">
                    <DateInput label="Última cobrança em" value={recUntil} onChange={setRecUntil} min={due} />
                    {showMissing && missing.field === 'nd-recu' && <div className="lt-field-error">{missing.text}</div>}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="lt-field" id="nd-due">
          <DateInput label={inst || isRec ? 'Primeiro vencimento' : 'Vencimento'} value={due} onChange={(v) => setDueEdited(v)} required />
          {isRec && dueDay > 0 && (
            <div className="lt-nd-hint">Depois, todo dia {dueDay}{dueDay > 28 ? ' (ou o último dia, nos meses mais curtos)' : ''}</div>
          )}
          {inst && (
            <Detail>
              <div className="lt-nd-hint">
                {defaultDay
                  ? `Padrão ${type === 'CREDIT_CARD' ? 'do cartão' : 'do Pix parcelado'}: dia ${defaultDay}${dueEdited ? ' · data alterada' : ''}`
                  : 'Sem dia padrão para este tipo'}
              </div>
            </Detail>
          )}
        </div>

        <div className="lt-field">
          {detail === 'lean' && !descOpen && !desc ? (
            <button type="button" className="lt-more-link" style={{ padding: 0 }} onClick={() => setDescOpen(true)}>
              <Icon name="plus" size={14} /> Descrição
            </button>
          ) : (
            <Input label="Descrição" value={desc} onChange={setDesc} placeholder="Empréstimo de junho" hint="Opcional" maxLength={120} autoFocus={descOpen && !desc} />
          )}
        </div>

        {isRec && amount > 0 && (
          <Detail>
            <section className="lt-nd-pv" aria-label="Prévia das cobranças">
              <div className="lt-nd-pv-h">
                <span><Icon name="history" size={16} /> {fmtMoney(amount / 100)} todo dia {dueDay}</span>
              </div>
              {recDates.map((d) => (
                <div key={d} className="lt-nd-pv-row">
                  <span className="lt-nd-pv-d">{fmtList(d)}</span>
                  <b>{fmtMoney(amount / 100)}</b>
                </div>
              ))}
              <div className="lt-nd-pv-end">
                ⋯ {recEnd === 'never' ? 'sem data para terminar' : recEnd === 'count' ? `${months} ${months === 1 ? 'cobrança' : 'cobranças'} no total` : recUntil ? `última em ${fmtList(recUntil)}` : 'escolha a data final'}
              </div>
            </section>
          </Detail>
        )}

        {preview.length > 0 && (
          <Detail>
            <section className="lt-nd-pv" aria-label="Prévia das parcelas">
              <div className="lt-nd-pv-h">
                <span><Icon name="layers" size={16} /> Prévia das parcelas</span>
                <span className="lt-nd-pv-k">{preview.length}× de até {fmtMoney(Math.max(...preview.map((p) => Number(p.amount))))}</span>
              </div>
              <div className="lt-nd-pv-list">
                {preview.slice(0, 12).map((p) => (
                  <div key={p.number} className="lt-nd-pv-row">
                    <span className="lt-nd-pv-n">{p.number}</span>
                    <span className="lt-nd-pv-d">{fmtList(p.dueDate)}</span>
                    <b>{fmtMoney(p.amount)}</b>
                  </div>
                ))}
                {preview.length > 12 && <div className="lt-nd-pv-end">+ {preview.length - 12} parcelas</div>}
              </div>
            </section>
          </Detail>
        )}

        {err && <div className="lt-field-error" role="alert">{err}</div>}

        <div className="lt-nd-foot">
          <div className="lt-nd-need" role="status">
            {missing && (
              <>
                <Icon name="info" size={14} /> {missing.text}
              </>
            )}
          </div>
          <div className="lt-nd-btns">
            <button type="button" className="lt-btn-lg" data-variant="secondary" onClick={back}>Cancelar</button>
            <button type="button" className="lt-btn-lg" data-variant="primary" aria-disabled={!!missing || createDebt.isPending || undefined} onClick={submit}>
              <Icon name="check" size={17} />
              {createDebt.isPending ? 'Criando…' : `Criar dívida${isRec ? ' recorrente' : ''}${debtor ? ` p/ ${firstName(debtor.name)}` : ''}`}
            </button>
          </div>
        </div>
      </div>

      <DebtorForm open={newDebtor !== null} initialName={newDebtor ?? ''} onClose={() => setNewDebtor(null)} onSave={saveDebtor} loading={createDebtor.isPending} />
    </main>
  )
}
