import { Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { PrivateRoute } from './PrivateRoute'
import { AppLayout } from '../components/layout/AppLayout'
import { LoginPage } from '../pages/auth/LoginPage'
import { RegisterPage } from '../pages/auth/RegisterPage'
import { VerifyPage } from '../pages/auth/VerifyPage'
import { CallbackPage } from '../pages/auth/CallbackPage'
import { DashboardPage } from '../pages/dashboard/DashboardPage'
import { DebtorsPage } from '../pages/debtors/DebtorsPage'
import { DebtorDetailPage } from '../pages/debtors/DebtorDetailPage'
import { DebtFormPage } from '../pages/debts/DebtFormPage'
import { InstallmentsPage } from '../pages/installments/InstallmentsPage'

function AppShell() {
  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  )
}

export function AppRouter() {
  return (
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
        </Route>
      </Route>

      {/* Default redirect */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
