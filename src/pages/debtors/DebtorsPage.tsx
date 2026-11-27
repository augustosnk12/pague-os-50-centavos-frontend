import { useEffect, useMemo, useRef, useState } from 'react'
import { ErrorState } from '../../components/ui/ErrorState'
import { useSearchParams } from 'react-router-dom'
import { useArchivedDebtors, useDebtors } from '../../hooks/debtors/useDebtors'
import { useCreateDebtor } from '../../hooks/debtors/useCreateDebtor'
import { usePrefetchDebtor } from '../../hooks/debtors/usePrefetchDebtor'
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
import { Amount } from '../../components/ui/Amount'
import { IconButton } from '../../components/ui/IconButton'
import { EmptyState } from '../../components/ui/EmptyState'
import { PageHeader } from '../../components/ui/PageHeader'
import { SidePill } from '../../components/layout/SideSwitch'
import { useSide } from '../../contexts/SideContext'
import { ListGroup, SectionHeader } from '../../components/ui/ListGroup'
import { LinkRow, RowText } from '../../components/ui/ListRow'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { DebtorForm, type DebtorFormPayload } from '../../components/shared/DebtorForm'
import { RELIABILITY_OPTIONS, getReliabilityOption } from '../../constants/reliability'
import type { Debtor, DebtorReliability } from '../../types/debtor'
import { usePreferences } from '../../contexts/PreferencesContext'
import { usePlanLimits } from '../../contexts/PlanLimitsContext'
import { LimitBanner } from '../../components/shared/LimitBanner'

/** Accent- and case-insensitive ("joao" finds "João", "c" finds "ç"). */
const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
/** Above this, the list gets letter headings and jump-by-typing (improvement 42). */
const AZ_FROM = 15

export function DebtorsPage() {
  const [params, setParams] = useSearchParams()
  const prefetch = usePrefetchDebtor()
  const [q, setQ] = useState(() => params.get('q') ?? '')
  const [reliabilityFilter, setReliabilityFilter] = useState<DebtorReliability | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const { detail } = usePreferences()
  const { showToast } = useToast()
  // Item 75: "Credores" on the "Eu devo" side; no reliability tag there.
  const { side, t } = useSide()
  const debtorSide = side === 'in'
  // The tag filter does not exist on "Eu devo": never leave it hidden but applied.
  useEffect(() => {
    if (!debtorSide) setReliabilityFilter(null)
  }, [debtorSide])

  const { data: debtors = [], isLoading, isError, refetch, isFetching } = useDebtors(reliabilityFilter ?? undefined)
  // Archived: out of the list, in a group at the end; the search still finds them (improvement 41).
  const { data: archivedAll = [] } = useArchivedDebtors()
  const [showArchived, setShowArchived] = useState(false)
  const createDebtor = useCreateDebtor()
  const limits = usePlanLimits()
  // Melhoria 62: no limite, "Adicionar" abre a folha do limite em vez do formulário.
  const openForm = () => {
    if (!limits.blocked('debtors')) setFormOpen(true)
  }
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
        showToast(t('Devedor adicionado'))
      },
      onError: (e: unknown) => {
        if (limits.handleLimitError(e)) {
          setFormOpen(false)
          return
        }
        const msg = getApiError(e)
        showToast(translateApiError(msg, t('Erro ao criar devedor.')), { icon: 'alert' })
      },
    })
  }

  if (isLoading) {
    return (
      <main style={{ maxWidth: 680, margin: '0 auto', padding: '20px 16px 100px' }} aria-busy="true">
        <span className="lt-sr-only">{t('Carregando devedores…')}</span>
        <div className="lt-skel" style={{ height: 30, width: 160, borderRadius: 'var(--r-sm)' }} />
        <div className="lt-skel" style={{ height: 46, borderRadius: 'var(--r-md)', marginTop: 18 }} />
        <div className="lt-skel-row" style={{ marginTop: 12 }}>
          {[90, 110, 96].map((w) => <div key={w} className="lt-skel" style={{ height: 34, width: w, borderRadius: 'var(--r-pill)' }} />)}
        </div>
        <div className="lt-skel-list">
          {[0, 1, 2, 3, 4].map((k) => (
            <div key={k} className="lt-skel-item">
              <div className="lt-skel" style={{ width: 40, height: 40, borderRadius: 'var(--r-md)' }} />
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
        <SidePill />
        <PageHeader title={t('Devedores')} />
        <ErrorState onRetry={() => void refetch()} retrying={isFetching} />
      </main>
    )
  }

  // One row of the list (improvement 31, as in the mock): a real link to the profile,
  // prefetched on intent (improvement 43).
  const row = (dt: Debtor, archived = false) => {
    const rel = debtorSide ? getReliabilityOption(dt.reliability) : undefined
    const sub = dt.notes ?? dt.email ?? dt.phone ?? 'Sem observações'
    return (
      <LinkRow key={dt.id} to={`/debtors/${dt.id}`} onIntent={() => prefetch(dt.id)} label={`${dt.name}${rel ? `, ${rel.label}` : ''}${archived ? ', Arquivado' : ''}`}>
        {detail !== 'lean' && (
          <span className="lt-av-rel" aria-hidden="true">
            <Avatar name={dt.name} size={36} hue={dt.avatarHue} emoji={dt.avatarEmoji} />
            {rel && <span title={rel.label} style={{ background: rel.color }}><Icon name={rel.icon} size={12} strokeWidth={3} /></span>}
          </span>
        )}
        <RowText
          title={<>{dt.name}{archived && <> <StatusBadge tone="muted" icon="archive" small>Arquivado</StatusBadge></>}</>}
          sub={detail === 'lean' ? undefined : sub}
        />
        <Icon name="chevronRight" size={16} />
      </LinkRow>
    )
  }

  const nothing = filtered.length === 0 && debtHits.length === 0 && archivedHits.length === 0

  return (
    <main style={{ maxWidth: 680, margin: '0 auto', padding: '20px 16px 100px' }} className="lt-anim-fade">
      <SidePill />
      <PageHeader
        title={t('Devedores')}
        sub={`${debtors.length} ${debtors.length === 1 ? 'pessoa' : 'pessoas'}`}
        action={
          <Button size="md" icon="plus" onClick={openForm}>
            Adicionar
          </Button>
        }
      />
      <LimitBanner kinds={['debtors']} />

      {/* Search: people by name and debts by description (improvement 21) */}
      <div ref={fieldBox} style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--surface)', border: '1px solid var(--border-strong)', borderRadius: 'var(--r-pill)', padding: '11px 16px', boxShadow: 'var(--shadow-sm)' }}>
          <Icon name="search" size={20} color="var(--text-faint)" />
          <input
            ref={searchRef}
            type="search"
            aria-label={t('Buscar devedor ou dívida')}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t('Buscar devedor ou dívida…')}
            style={{ border: 'none', outline: 'none', background: 'transparent', color: 'var(--text)', fontSize: '0.9375rem', fontWeight: 500, width: '100%', fontFamily: 'inherit' }}
          />
          {q && <IconButton name="x" size={16} onClick={() => setQ('')} label="Limpar" style={{ width: 28, height: 28 }} />}
        </div>
      </div>

      {/* Reliability filter chips (only for debtors) */}
      {debtorSide && <div style={{ display: 'flex', gap: 8, marginBottom: 16, overflowX: 'auto', overflowY: 'hidden', paddingBottom: 2 }}>
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
                padding: '8px 14px', borderRadius: 'var(--r-pill)', cursor: 'pointer', fontFamily: 'inherit',
                fontWeight: 700, fontSize: '0.84375rem', transition: 'all .15s', whiteSpace: 'nowrap',
                border: `1.5px solid ${active ? f.color : 'var(--border)'}`,
                background: active ? f.color : 'var(--surface)',
                color: active ? 'var(--on-primary)' : 'var(--text-muted)',
              }}
            >
              {f.icon && <Icon name={f.icon} size={16} strokeWidth={3} />}
              {f.label}
            </button>
          )
        })}
      </div>}

      <div ref={listTop} />
      {/* List */}
      {nothing ? (
        <EmptyState
          icon="users"
          title={q || reliabilityFilter ? 'Nada encontrado' : t('Nenhum devedor ainda')}
          sub={q || reliabilityFilter ? 'Tente outro nome, dívida ou filtro.' : t('Adicione a primeira pessoa que te deve.')}
          action={!q && !reliabilityFilter && <Button icon="plus" onClick={openForm}>{t('Adicionar devedor')}</Button>}
        />
      ) : (
        <>
          {groups ? (
            <>
              <p className="lt-az-hint lt-desktop-only">Dica: digite uma letra para ir ao grupo.</p>
              {groups.map(([letter, list]) => (
                <section key={letter} id={`letra-${letter}`} className="lt-az" aria-labelledby={`letra-h-${letter}`}>
                  <SectionHeader id={`letra-h-${letter}`} className="lt-az-h" flash={flash === letter}>{letter}</SectionHeader>
                  <ListGroup>{list.map((d) => row(d))}</ListGroup>
                </section>
              ))}
            </>
          ) : (
            <>
              {term && filtered.length > 0 && debtHits.length > 0 && <SectionHeader count={filtered.length}>{t('Devedores')}</SectionHeader>}
              {filtered.length > 0 && <ListGroup label={t('Devedores')}>{filtered.map((d) => row(d))}</ListGroup>}
            </>
          )}
          {archivedHits.length > 0 && (
            <>
              <SectionHeader count={archivedHits.length}>Arquivados</SectionHeader>
              <ListGroup label="Arquivados encontrados">{archivedHits.map((d) => row(d, true))}</ListGroup>
            </>
          )}
          {!term && !reliabilityFilter && archivedAll.length > 0 && (
            <div className="lt-arch-group">
              <button type="button" className="lt-more-link lt-arch-link" aria-expanded={showArchived} onClick={() => setShowArchived((v) => !v)}>
                <Icon name="archive" size={16} /> Arquivados ({archivedAll.length})
                <Icon name="chevronDown" size={16} style={showArchived ? { transform: 'rotate(180deg)' } : undefined} />
              </button>
              {showArchived && (
                <ListGroup label="Arquivados" style={{ marginTop: 10 }}>{archivedAll.map((d) => row(d, true))}</ListGroup>
              )}
            </div>
          )}
          {debtHits.length > 0 && (
            <>
              <SectionHeader count={debtHits.length}>Dívidas</SectionHeader>
              <ListGroup label="Dívidas encontradas">
                {debtHits.map((d) => {
                  const left = Number(d.remaining) > 0
                  return (
                    <LinkRow key={d.id} to={`/debtors/${d.debtorId}?divida=${d.id}`} label={`${d.description || 'Dívida'}, de ${d.debtorName}, ${left ? `restam ${fmtMoney(d.remaining)}` : 'quitada'}`}>
                      <span className="lt-sr-debt" aria-hidden="true"><Icon name="layers" size={16} /></span>
                      <RowText title={d.description || 'Dívida'} sub={d.debtorName} />
                      <span className="lt-debt-hit-v" aria-hidden="true" style={{ color: left ? undefined : 'var(--paid)' }}>{left ? <Amount value={d.remaining} /> : 'Quitada'}</span>
                      <Icon name="chevronRight" size={16} />
                    </LinkRow>
                  )
                })}
              </ListGroup>
            </>
          )}
        </>
      )}

      <div role="status" aria-live="polite" className="lt-sr-only">{announce}</div>

      {fieldGone && (floatOpen ? (
        <div className="lt-fsearch">
          <Icon name="search" size={16} />
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
            placeholder={t('Buscar devedor ou dívida…')}
            aria-label={t('Buscar devedor ou dívida')}
          />
          {q && <IconButton name="x" size={16} label="Limpar" onClick={() => { setQ(''); floatRef.current?.focus() }} />}
        </div>
      ) : (
        <button type="button" className="lt-float lt-float-search" onClick={() => setFloatOpen(true)} aria-label={t('Buscar devedor ou dívida')}>
          <Icon name="search" size={20} />
        </button>
      ))}

      <DebtorForm
        open={formOpen}
        autoFocusName
        onClose={() => setFormOpen(false)}
        onSave={handleCreate}
        loading={createDebtor.isPending}
      />
    </main>
  )
}
