import { Suspense } from 'react'
import { Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { PrivateRoute } from './PrivateRoute'
import { AppLayout } from '../components/layout/AppLayout'
import { pages } from './routes'
import { getToken } from '../lib/cookies'

/** Shown for the instant a page's code is still downloading. */
function PageLoading() {
  return <main aria-busy="true" style={{ minHeight: '60vh' }} />
}

function AppShell() {
  return (
    <AppLayout>
      <Suspense fallback={<PageLoading />}>
        <Outlet />
      </Suspense>
    </AppLayout>
  )
}

/** "/": the landing for visitors; signed-in people go straight to the Painel. */
function Home() {
  return getToken() ? <Navigate to="/dashboard" replace /> : <LandingPage />
}

const {
  landing: { Component: LandingPage },
  login: { Component: LoginPage },
  register: { Component: RegisterPage },
  verify: { Component: VerifyPage },
  callback: { Component: CallbackPage },
  dashboard: { Component: DashboardPage },
  debtors: { Component: DebtorsPage },
  debtorDetail: { Component: DebtorDetailPage },
  debtForm: { Component: DebtFormPage },
  installments: { Component: InstallmentsPage },
  settings: { Component: SettingsPage },
  receivables: { Component: ReceivablesPage },
} = pages

export function AppRouter() {
  return (
    <Suspense fallback={<PageLoading />}>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/auth/verify" element={<VerifyPage />} />
        <Route path="/auth/callback" element={<CallbackPage />} />

        {/* Protected + with app shell */}
        <Route element={<PrivateRoute />}>
          <Route element={<AppShell />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/debtors" element={<DebtorsPage />} />
            <Route path="/debtors/:id" element={<DebtorDetailPage />} />
            <Route path="/debts/new" element={<DebtFormPage />} />
            <Route path="/installments" element={<InstallmentsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/payments" element={<ReceivablesPage />} />
          </Route>
        </Route>

        {/* Default redirect */}
        <Route path="/" element={<Home />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  )
}
