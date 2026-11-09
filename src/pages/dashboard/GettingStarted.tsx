import { lazy, Suspense, useId, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { Icon } from '../../components/ui/Icon'
import { useDebtors } from '../../hooks/debtors/useDebtors'
import { useCreateDebtor } from '../../hooks/debtors/useCreateDebtor'
import { useToast } from '../../contexts/ToastContext'
import { getApiError } from '../../lib/api'
import { translateApiError } from '../../lib/utils'
import type { DebtorFormPayload } from '../../components/shared/DebtorForm'

// The form (with CEP lookup, avatar picker…) is only downloaded when opened.
const DebtorForm = lazy(() => import('../../components/shared/DebtorForm').then((m) => ({ default: m.DebtorForm })))

const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? name
/** Same rule as the mock: names ending in "a" read as feminine ("Maria cadastrada"). */
const registered = (first: string) => `${first} cadastrad${/a$/i.test(first) ? 'a' : 'o'}`

/**
 * "Comece em 2 passos" (improvement 48), shown while the account has no debt.
 * Step 2 unlocks after step 1; with a single debtor, the new debt already
 * comes with that person selected.
 */
export function GettingStarted() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const { data: debtors = [] } = useDebtors()
  const createDebtor = useCreateDebtor()
  const [formOpen, setFormOpen] = useState(false)
  // Mounted from the first opening on, so it can play its closing animation.
  const [formLoaded, setFormLoaded] = useState(false)
  const lockedId = useId()

  const has = debtors.length > 0
  const last = has ? debtors[debtors.length - 1] : null
  const lastFirst = last ? firstName(last.name) : ''

  const handleCreate = (data: DebtorFormPayload) => {
    createDebtor.mutate(data, {
      onSuccess: (d) => {
        setFormOpen(false)
        showToast(registered(firstName(d.name)),{ icon: 'check', status: 'PAID' })
      },
      onError: (e: unknown) => showToast(translateApiError(getApiError(e), 'Erro ao criar devedor.'), { icon: 'alert' }),
    })
  }

  const newDebt = () => {
    if (!has) return
    navigate(debtors.length === 1 ? `/debts/new?debtorId=${debtors[0].id}` : '/debts/new')
  }

  return (
    <section className="lt-card lt-onb" aria-labelledby="onb-title">
      <h2 id="onb-title" className="lt-onb-title">Comece em 2 passos</h2>
      <ol className="lt-onb-steps">
        <li data-done={has || undefined}>
          <span className="lt-onb-num" aria-hidden="true">{has ? <Icon name="check" size={14} /> : '1'}</span>
          <div className="lt-onb-text">
            <div className="lt-onb-step">
              Cadastre quem te deve{has && <span className="lt-sr-only"> (feito)</span>}
            </div>
            <div className="lt-onb-hint">
              {has
                ? `✓ ${registered(lastFirst)}${debtors.length > 1 ? ` · ${debtors.length} pessoas` : ''}`
                : 'Só o nome já basta.'}
            </div>
          </div>
          <Button size="sm" variant={has ? 'ghost' : 'primary'} onClick={() => { setFormLoaded(true); setFormOpen(true) }}>
            {has ? 'Outra pessoa' : 'Adicionar'}
          </Button>
        </li>
        <li data-locked={!has || undefined}>
          <span className="lt-onb-num" aria-hidden="true">2</span>
          <div className="lt-onb-text">
            <div className="lt-onb-step">Registre a dívida</div>
            <div className="lt-onb-hint" id={lockedId}>
              {has ? 'À vista, parcelada ou todo mês.' : 'Liberado depois do passo 1.'}
            </div>
          </div>
          {/* aria-disabled (not disabled) keeps it focusable, so the reason is heard. */}
          <button
            type="button"
            className="lt-onb-btn"
            data-variant={has ? 'primary' : 'secondary'}
            aria-disabled={!has || undefined}
            aria-describedby={has ? undefined : lockedId}
            onClick={newDebt}
          >
            Nova dívida
          </button>
        </li>
      </ol>
      <p className="lt-onb-foot">Depois é só acompanhar aqui o que vence e registrar cada pagamento.</p>

      {formLoaded && (
        <Suspense fallback={null}>
          <DebtorForm open={formOpen} onClose={() => setFormOpen(false)} onSave={handleCreate} loading={createDebtor.isPending} />
        </Suspense>
      )}
    </section>
  )
}
