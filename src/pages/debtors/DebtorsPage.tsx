import { useEffect, useMemo, useRef, useState } from 'react'
import { ErrorState } from '../../components/ui/ErrorState'
import { Link, useSearchParams } from 'react-router-dom'
import { useArchivedDebtors, useDebtors } from '../../hooks/debtors/useDebtors'
import { useCreateDebtor } from '../../hooks/debtors/useCreateDebtor'
import { useSearch } from '../../hooks/search/useSearch'
import { scrollBehavior } from '../../lib/scroll'
import { rankByTerm } from '../../lib/searchMatch'
import { useToast } from '../../contexts/ToastContext'
import { translateApiError } from '../../lib/utils'
import { getApiError } from '../../lib/api'
import { fmtMoney } from '../../lib/format'
import { Avatar } from '../../components/ui/Avatar'
import { Button } from '../../components/ui/Button'
import { Icon } from '../../components/ui/Icon'
import { IconButton } from '../../components/ui/IconButton'
import { EmptyState } from '../../components/ui/EmptyState'
import { DebtorForm, type DebtorFormPayload } from '../../components/shared/DebtorForm'
import { RELIABILITY_OPTIONS, getReliabilityOption } from '../../constants/reliability'
import type { Debtor, DebtorReliability } from '../../types/debtor'
import { Detail, usePreferences } from '../../contexts/PreferencesContext'

/** Accent- and case-insensitive ("joao" finds "João", "c" finds "ç"). */
const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
/** Above this, the list gets letter headings and jump-by-typing (improvement 42). */
const AZ_FROM = 15

export function DebtorsPage() {
  const [params, setParams] = useSearchParams()
  const [q, setQ] = useState(() => params.get('q') ?? '')
  const [reliabilityFilter, setReliabilityFilter] = useState<DebtorReliability | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const { detail } = usePreferences()
  const { showToast } = useToast()

  const { data: debtors = [], isLoading, isError, refetch, isFetching } = useDebtors(reliabilityFilter ?? undefined)
  // Archived: out of the list, in a group at the end; the search still finds them (improvement 41).
  const { data: archivedAll = [] } = useArchivedDebtors()
  const [showArchived, setShowArchived] = useState(false)
  const createDebtor = useCreateDebtor()
  // Debts by description come from the API (improvement 21).
  const { data: found, active: searching } = useSearch(q)
  const debtHits = searching ? found?.debts ?? [] : []

  const term = norm(q.trim())
  const filtered = rankByTerm(debtors, term, (d) => d.name)
  const archivedHits = term ? rankByTerm(archivedAll, term, (d) => d.name) : []

  // Letter groups (A, B, C…) for long lists, no side index.
  const groups = useMemo(() => {
    if (term || filtered.length <= AZ_FROM) return null
    const by = new Map<string, Debtor[]>()
    for (const d of [...filtered].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))) {
      const first = norm(d.name).charAt(0).toUpperCase()
      const letter = /[A-Z]/.test(first) ? first : '#'
      by.set(letter, [...(by.get(letter) ?? []), d])
    }
    return [...by.entries()]
  }, [filtered, term])

  // "/" or Ctrl K on a phone land here with ?busca=1: focus the search.
  const searchRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (params.get('busca') !== '1' || isLoading) return
    searchRef.current?.focus()
    params.delete('busca')
    setParams(params, { replace: true })
  }, [params, setParams, isLoading])

  // Typing a letter (no field focused) jumps to its group, or the next one that exists.
  const [flash, setFlash] = useState<string | null>(null)
  const [announce, setAnnounce] = useState('')
  useEffect(() => {
    if (!groups) return
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (e.ctrlKey || e.metaKey || e.altKey || e.key.length !== 1 || t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName)) return
      if (document.querySelector('[aria-modal="true"]')) return
      const k = norm(e.key).toUpperCase()
      if (!/[A-Z]/.test(k)) return
      const letters = groups.map(([l]) => l)
      const target = letters.find((l) => l !== '#' && l >= k)
      if (!target) return
      const el = document.getElementById(`letra-${target}`)
      if (!el) return
      e.preventDefault()
      el.scrollIntoView({ behavior: scrollBehavior(), block: 'start' })
      el.querySelector<HTMLElement>('a')?.focus({ preventScroll: true })
      setFlash(target)
      setAnnounce(`Letra ${target}, ${groups.find(([l]) => l === target)?.[1].length ?? 0} pessoas`)
      setTimeout(() => setFlash(null), 900)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [groups])

  // Floating search once the field leaves the screen (improvement 42).
  const fieldBox = useRef<HTMLDivElement>(null)
  const [fieldGone, setFieldGone] = useState(false)
  const [floatOpen, setFloatOpen] = useState(false)
  const floatRef = useRef<HTMLInputElement>(null)
  const listTop = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = fieldBox.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(([e]) => setFieldGone(!e.isIntersecting && e.boundingClientRect.top < 0))
    io.observe(el)
    return () => io.disconnect()
  }, [isLoading])
  useEffect(() => {
    if (floatOpen) floatRef.current?.focus()
  }, [floatOpen])
  const typeFloating = (v: string) => {
    setQ(v)
    // Show the start of the results under the bar.
    const top = listTop.current?.getBoundingClientRect().top
    if (top !== undefined && top < 0) window.scrollTo({ top: window.scrollY + top - 140 })
  }

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
      <main style={{ maxWidth: 680, margin: '0 auto', padding: '20px 16px 100px' }} aria-busy="true">
        <span className="lt-sr-only">Carregando devedores…</span>
        <div className="lt-skel" style={{ height: 30, width: 160, borderRadius: 10 }} />
        <div className="lt-skel" style={{ height: 46, borderRadius: 14, marginTop: 18 }} />
        <div className="lt-skel-row" style={{ marginTop: 12 }}>
          {[90, 110, 96].map((w) => <div key={w} className="lt-skel" style={{ height: 34, width: w, borderRadius: 99 }} />)}
        </div>
        <div className="lt-skel-list">
          {[0, 1, 2, 3, 4].map((k) => (
            <div key={k} className="lt-skel-item">
              <div className="lt-skel" style={{ width: 40, height: 40, borderRadius: 12 }} />
              <div style={{ flex: 1 }}>
                <div className="lt-skel" style={{ height: 13, width: '55%' }} />
                <div className="lt-skel" style={{ height: 10, width: '35%', marginTop: 7 }} />
              </div>
            </div>
          ))}
        </div>
      </main>
    )
  }

  // A failed load must not look like an empty account ("Nenhum devedor ainda").
  if (isError && debtors.length === 0) {
    return (
      <main style={{ maxWidth: 680, margin: '0 auto', padding: '20px 16px 100px' }}>
        <h1 style={{ margin: '0 0 16px', fontSize: 25, fontWeight: 800, letterSpacing: '-0.03em' }}>Devedores</h1>
        <ErrorState onRetry={() => void refetch()} retrying={isFetching} />
      </main>
    )
  }

  const row = (dt: Debtor, idx: number, archived = false) => (
    // The row opens the profile: a real link (keyboard, middle-click, screen readers).
    <Link
      key={dt.id}
      to={`/debtors/${dt.id}`}
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
        color: 'inherit',
        transition: 'transform .15s, box-shadow .2s, border-color .2s',
        animation: `ltRise .4s cubic-bezier(0.22,1,0.36,1) ${Math.min(idx, 12) * 0.04}s both`,
      }}
    >
      <div style={{ position: 'relative', flexShrink: 0 }} hidden={detail === 'lean'}>
        <Avatar name={dt.name} size={48} hue={dt.avatarHue} emoji={dt.avatarEmoji} />
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
          {archived && <span className="lt-arch-tag"><Icon name="archive" size={11} /> Arquivado</span>}
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {dt.notes ?? dt.email ?? dt.phone ?? 'Sem observações'}
        </div>
      </div>
      <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
        <Icon name="chevronRight" size={18} color="var(--text-faint)" />
      </div>
    </Link>
  )

  const nothing = filtered.length === 0 && debtHits.length === 0 && archivedHits.length === 0

  return (
    <main style={{ maxWidth: 680, margin: '0 auto', padding: '20px 16px 100px' }} className="lt-anim-fade">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 18 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ margin: 0, fontSize: 25, fontWeight: 800, letterSpacing: '-0.03em' }}>Devedores</h1>
          <Detail>
            <p style={{ margin: '3px 0 0', color: 'var(--text-muted)', fontSize: 14.5 }}>
              {debtors.length} {debtors.length === 1 ? 'pessoa' : 'pessoas'}
            </p>
          </Detail>
        </div>
        <Button size="md" icon="plus" onClick={() => setFormOpen(true)}>
          Adicionar
        </Button>
      </div>

      {/* Search: people by name and debts by description (improvement 21) */}
      <div ref={fieldBox} style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--surface)', border: '1px solid var(--border-strong)', borderRadius: 99, padding: '11px 16px', boxShadow: 'var(--shadow-sm)' }}>
          <Icon name="search" size={18} color="var(--text-faint)" />
          <input
            ref={searchRef}
            type="search"
            aria-label="Buscar devedor ou dívida"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar devedor ou dívida…"
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
              aria-pressed={active}
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

      <div ref={listTop} />
      {/* List */}
      {nothing ? (
        <EmptyState
          icon="users"
          title={q || reliabilityFilter ? 'Nada encontrado' : 'Nenhum devedor ainda'}
          sub={q || reliabilityFilter ? 'Tente outro nome, dívida ou filtro.' : 'Adicione a primeira pessoa que te deve.'}
          action={!q && !reliabilityFilter && <Button icon="plus" onClick={() => setFormOpen(true)}>Adicionar devedor</Button>}
        />
      ) : (
        <>
          {groups ? (
            <>
              <p className="lt-az-hint lt-desktop-only">Dica: digite uma letra para ir ao grupo.</p>
              {groups.map(([letter, list]) => (
                <section key={letter} id={`letra-${letter}`} className="lt-az" aria-labelledby={`letra-h-${letter}`}>
                  <h2 id={`letra-h-${letter}`} className="lt-group-label lt-az-h" data-flash={flash === letter || undefined}>
                    <span>{letter}</span>
                    <span className="lt-group-line" aria-hidden="true" />
                  </h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>{list.map((d, i) => row(d, i))}</div>
                </section>
              ))}
            </>
          ) : (
            <>
              {term && filtered.length > 0 && debtHits.length > 0 && <h2 className="lt-group-label"><span>Devedores · {filtered.length}</span><span className="lt-group-line" aria-hidden="true" /></h2>}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>{filtered.map((d, i) => row(d, i))}</div>
            </>
          )}
          {archivedHits.length > 0 && (
            <>
              <h2 className="lt-group-label"><span>Arquivados · {archivedHits.length}</span><span className="lt-group-line" aria-hidden="true" /></h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>{archivedHits.map((d, i) => row(d, i, true))}</div>
            </>
          )}
          {!term && !reliabilityFilter && archivedAll.length > 0 && (
            <div className="lt-arch-group">
              <button type="button" className="lt-more-link lt-arch-link" aria-expanded={showArchived} onClick={() => setShowArchived((v) => !v)}>
                <Icon name="archive" size={14} /> Arquivados ({archivedAll.length})
                <Icon name="chevronDown" size={13} style={showArchived ? { transform: 'rotate(180deg)' } : undefined} />
              </button>
              {showArchived && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 11, marginTop: 10 }}>{archivedAll.map((d, i) => row(d, i, true))}</div>
              )}
            </div>
          )}
          {debtHits.length > 0 && (
            <>
              <h2 className="lt-group-label"><span>Dívidas · {debtHits.length}</span><span className="lt-group-line" aria-hidden="true" /></h2>
              <ul className="lt-lgroup" aria-label="Dívidas encontradas">
                {debtHits.map((d) => (
                  <li key={d.id} className="lt-lrow">
                    <Link to={`/debtors/${d.debtorId}?divida=${d.id}`} className="lt-lrow-in lt-debt-hit">
                      <span className="lt-sr-debt" aria-hidden="true"><Icon name="layers" size={16} /></span>
                      <span className="lt-lrow-main">
                        <span className="lt-lrow-name" style={{ display: 'block' }}>{d.description || 'Dívida'}</span>
                        <span className="lt-lrow-sub" style={{ display: 'block' }}>{d.debtorName}</span>
                      </span>
                      <span className="lt-debt-hit-v" style={{ color: Number(d.remaining) > 0 ? undefined : 'var(--paid)' }}>
                        {Number(d.remaining) > 0 ? fmtMoney(d.remaining) : 'Quitada'}
                      </span>
                      <Icon name="chevronRight" size={16} />
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}

      <div role="status" aria-live="polite" className="lt-sr-only">{announce}</div>

      {fieldGone && (floatOpen ? (
        <div className="lt-fsearch">
          <Icon name="search" size={17} />
          <input
            ref={floatRef}
            type="search"
            value={q}
            onChange={(e) => typeFloating(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setFloatOpen(false)
            }}
            onBlur={() => {
              if (!q.trim()) setFloatOpen(false)
            }}
            placeholder="Buscar devedor ou dívida…"
            aria-label="Buscar devedor ou dívida"
          />
          {q && <IconButton name="x" size={15} label="Limpar" onClick={() => { setQ(''); floatRef.current?.focus() }} />}
        </div>
      ) : (
        <button type="button" className="lt-float lt-float-search" onClick={() => setFloatOpen(true)} aria-label="Buscar devedor ou dívida">
          <Icon name="search" size={18} />
        </button>
      ))}

      <DebtorForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSave={handleCreate}
        loading={createDebtor.isPending}
      />
    </main>
  )
}
