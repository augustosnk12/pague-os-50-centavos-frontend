import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderApp } from './renderApp'
import { fakeGet, fixtures } from './fakeApi'
import { api } from '../lib/axios'
import type { MyPlan } from '../api/plan.api'
import { limitLead, limitReachedText, requestSent, showPlanSection } from '../lib/planLimits'

vi.mock('../lib/axios', () => ({ api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() } }))
const get = vi.mocked(api.get)
const post = vi.mocked(api.post)

const free = (o: Partial<MyPlan> = {}): MyPlan => ({ ...fixtures.plan, ...o })
const FULL_DEBTORS = free({ debtors: { used: 11, limit: 10, full: true } })
const PRO = free({
  plan: { id: 'plan_pro', name: 'Pro', isDefault: false, showUsage: true },
  debtors: { used: 31, limit: 50, full: false },
  debts: { used: 240, limit: 1000, full: false },
})

let plan: MyPlan
beforeEach(() => {
  vi.setSystemTime(new Date('2026-11-22T12:00:00-03:00'))
  plan = fixtures.plan
  get.mockReset().mockImplementation((url: string) => Promise.resolve({ data: url === '/me/plan' ? plan : fakeGet(url) }))
  post.mockReset()
})

describe('textos dos limites (melhoria 62)', () => {
  it('Grátis: sem nome de plano; Pro: com o nome', () => {
    expect(limitReachedText(FULL_DEBTORS, 'debtors')).toBe('Você chegou ao limite de 10 devedores.')
    expect(limitLead(FULL_DEBTORS, 'debtors')).toBe('Você pode ter até 10 devedores e já tem 11.')
    const proFull = { ...PRO, debts: { used: 1000, limit: 1000, full: true } }
    expect(limitReachedText(proFull, 'debts')).toBe('Você chegou ao limite de 1.000 dívidas do plano Pro.')
    expect(limitLead(proFull, 'debts')).toBe('O plano Pro permite até 1.000 dívidas, e você chegou lá.')
  })

  it('seção em Configurações: Pro sempre; Grátis só no limite; nada com a regra desligada', () => {
    expect(showPlanSection(fixtures.plan)).toBe(false)
    expect(showPlanSection(FULL_DEBTORS)).toBe(true)
    expect(showPlanSection(PRO)).toBe(true)
    expect(showPlanSection({ ...FULL_DEBTORS, enforced: false })).toBe(false)
  })

  it('pedido vale por 24 h', () => {
    const now = Date.parse('2026-11-22T15:00:00Z')
    expect(requestSent(free({ limitRequestedAt: '2026-11-22T10:00:00Z' }), now)).toBe(true)
    expect(requestSent(free({ limitRequestedAt: '2026-11-21T14:00:00Z' }), now)).toBe(false)
  })
})

describe('limites nas telas (melhoria 62)', () => {
  it('Grátis dentro dos limites: nada aparece', async () => {
    renderApp('/settings')
    expect(await screen.findByRole('heading', { level: 1, name: 'Configurações' })).toBeInTheDocument()
    expect(screen.queryByText('Seus limites')).not.toBeInTheDocument()
    expect(screen.queryByText(/limite/i)).not.toBeInTheDocument()
  })

  it('Grátis no limite: aviso em Devedores; "Adicionar" abre a folha, sem falar de planos; um toque envia o pedido', async () => {
    plan = FULL_DEBTORS
    post.mockResolvedValue({ data: { message: 'Request sent.', limitRequestedAt: '2026-11-22T15:00:00.000Z' } })
    const user = userEvent.setup()
    renderApp('/debtors')
    expect(await screen.findByText('Você chegou ao limite de 10 devedores.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Adicionar' }))
    const sheet = await screen.findByRole('dialog', { name: 'Limite atingido' })
    expect(within(sheet).getByText('Você pode ter até 10 devedores e já tem 11.')).toBeInTheDocument()
    expect(within(sheet).getByText(/Por ser gratuito/)).toBeInTheDocument()
    expect(sheet.textContent).not.toMatch(/plano|Pro\b|Grátis|@/i)
    expect(screen.queryByRole('dialog', { name: 'Novo devedor' })).not.toBeInTheDocument()

    await user.click(within(sheet).getByRole('button', { name: /Pedir mais limite/ }))
    expect(post).toHaveBeenCalledWith('/me/limit-request')
    expect(await within(sheet).findByText(/Pedido enviado\. Vou te responder no seu e-mail \(augusto@email\.com\)/)).toBeInTheDocument()
  })

  it('Grátis no limite: "Seus limites" em Configurações', async () => {
    plan = FULL_DEBTORS
    renderApp('/settings')
    expect(await screen.findByText('Seus limites')).toBeInTheDocument()
    expect(screen.getByText('Até 10 devedores e 50 dívidas')).toBeInTheDocument()
    expect(screen.getByText('11 de 10')).toBeInTheDocument()
    expect(screen.queryByText(/Plano Grátis/)).not.toBeInTheDocument()
  })

  it('Pro: "Seu plano" sempre, sem aviso enquanto está dentro', async () => {
    plan = PRO
    renderApp('/settings')
    expect(await screen.findByText('Seu plano')).toBeInTheDocument()
    expect(screen.getByText('Plano Pro')).toBeInTheDocument()
    expect(screen.getByText('31 de 50')).toBeInTheDocument()
    expect(screen.getByText('240 de 1.000')).toBeInTheDocument()
  })

  it('a API recusou por limite (403): a folha abre', async () => {
    plan = fixtures.plan
    post.mockRejectedValue({ response: { status: 403, data: { error: 'Debtor limit reached' } } })
    const user = userEvent.setup()
    renderApp('/debtors')
    await user.click(await screen.findByRole('button', { name: 'Adicionar' }))
    const form = await screen.findByRole('dialog', { name: 'Novo devedor' })
    await user.type(within(form).getByLabelText(/Nome/), 'Maria')
    await user.click(within(form).getByRole('button', { name: /Salvar devedor/ }))
    expect(await screen.findByRole('dialog', { name: 'Limite atingido' })).toBeInTheDocument()
  })
})

describe('Administração (melhoria 63)', () => {
  it('quem não é admin vê "Página não encontrada" e não vê o item no menu', async () => {
    renderApp('/admin')
    expect(await screen.findByText('Página não encontrada')).toBeInTheDocument()
    expect(get).not.toHaveBeenCalledWith('/admin/plans')
  })

  it('o admin vê planos e contas; "Administração" aparece em Configurações', async () => {
    plan = free({ isAdmin: true })
    renderApp('/settings')
    expect(await screen.findByRole('button', { name: 'Administração' })).toBeInTheDocument()
  })

  it('tela do admin', async () => {
    plan = free({ isAdmin: true })
    renderApp('/admin')
    expect(await screen.findByRole('heading', { level: 1, name: 'Administração' })).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: /^Plano Grátis: 10 devedores, 50 dívidas, 1 conta, padrão/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Plano Pro: 50 devedores, 1000 dívidas/ })).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: /^Augusto, augusto@email\.com, plano Grátis/ })).toBeInTheDocument()
  })
})
