import type { MyPlan, UsageItem } from '../api/plan.api'

export type LimitKind = 'debtors' | 'debts'

export const LIMIT_ERRORS: Record<string, LimitKind> = {
  'Debtor limit reached': 'debtors',
  'Debt limit reached': 'debts',
}

export const LIMIT_WORDS: Record<LimitKind, { one: string; many: string; title: string; icon: string }> = {
  debtors: { one: 'devedor', many: 'devedores', title: 'Devedores', icon: 'users' },
  debts: { one: 'dívida', many: 'dívidas', title: 'Dívidas', icon: 'layers' },
}

/** The free plan never shows plan names nor that other plans exist (melhoria 62). */
export const FREE_WHY = 'Por ser gratuito, o Pague os 50 centavos não consegue oferecer limites muito altos.'

export const REQUEST_COOLDOWN_MS = 24 * 60 * 60 * 1000

const nf = (n: number) => n.toLocaleString('pt-BR')
export const fmtCount = nf

/** Full only counts when the API enforces limits. */
export function isFull(plan: MyPlan | undefined, kind: LimitKind): boolean {
  return !!plan?.enforced && plan[kind].full
}

/** The free (default) plan, or no plan: no plan wording. */
export const isFreePlan = (plan: MyPlan | undefined) => !plan?.plan || plan.plan.isDefault

/** "Seus limites" / "Seu plano" in Configurações: always on plans with showUsage, else only at a limit. */
export function showPlanSection(plan: MyPlan | undefined): boolean {
  if (!plan?.enforced || !plan.plan) return false
  return plan.plan.showUsage || plan.debtors.full || plan.debts.full
}

/** Whether "Pedir mais limite" was already sent in the last 24 h. */
export function requestSent(plan: MyPlan | undefined, now = Date.now()): boolean {
  const at = plan?.limitRequestedAt ? Date.parse(plan.limitRequestedAt) : NaN
  return Number.isFinite(at) && now - at < REQUEST_COOLDOWN_MS
}

/** "Você chegou ao limite de 10 devedores." (+ " do plano Pro" outside the free plan). */
export function limitReachedText(plan: MyPlan, kind: LimitKind): string {
  const limit = plan[kind].limit ?? 0
  const where = isFreePlan(plan) ? '' : ` do plano ${plan.plan!.name}`
  return `Você chegou ao limite de ${nf(limit)} ${limit === 1 ? LIMIT_WORDS[kind].one : LIMIT_WORDS[kind].many}${where}.`
}

/** Lead of the limit sheet. */
export function limitLead(plan: MyPlan, kind: LimitKind): string {
  const { used, limit } = plan[kind]
  const L = limit ?? 0
  const words = L === 1 ? LIMIT_WORDS[kind].one : LIMIT_WORDS[kind].many
  const tail = used > L ? ` e ${isFreePlan(plan) ? '' : 'você '}já tem ${nf(used)}` : `, e ${isFreePlan(plan) ? '' : 'você '}chegou lá`
  return isFreePlan(plan) ? `Você pode ter até ${nf(L)} ${words}${tail}.` : `O plano ${plan.plan!.name} permite até ${nf(L)} ${words}${tail}.`
}

export const LIMIT_TIPS: Record<LimitKind, string> = {
  debtors: 'Devedores arquivados também contam. Só excluir um devedor (e as dívidas dele) libera espaço.',
  debts: 'Toda dívida criada conta, mesmo depois de quitada ou excluída.',
}

export const meterPct = (u: UsageItem) => (u.limit ? Math.min(100, (u.used / u.limit) * 100) : 0)
