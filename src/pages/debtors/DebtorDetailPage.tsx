import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ErrorState } from '../../components/ui/ErrorState'
import { EmptyState } from '../../components/ui/EmptyState'
import { Avatar } from '../../components/ui/Avatar'
import { Icon } from '../../components/ui/Icon'
import { IconButton } from '../../components/ui/IconButton'
import { Money } from '../../components/ui/Money'
import { Modal } from '../../components/ui/Modal'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { Tabs } from '../../components/ui/Tabs'
import { ListGroup } from '../../components/ui/ListGroup'
import { InstallmentLine } from '../../components/shared/InstallmentLine'
import { DebtorForm, type DebtorFormPayload } from '../../components/shared/DebtorForm'
import { DebtForm } from '../../components/shared/DebtForm'
import { PaymentSheet } from '../../components/shared/PaymentSheet'
import { RemindSheet } from '../../components/shared/RemindSheet'
import { ReceiptSheet } from '../../components/shared/ReceiptSheet'
import { useDebtor } from '../../hooks/debtors/useDebtor'
import { useUpdateDebtor } from '../../hooks/debtors/useUpdateDebtor'
import { useDeleteDebtor } from '../../hooks/debtors/useDeleteDebtor'
import { useArchiveDebtor, usePaymentBatch, useSetRecurrence, useUndoBatch } from '../../hooks/debtors/useDebtorActions'
import { useDebtsByDebtor, type DebtWithInstallments } from '../../hooks/debts/useDebtsByDebtor'
import { useUpdateDebt } from '../../hooks/debts/useUpdateDebt'
import { useDeleteDebt } from '../../hooks/debts/useDeleteDebt'
import { useToast } from '../../contexts/ToastContext'
import { usePreferences } from '../../contexts/PreferencesContext'
import { getReliabilityOption } from '../../constants/reliability'
import { translateApiError, DEBT_TYPE_META } from '../../lib/utils'
import { getApiError } from '../../lib/api'
import { localToday } from '../../lib/date'
import { fmtList, fmtMoney } from '../../lib/format'
import { installmentPosition } from '../../lib/installmentTag'
import { whatsappLink } from '../../lib/whatsapp'
import { debtLeft, enrich, openInstallments, paidOffOn, paymentTimeline, profileNumbers, splitDebts, leftOf } from '../../lib/debtorProfile'
import { paymentTarget, type PaymentTarget } from '../../lib/paymentTarget'
import type { ReceiptRequest } from '../../lib/receipt'
import type { DebtType } from '../../types/debt'
import { DebtSection } from './profile/DebtSection'
import { DebtActionsSheet, DebtorActionsSheet, DebtorInfoSheet, PayoffSheet } from './profile/ProfileSheets'

type Tab = 'open' | 'paid' | 'pays'
const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? name
/** Same rule as the rest of the app ("Maria cadastrada"). */
const gendered = (first: string, word: string) => `${word}${/a$/i.test(first) ? 'a' : 'o'}`

/**
 * Debtor profile (S4, improvements 9, 11, 12, 34 and 41): a 2-line header
 * (tap for contact and notes), "Cobrar" and "Nova dívida", ⋯ with the rest;
 * tabs Em aberto / Quitadas / Pagamentos; each open debt as its own card with
 * its next installments, "Quitar" and its own ⋯; archive and reactivate.
 */
export function DebtorDetailPage() {
  const { id = '' } = useParams<{ id: string }>()
  // Another debtor picked in the search: start fresh (tab, expanded cards, open sheets).
  return <DebtorProfile key={id} id={id} />
}

function DebtorProfile({ id }: { id: string }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const { showToast } = useToast()
  const { detail } = usePreferences()
  const today = localToday()

  const { data: debtor, isLoading, isError, error, refetch, isFetching } = useDebtor(id)
  const debtsQuery = useDebtsByDebtor(id)
  const debts = debtsQuery.data ?? []
  const updateDebtor = useUpdateDebtor(id)
  const deleteDebtor = useDeleteDebtor()
  const updateDebt = useUpdateDebt(id)
  const deleteDebt = useDeleteDebt(id)
  const archiveM = useArchiveDebtor()
  const batchM = usePaymentBatch()
  const undoM = useUndoBatch()
  const recurrenceM = useSetRecurrence()

  const [tab, setTab] = useState<Tab>('open')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [actionsOpen, setActionsOpen] = useState(false)
  const [infoOpen, setInfoOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleteConfirmName, setDeleteConfirmName] = useState('')
  const [debtActions, setDebtActions] = useState<DebtWithInstallments | null>(null)
  const [payoff, setPayoff] = useState<DebtWithInstallments | null>(null)
  const [debtForm, setDebtForm] = useState<{ open: boolean; editing: DebtWithInstallments | null }>({ open: false, editing: null })
  const [confirmDelDebt, setConfirmDelDebt] = useState<DebtWithInstallments | null>(null)
  const [payTarget, setPayTarget] = useState<PaymentTarget | null>(null)
  const [remindId, setRemindId] = useState<string | null>(null)
  const [receipt, setReceipt] = useState<ReceiptRequest | null>(null)

  // A debt picked in the search opens expanded, in the right tab, and in view (improvement 21).
  const focusDebt = searchParams.get('divida')
  const focused = debts.find((d) => d.id === focusDebt)
  useEffect(() => {
    if (!focused) return
    setTab(debtLeft(focused) > 0 ? 'open' : 'paid')
    setExpanded((s) => new Set(s).add(focused.id))
    requestAnimationFrame(() => document.getElementById(`divida-${focused.id}`)?.scrollIntoView({ block: 'start' }))
    // location.key: picking the same debt again (after changing tab or collapsing it) still works.
  }, [focused?.id, location.key]) // eslint-disable-line react-hooks/exhaustive-deps

  if (isLoading) {
    return (
      <main className="lt-page" aria-busy="true">
        <span className="lt-sr-only">Carregando…</span>
        <div className="lt-skel" style={{ height: 70, borderRadius: 16 }} />
        <div className="lt-skel" style={{ height: 220, borderRadius: 16, marginTop: 16 }} />
      </main>
    )
  }

  // Network/server failure ≠ "Devedor não encontrado" (only a 404 is).
  const notFound = (error as { response?: { status?: number } } | null)?.response?.status === 404
  if (isError && !debtor && !notFound) {
    return (
      <main className="lt-page">
        <h1 className="lt-h1" style={{ marginBottom: 16 }}>Devedor</h1>
        <ErrorState onRetry={() => void refetch()} retrying={isFetching} />
      </main>
    )
  }
  if (!debtor) {
    return (
      <main className="lt-page">
        <EmptyState title="Devedor não encontrado" sub="Ele pode ter sido excluído." icon="users" action={<Button variant="secondary" onClick={() => navigate('/debtors')}>Ver devedores</Button>} />
      </main>
    )
  }

  const first = firstName(debtor.name)
  const numbers = profileNumbers(debts, today)
  const { open, paid } = splitDebts(debts, today)
  const timeline = paymentTimeline(debts)
  const archived = !!debtor.archivedAt
  const activeMonthly = debts.find((d) => d.recurrence === 'MONTHLY' && d.recurrenceActive !== false)
  const blockedBy =
    numbers.owed > 0
      ? `Quite os ${fmtMoney(numbers.owed / 100)} em aberto para arquivar`
      : activeMonthly
        ? `Encerre a recorrência de ${activeMonthly.description || 'dívida mensal'} para arquivar`
        : null
  const rel = getReliabilityOption(debtor.reliability)
  const canRemind = !!whatsappLink(debtor.phone) && numbers.owed > 0
  const openTotal = open.reduce((n, d) => n + openInstallments(d).length, 0)

  const fail = (fallback: string) => (e: unknown) => showToast(translateApiError(getApiError(e), fallback), { icon: 'alert' })
  const back = () => (location.key !== 'default' ? navigate(-1) : navigate('/debtors'))
  const openPayment = (inst: Parameters<typeof paymentTarget>[0]) => setPayTarget(paymentTarget(inst))
  const toggle = (debtId: string) =>
    setExpanded((s) => {
      const n = new Set(s)
      if (n.has(debtId)) n.delete(debtId)
      else n.add(debtId)
      return n
    })

  const handleUpdate = (data: DebtorFormPayload) =>
    updateDebtor.mutate(data, {
      onSuccess: () => {
        setEditOpen(false)
        showToast('Cadastro atualizado')
      },
      onError: fail('Erro ao atualizar.'),
    })

  const handleDelete = () =>
    deleteDebtor.mutate(id, {
      onSuccess: () => {
        showToast(`${first} ${gendered(first, 'excluíd')}`)
        navigate('/debtors')
      },
      onError: fail('Erro ao excluir devedor.'),
    })

  const handleSaveDebt = (data: { id: string; description: string | null; type: DebtType }) =>
    updateDebt.mutate(
      { id: data.id, data: { description: data.description, type: data.type } },
      {
        onSuccess: () => {
          setDebtForm({ open: false, editing: null })
          showToast('Dívida atualizada')
        },
        onError: fail('Erro ao atualizar.'),
      },
    )

  const handleDeleteDebt = () => {
    if (!confirmDelDebt) return
    deleteDebt.mutate(confirmDelDebt.id, {
      onSuccess: () => {
        setConfirmDelDebt(null)
        showToast('Dívida excluída')
      },
      onError: (e) => {
        setConfirmDelDebt(null)
        fail('Erro ao excluir.')(e)
      },
    })
  }

  const setArchived = (value: boolean, undoable = true) =>
    archiveM.mutate(
      { id: debtor.id, archived: value },
      {
        onSuccess: () =>
          showToast(value ? `${first} ${gendered(first, 'arquivad')}` : `${first} ${gendered(first, 'reativad')}`, {
            icon: 'archive',
            action: undoable ? { label: 'Desfazer', onClick: () => setArchived(!value, false) } : undefined,
          }),
        onError: fail(value ? 'Não foi possível arquivar.' : 'Não foi possível reativar.'),
      },
    )

  // "Quitar": one batch for every open installment, each for what is left (improvement 34).
  const confirmPayoff = (d: DebtWithInstallments, paidAt: string) => {
    const monthly = d.recurrence === 'MONTHLY'
    batchM.mutate(
      {
        debtorId: debtor.id,
        kind: monthly ? 'BATCH' : 'PAYOFF',
        paidAt,
        allocations: openInstallments(d).map((i) => ({ installmentId: i.id, amount: leftOf(i) / 100 })),
      },
      {
        onSuccess: (r) => {
          setPayoff(null)
          const title = d.description || 'Dívida'
          showToast(monthly ? `Pagamento de ${title} registrado` : `${title} quitada`, {
            icon: 'check',
            status: 'PAID',
            action: { label: 'Desfazer', onClick: () => undoM.mutate(r.batchId, { onSuccess: () => showToast(monthly ? 'Pagamento desfeito' : 'Quitação desfeita'), onError: fail('Não foi possível desfazer.') }) },
            secondary: {
              label: 'Comprovante',
              onClick: () => setReceipt(monthly ? { debtorId: debtor.id, paymentId: r.payments[0].id } : { debtorId: debtor.id, payoffDebtId: d.id }),
            },
          })
        },
        onError: fail('Não foi possível registrar.'),
      },
    )
  }

  const setRecurrence = (d: DebtWithInstallments, active: boolean) =>
    recurrenceM.mutate(
      { debtId: d.id, active },
      { onSuccess: () => showToast(active ? 'Recorrência retomada' : 'Recorrência encerrada'), onError: fail('Não foi possível alterar a recorrência.') },
    )

  const summary =
    numbers.owed === 0 ? (
      <span style={{ color: 'var(--paid)' }}>
        <Icon name="check" size={13} strokeWidth={3} /> {debts.length ? `Tudo quitado · ${fmtMoney(numbers.received / 100)} recebidos` : 'Sem dívidas'}
      </span>
    ) : (
      <>
        Deve <b>{fmtMoney(numbers.owed / 100)}</b>
        {numbers.late > 0 ? (
          <span style={{ color: 'var(--overdue)' }}> · {numbers.late >= numbers.owed ? 'tudo em atraso' : `${fmtMoney(numbers.late / 100)} em atraso`}</span>
        ) : numbers.next ? (
          <> · próxima {fmtList(numbers.next)}</>
        ) : null}
      </>
    )

  return (
    <main className="lt-page lt-anim-fade">
      <div className="lt-prof-top">
        <button type="button" className="lt-back" onClick={back}>
          <Icon name="chevronLeft" size={17} /> Voltar
        </button>
        <IconButton name="dots" label="Mais ações" onClick={() => setActionsOpen(true)} />
      </div>

      <div className="lt-prof">
        <button type="button" className="lt-prof-hit" onClick={() => setInfoOpen(true)} aria-label={`Ver contato e anotações de ${debtor.name}`} />
        <span className="lt-prof-av">
          <Avatar name={debtor.name} size={52} hue={debtor.avatarHue} emoji={debtor.avatarEmoji} />
          {rel && (
            <span className="lt-prof-rel" style={{ background: rel.color }} title={rel.label}>
              <Icon name={rel.icon} size={10} strokeWidth={3.2} color="var(--surface)" />
            </span>
          )}
        </span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <h1 className="lt-h1 lt-prof-name">
            <span>{debtor.name}</span> <Icon name="chevronRight" size={18} />
          </h1>
          <div className="lt-prof-sum">{debtsQuery.isLoading ? 'Carregando…' : summary}</div>
        </div>
      </div>

      {archived && (
        <div className="lt-arch-banner" role="status">
          <Icon name="archive" size={16} />
          <span style={{ flex: 1 }}>Arquivado · fora das listas e dos totais</span>
          <button type="button" className="lt-chip" onClick={() => setArchived(false)}>Reativar</button>
        </div>
      )}

      <div className="lt-prof-acts">
        <button
          type="button"
          className="lt-btn-lg"
          data-variant="wa"
          disabled={!canRemind}
          title={!debtor.phone ? 'Sem telefone cadastrado' : numbers.owed === 0 ? 'Nada a cobrar' : 'Cobrar no WhatsApp'}
          onClick={() => setRemindId(debtor.id)}
        >
          <Icon name="whatsapp" size={16} /> Cobrar
        </button>
        <button
          type="button"
          className="lt-btn-lg"
          data-variant="secondary"
          disabled={archived}
          title={archived ? 'Reative para criar uma dívida' : undefined}
          onClick={() => navigate(`/debts/new?debtorId=${debtor.id}`)}
        >
          <Icon name="plus" size={16} /> Nova dívida
        </button>
      </div>

      <Tabs
        items={[
          { id: 'open' as const, label: 'Em aberto', count: debtsQuery.isLoading ? null : open.length },
          { id: 'paid' as const, label: 'Quitadas', count: debtsQuery.isLoading ? null : paid.length },
          { id: 'pays' as const, label: 'Pagamentos', count: debtsQuery.isLoading ? null : timeline.length },
        ]}
        value={tab}
        onChange={setTab}
        label="Dívidas"
        panelId="devedor-painel"
        idPrefix="dtab"
      />

      <div role="tabpanel" id="devedor-painel" aria-labelledby={`dtab-${tab}`}>
        {debtsQuery.isError && !debtsQuery.data ? (
          <ErrorState title="Não foi possível carregar as dívidas" onRetry={() => void debtsQuery.refetch()} retrying={debtsQuery.isFetching} />
        ) : debtsQuery.isLoading ? (
          <div className="lt-skel" style={{ height: 200, borderRadius: 16, marginTop: 12 }} />
        ) : tab === 'open' ? (
          open.length ? (
            <div className="lt-dsecs">
              {open.map((d) => (
                <DebtSection
                  key={d.id}
                  debt={d}
                  debtor={debtor}
                  today={today}
                  lean={detail === 'lean'}
                  expanded={expanded.has(d.id)}
                  onToggle={() => toggle(d.id)}
                  onOpen={openPayment}
                  onActions={() => setDebtActions(d)}
                  onPayoff={() => setPayoff(d)}
                  onReceipt={(paymentId) => setReceipt({ debtorId: debtor.id, paymentId })}
                />
              ))}
              {openTotal > 1 && <p className="lt-prof-note">{openTotal} parcelas em aberto</p>}
            </div>
          ) : debts.length ? (
            <div className="lt-allpaid">
              <span className="lt-allpaid-ic" aria-hidden="true"><Icon name="check" size={20} strokeWidth={3} /></span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800 }}>Nada em aberto</div>
                <div className="lt-act-s">{first} quitou {paid.length} {paid.length === 1 ? 'dívida' : 'dívidas'}.</div>
              </div>
              <button type="button" className="lt-chip" onClick={() => setTab('paid')}>Ver quitadas</button>
            </div>
          ) : (
            <EmptyState
              icon="wallet"
              title="Sem dívidas"
              sub="Registre o que essa pessoa te deve."
              action={!archived && <Button icon="plus" onClick={() => navigate(`/debts/new?debtorId=${debtor.id}`)}>Nova dívida</Button>}
            />
          )
        ) : tab === 'paid' ? (
          paid.length ? (
            <ul className="lt-lgroup" aria-label="Dívidas quitadas" style={{ marginTop: 12 }}>
              {paid.map((d) => {
                const isOpen = expanded.has(d.id)
                const total = d.installments.reduce((s, i) => s + Number(i.amount), 0)
                const on = paidOffOn(d)
                return (
                  <li key={d.id} id={`divida-${d.id}`} className="lt-paid-debt">
                    <div className="lt-lrow-in">
                      <button type="button" className="lt-lrow-hit" aria-expanded={isOpen} onClick={() => toggle(d.id)} aria-label={`${d.description || 'Dívida'}, quitada${on ? ` em ${fmtList(on)}` : ''}, ${fmtMoney(total)}. ${isOpen ? 'Recolher' : 'Ver parcelas'}`} />
                      <span className="lt-sr-debt" data-paid aria-hidden="true"><Icon name={DEBT_TYPE_META[d.type]?.icon ?? 'wallet'} size={16} /></span>
                      <div className="lt-lrow-main" aria-hidden="true">
                        <div className="lt-lrow-name">{d.description || 'Dívida'}</div>
                        <div className="lt-lrow-sub">{DEBT_TYPE_META[d.type]?.label} · {d.installments.length}×{on ? ` · quitada em ${fmtList(on)}` : ''}</div>
                      </div>
                      <span aria-hidden="true"><Money value={total} size={14.5} color="var(--paid)" /></span>
                      <IconButton name="dots" size={16} label={`Ações da dívida ${d.description || 'Dívida'}`} onClick={() => setDebtActions(d)} style={{ position: 'relative', zIndex: 2, pointerEvents: 'auto' }} />
                    </div>
                    {isOpen && (
                      <ListGroup label={`Parcelas de ${d.description || 'Dívida'}`}>
                        {[...d.installments].sort((a, b) => a.number - b.number).map((i) => (
                          <InstallmentLine key={i.id} inst={enrich(i, d, debtor)} today={today} onOpen={openPayment} inDebt showDate={false} onReceipt={(paymentId) => setReceipt({ debtorId: debtor.id, paymentId })} />
                        ))}
                      </ListGroup>
                    )}
                  </li>
                )
              })}
            </ul>
          ) : (
            <EmptyState icon="check" title="Nenhuma dívida quitada ainda" sub="As dívidas totalmente pagas aparecem aqui." />
          )
        ) : timeline.length ? (
          <ul className="lt-lgroup" aria-label="Pagamentos" style={{ marginTop: 12 }}>
            {timeline.map(({ payment, installment, debt, daysLate }) => {
              const pos = installmentPosition(installment.number, debt.installments.length, debt.recurrence)
              const spoken = pos.startsWith('↻') ? 'mensalidade' : pos.includes('/') ? `parcela ${pos.replace('/', ' de ')}` : pos
              return (
                <li key={payment.id} className="lt-lrow">
                  <div className="lt-lrow-in">
                    <button
                      type="button"
                      className="lt-lrow-hit"
                      onClick={() => setReceipt({ debtorId: debtor.id, paymentId: payment.id })}
                      aria-label={`Comprovante: ${debt.description || 'Dívida'}, ${spoken}, ${fmtMoney(payment.amount)} em ${fmtList(payment.paidAt)}`}
                    />
                    <span className="lt-hist-ok" style={{ width: 30, height: 30 }} aria-hidden="true"><Icon name="check" size={13} strokeWidth={2.8} /></span>
                    <div className="lt-lrow-main" aria-hidden="true">
                      <div className="lt-lrow-name">{debt.description || 'Dívida'} · {pos}</div>
                      <div className="lt-lrow-sub">
                        {fmtList(payment.paidAt)} · {daysLate > 0 ? <span style={{ color: 'var(--pending)' }}>{daysLate}d após o vencimento</span> : 'em dia'}
                      </div>
                    </div>
                    <span aria-hidden="true"><Money value={payment.amount} size={14.5} color="var(--paid)" /></span>
                    <span className="lt-rcpt-ic" aria-hidden="true"><Icon name="receipt" size={17} /></span>
                  </div>
                </li>
              )
            })}
          </ul>
        ) : (
          <EmptyState icon="history" title="Nenhum pagamento ainda" sub="Os pagamentos registrados aparecem aqui." />
        )}
      </div>

      <DebtorActionsSheet
        open={actionsOpen}
        onClose={() => setActionsOpen(false)}
        debtor={debtor}
        archive={{ archived, blockedBy }}
        onInfo={() => setInfoOpen(true)}
        onEdit={() => setEditOpen(true)}
        onArchive={(v) => setArchived(v)}
        onDelete={() => {
          setDeleteConfirmName('')
          setConfirmDelete(true)
        }}
        onCopied={() => showToast('Telefone copiado', { icon: 'check' })}
        onBlocked={(why) => showToast(why, { icon: 'alert' })}
      />
      <DebtorInfoSheet
        open={infoOpen}
        onClose={() => setInfoOpen(false)}
        debtor={debtor}
        numbers={numbers}
        onEdit={() => {
          setInfoOpen(false)
          setEditOpen(true)
        }}
        onCopied={() => showToast('Telefone copiado', { icon: 'check' })}
      />
      <DebtActionsSheet
        debt={debtActions}
        debtorName={debtor.name}
        onClose={() => setDebtActions(null)}
        onPayoff={setPayoff}
        onPayoffReceipt={(d) => setReceipt({ debtorId: debtor.id, payoffDebtId: d.id })}
        onRecurrence={setRecurrence}
        onEdit={(d) => setDebtForm({ open: true, editing: d })}
      />
      <PayoffSheet debt={payoff} debtorName={debtor.name} today={today} busy={batchM.isPending} onClose={() => setPayoff(null)} onConfirm={confirmPayoff} />

      <DebtorForm
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSave={handleUpdate}
        onDelete={() => {
          setEditOpen(false)
          setDeleteConfirmName('')
          setConfirmDelete(true)
        }}
        editing={debtor}
        loading={updateDebtor.isPending}
      />

      <Modal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title={`Excluir ${first}?`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmDelete(false)}>Cancelar</Button>
            <Button full variant="danger" icon="trash" onClick={handleDelete} disabled={deleteDebtor.isPending || deleteConfirmName.trim() !== debtor.name}>
              {deleteDebtor.isPending ? 'Excluindo…' : 'Excluir tudo'}
            </Button>
          </>
        }
      >
        <div style={{ paddingTop: 4, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <p className="lt-remind-info">
            Isso apaga <b>{debtor.name}</b> e todas as dívidas, parcelas e pagamentos. Não dá para desfazer.
            {!archived && ' Se só quer tirar das listas, use “Arquivar”.'}
          </p>
          <Input label={`Digite "${debtor.name}" para confirmar`} value={deleteConfirmName} onChange={setDeleteConfirmName} placeholder={debtor.name} />
        </div>
      </Modal>

      <DebtForm
        open={debtForm.open}
        onClose={() => setDebtForm({ open: false, editing: null })}
        editing={debtForm.editing}
        onSave={handleSaveDebt}
        onDelete={(d) => {
          setDebtForm({ open: false, editing: null })
          setConfirmDelDebt(d)
        }}
        loading={updateDebt.isPending}
      />

      <Modal
        open={confirmDelDebt != null}
        onClose={() => setConfirmDelDebt(null)}
        title={confirmDelDebt?.installments.some((i) => (i.payments?.length ?? 0) > 0) ? 'Não é possível excluir' : 'Excluir dívida?'}
        footer={
          confirmDelDebt?.installments.some((i) => (i.payments?.length ?? 0) > 0) ? (
            <Button full variant="secondary" onClick={() => setConfirmDelDebt(null)}>Fechar</Button>
          ) : (
            <>
              <Button variant="ghost" onClick={() => setConfirmDelDebt(null)}>Cancelar</Button>
              <Button full variant="danger" icon="trash" onClick={handleDeleteDebt} disabled={deleteDebt.isPending}>
                {deleteDebt.isPending ? 'Excluindo…' : 'Excluir'}
              </Button>
            </>
          )
        }
      >
        <p className="lt-remind-info" style={{ paddingTop: 4 }}>
          {confirmDelDebt?.installments.some((i) => (i.payments?.length ?? 0) > 0)
            ? 'Esta dívida tem pagamentos registrados e não pode ser excluída.'
            : 'Isso vai apagar esta dívida e todas as suas parcelas. Não dá para desfazer.'}
        </p>
      </Modal>

      <PaymentSheet target={payTarget} onClose={() => setPayTarget(null)} />
      <RemindSheet debtorId={remindId} onClose={() => setRemindId(null)} />
      <ReceiptSheet request={receipt} onClose={() => setReceipt(null)} />
    </main>
  )
}
