import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDebtors } from '../../hooks/debtors/useDebtors'
import { useCreateDebtor } from '../../hooks/debtors/useCreateDebtor'
import { useToast } from '../../contexts/ToastContext'
import { translateApiError } from '../../lib/utils'
import { getApiError } from '../../lib/api'
import { Avatar } from '../../components/ui/Avatar'
import { Button } from '../../components/ui/Button'
import { Icon } from '../../components/ui/Icon'
import { IconButton } from '../../components/ui/IconButton'
import { EmptyState } from '../../components/ui/EmptyState'
import { DebtorForm, type DebtorFormPayload } from '../../components/shared/DebtorForm'
import { RELIABILITY_OPTIONS, getReliabilityOption } from '../../constants/reliability'
import type { DebtorReliability } from '../../types/debtor'

export function DebtorsPage() {
  const [q, setQ] = useState('')
  const [reliabilityFilter, setReliabilityFilter] = useState<DebtorReliability | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const navigate = useNavigate()
  const { showToast } = useToast()

  const { data: debtors = [], isLoading } = useDebtors(reliabilityFilter ?? undefined)
  const createDebtor = useCreateDebtor()

  // For display, the API /debtors doesn't return outstanding/ratio natively
  // The backend should ideally include computed fields; we show raw data
  const filtered = debtors
    .filter((d) => d.name.toLowerCase().includes(q.toLowerCase()))

  const handleCreate = (data: DebtorFormPayload) => {
    createDebtor.mutate(data, {
      onSuccess: () => {
        setFormOpen(false)
        showToast('Devedor adicionado')
      },
      onError: (e: unknown) => {
        const msg = getApiError(e)
        showToast(translateApiError(msg, 'Erro ao criar devedor.'), { icon: 'alert' })
      },
    })
  }

  if (isLoading) {
    return (
      <main style={{ maxWidth: 680, margin: '0 auto', padding: '20px 16px 100px' }}>
        <div style={{ color: 'var(--text-muted)', fontSize: 14, textAlign: 'center', paddingTop: 60 }}>Carregando…</div>
      </main>
    )
  }

  return (
    <main style={{ maxWidth: 680, margin: '0 auto', padding: '20px 16px 100px' }} className="lt-anim-fade">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 18 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ margin: 0, fontSize: 25, fontWeight: 800, letterSpacing: '-0.03em' }}>Devedores</h1>
          <p style={{ margin: '3px 0 0', color: 'var(--text-muted)', fontSize: 14.5 }}>
            {debtors.length} {debtors.length === 1 ? 'pessoa' : 'pessoas'}
          </p>
        </div>
        <Button size="md" icon="plus" onClick={() => setFormOpen(true)}>
          Adicionar
        </Button>
      </div>

      {/* Search */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--surface)', border: '1px solid var(--border-strong)', borderRadius: 99, padding: '11px 16px', boxShadow: 'var(--shadow-sm)' }}>
          <Icon name="search" size={18} color="var(--text-faint)" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar devedor…"
            style={{ border: 'none', outline: 'none', background: 'transparent', color: 'var(--text)', fontSize: 15, fontWeight: 500, width: '100%', fontFamily: 'inherit' }}
          />
          {q && <IconButton name="x" size={16} onClick={() => setQ('')} label="Limpar" style={{ width: 28, height: 28 }} />}
        </div>
      </div>

      {/* Reliability filter chips */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, overflowX: 'auto', overflowY: 'hidden', paddingBottom: 2 }}>
        {[{ id: null, label: 'Todos', color: 'var(--primary)', icon: undefined }, ...RELIABILITY_OPTIONS].map((f) => {
          const active = reliabilityFilter === f.id
          return (
            <button
              key={f.id ?? 'ALL'}
              type="button"
              onClick={() => setReliabilityFilter(f.id)}
              style={{
                flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 7,
                padding: '8px 14px', borderRadius: 99, cursor: 'pointer', fontFamily: 'inherit',
                fontWeight: 700, fontSize: 13.5, transition: 'all .15s', whiteSpace: 'nowrap',
                border: `1.5px solid ${active ? f.color : 'var(--border)'}`,
                background: active ? f.color : 'var(--surface)',
                color: active ? 'var(--on-primary)' : 'var(--text-muted)',
              }}
            >
              {f.icon && <Icon name={f.icon} size={14} strokeWidth={3} />}
              {f.label}
            </button>
          )
        })}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <EmptyState
          icon="users"
          title={q || reliabilityFilter ? 'Nada encontrado' : 'Nenhum devedor ainda'}
          sub={q || reliabilityFilter ? 'Tente outro filtro.' : 'Adicione a primeira pessoa que te deve.'}
          action={!q && !reliabilityFilter && <Button icon="plus" onClick={() => setFormOpen(true)}>Adicionar devedor</Button>}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
          {filtered.map((dt, idx) => (
            <div
              key={dt.id}
              onClick={() => navigate(`/debtors/${dt.id}`)}
              className="lt-row-hover"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                padding: 15,
                boxShadow: 'var(--shadow-sm)',
                cursor: 'pointer',
                transition: 'transform .15s, box-shadow .2s, border-color .2s',
                animation: `ltRise .4s cubic-bezier(0.22,1,0.36,1) ${idx * 0.04}s both`,
              }}
            >
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <Avatar name={dt.name} size={48} />
                {(() => {
                  const opt = getReliabilityOption(dt.reliability)
                  return opt ? (
                    <span
                      title={opt.label}
                      style={{
                        position: 'absolute', bottom: -3, right: -3, width: 19, height: 19,
                        borderRadius: '50%', display: 'grid', placeItems: 'center',
                        background: opt.color, border: '2.5px solid var(--surface)',
                      }}
                    >
                      <Icon name={opt.icon} size={11} color="var(--on-primary)" strokeWidth={3} />
                    </span>
                  ) : null
                })()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontWeight: 800, fontSize: 16, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{dt.name}</span>
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {dt.notes ?? dt.email ?? dt.phone ?? 'Sem observações'}
                </div>
              </div>
              <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
                <Icon name="chevronRight" size={18} color="var(--text-faint)" />
              </div>
            </div>
          ))}
        </div>
      )}

      <DebtorForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSave={handleCreate}
        loading={createDebtor.isPending}
      />
    </main>
  )
}
