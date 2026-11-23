import { createElement, lazy, useState, type ComponentType } from 'react'

/**
 * Pages are split per route (improvement 43): the first screen downloads only
 * its own code. preloadRoute() fetches a page's code on intent (pointer over
 * or focus on its link), so the click usually finds it ready.
 */
type Loader = () => Promise<{ default: ComponentType }>

function page<M>(load: () => Promise<M>, pick: (m: M) => ComponentType): { Component: ComponentType; preload: Loader } {
  let promise: Promise<{ default: ComponentType }> | undefined
  let loaded: ComponentType | undefined
  const preload: Loader = () =>
    (promise ??= load().then((m) => {
      loaded = pick(m)
      return { default: loaded }
    }))
  const Lazy = lazy(preload)
  // Code already here (e.g. fetched by main.tsx for a ready-HTML page): render
  // it directly, since lazy() would still show the loading frame once. Chosen
  // once per mount, so a page never switches between the two and remounts.
  function Component(props: object) {
    const [Page] = useState<ComponentType>(() => loaded ?? Lazy)
    return createElement(Page, props)
  }
  return { Component, preload }
}

export const pages = {
  landing: page(() => import('../pages/landing/LandingPage'), (m) => m.LandingPage),
  calculator: page(() => import('../pages/landing/CalculatorPage'), (m) => m.CalculatorPage),
  notFound: page(() => import('../pages/landing/NotFoundPage'), (m) => m.NotFoundPage),
  login: page(() => import('../pages/auth/LoginPage'), (m) => m.LoginPage),
  register: page(() => import('../pages/auth/RegisterPage'), (m) => m.RegisterPage),
  verify: page(() => import('../pages/auth/VerifyPage'), (m) => m.VerifyPage),
  callback: page(() => import('../pages/auth/CallbackPage'), (m) => m.CallbackPage),
  dashboard: page(() => import('../pages/dashboard/DashboardPage'), (m) => m.DashboardPage),
  debtors: page(() => import('../pages/debtors/DebtorsPage'), (m) => m.DebtorsPage),
  debtorDetail: page(() => import('../pages/debtors/DebtorDetailPage'), (m) => m.DebtorDetailPage),
  debtForm: page(() => import('../pages/debts/DebtFormPage'), (m) => m.DebtFormPage),
  installments: page(() => import('../pages/installments/InstallmentsPage'), (m) => m.InstallmentsPage),
  settings: page(() => import('../pages/settings/SettingsPage'), (m) => m.SettingsPage),
  receivables: page(() => import('../pages/payments/ReceivablesPage'), (m) => m.ReceivablesPage),
  admin: page(() => import('../pages/admin/AdminPage'), (m) => m.AdminPage),
}

const byPath: Record<string, Loader> = {
  '/': pages.landing.preload,
  '/calculadora-de-parcelas': pages.calculator.preload,
  '/dashboard': pages.dashboard.preload,
  '/debtors': pages.debtors.preload,
  '/installments': pages.installments.preload,
  '/debts/new': pages.debtForm.preload,
  '/settings': pages.settings.preload,
  '/payments': pages.receivables.preload,
  '/admin': pages.admin.preload,
}

/** Start downloading the page behind a link (no-op for unknown paths). */
export function preloadRoute(path: string): void {
  void byPath[path]?.()
}

/** Public pages the build writes as ready HTML (vite-prerender.ts). */
export const PRERENDERED = ['landing', 'calculator', 'notFound'] as const
export type PrerenderedPage = (typeof PRERENDERED)[number]

/**
 * Code of the page built as ready HTML (<div id="root" data-page="…">), so
 * main.tsx can fetch it before the first render: React then swaps the ready
 * HTML for the same page, with no blank "loading" frame in between.
 */
export function prerenderedPage(name: string | undefined): Loader | undefined {
  return (PRERENDERED as readonly string[]).includes(name ?? '') ? pages[name as PrerenderedPage].preload : undefined
}
