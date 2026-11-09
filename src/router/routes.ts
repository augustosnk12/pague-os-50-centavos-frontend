import { lazy, type ComponentType } from 'react'

/**
 * Pages are split per route (improvement 43): the first screen downloads only
 * its own code. preloadRoute() fetches a page's code on intent (pointer over
 * or focus on its link), so the click usually finds it ready.
 */
type Loader = () => Promise<{ default: ComponentType }>

function page<M>(load: () => Promise<M>, pick: (m: M) => ComponentType): { Component: ComponentType; preload: Loader } {
  let promise: Promise<{ default: ComponentType }> | undefined
  const preload: Loader = () => (promise ??= load().then((m) => ({ default: pick(m) })))
  return { Component: lazy(preload), preload }
}

export const pages = {
  login: page(() => import('../pages/auth/LoginPage'), (m) => m.LoginPage),
  register: page(() => import('../pages/auth/RegisterPage'), (m) => m.RegisterPage),
  verify: page(() => import('../pages/auth/VerifyPage'), (m) => m.VerifyPage),
  callback: page(() => import('../pages/auth/CallbackPage'), (m) => m.CallbackPage),
  dashboard: page(() => import('../pages/dashboard/DashboardPage'), (m) => m.DashboardPage),
  debtors: page(() => import('../pages/debtors/DebtorsPage'), (m) => m.DebtorsPage),
  debtorDetail: page(() => import('../pages/debtors/DebtorDetailPage'), (m) => m.DebtorDetailPage),
  debtForm: page(() => import('../pages/debts/DebtFormPage'), (m) => m.DebtFormPage),
  installments: page(() => import('../pages/installments/InstallmentsPage'), (m) => m.InstallmentsPage),
}

const byPath: Record<string, Loader> = {
  '/dashboard': pages.dashboard.preload,
  '/debtors': pages.debtors.preload,
  '/installments': pages.installments.preload,
  '/debts/new': pages.debtForm.preload,
}

/** Start downloading the page behind a link (no-op for unknown paths). */
export function preloadRoute(path: string): void {
  void byPath[path]?.()
}
