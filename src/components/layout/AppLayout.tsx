import { useState, type ReactNode } from 'react'
import { Header } from './Header'
import { BottomTabs } from './BottomTabs'
import { AccountSheet } from './AccountSheet'
import { Modal } from '../ui/Modal'
import { Calculator } from '../shared/Calculator'
import { useInstallmentsByPeriod } from '../../hooks/installments/useInstallmentsByMonth'

interface AppLayoutProps {
  children: ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const [accountOpen, setAccountOpen] = useState(false)
  const [calcOpen, setCalcOpen] = useState(false)

  const today = new Date().toISOString().slice(0, 10)
  const { data: installments = [] } = useInstallmentsByPeriod({ period: 'month', date: today })
  const overdueCount = installments.filter((i) => i.status === 'OVERDUE').length

  const openCalc = () => { setAccountOpen(false); setCalcOpen(true) }

  return (
    <>
      <Header onCalc={openCalc} />
      <BottomTabs onAccount={() => setAccountOpen(true)} overdueCount={overdueCount} />
      <AccountSheet open={accountOpen} onClose={() => setAccountOpen(false)} onCalc={openCalc} />
      <Modal open={calcOpen} onClose={() => setCalcOpen(false)} title="Calculadora">
        <Calculator />
      </Modal>
      {children}
    </>
  )
}
