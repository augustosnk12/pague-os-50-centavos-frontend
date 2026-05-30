import { useState, type ReactNode } from 'react'
import { Header } from './Header'
import { BottomTabs } from './BottomTabs'
import { AccountSheet } from './AccountSheet'
import { useInstallmentsByPeriod } from '../../hooks/installments/useInstallmentsByMonth'

interface AppLayoutProps {
  children: ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const [accountOpen, setAccountOpen] = useState(false)

  const today = new Date().toISOString().slice(0, 10)
  const { data: installments = [] } = useInstallmentsByPeriod({ period: 'month', date: today })
  const overdueCount = installments.filter((i) => i.status === 'OVERDUE').length

  return (
    <>
      <Header />
      <BottomTabs onAccount={() => setAccountOpen(true)} overdueCount={overdueCount} />
      <AccountSheet open={accountOpen} onClose={() => setAccountOpen(false)} />
      {children}
    </>
  )
}
