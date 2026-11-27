/**
 * Item 75: which side the API calls are for. Set by SideContext, read by the
 * request interceptor in lib/axios. On "Me devem" the requests stay exactly as
 * before (the API's default is DEBTOR).
 */
import type { PersonKind } from './side'

let kind: PersonKind = 'DEBTOR'

export const setApiKind = (k: PersonKind) => {
  kind = k
}
export const getApiKind = () => kind

/** Lists that answer by side (`?kind=`, API R7). */
const SIDED_LISTS = /^\/(debtors|dashboard\/overview|installments|payments|payments\/summary|search)$/

/** Adds the side to a request when it is on "Eu devo"; untouched otherwise. */
export function withSide<C extends { url?: string; method?: string; params?: unknown; data?: unknown }>(config: C): C {
  if (kind !== 'CREDITOR') return config
  const path = (config.url ?? '').split('?')[0]
  const method = (config.method ?? 'get').toLowerCase()
  if (method === 'get' && SIDED_LISTS.test(path)) config.params = { ...(config.params as object), kind: 'CREDITOR' }
  if (method === 'post' && path === '/debtors') config.data = { ...(config.data as object), kind: 'CREDITOR' }
  return config
}
