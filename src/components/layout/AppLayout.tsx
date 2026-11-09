import { useState, type ReactNode } from 'react'
import { Header } from './Header'
import { BottomTabs } from './BottomTabs'
import { AccountSheet } from './AccountSheet'
import { Modal } from '../ui/Modal'
import { Calculator } from '../shared/Calculator'
import { useDashboardOverview } from '../../hooks/dashboard/useDashboardOverview'
import { useRouteAnnouncer } from '../../hooks/useRouteAnnouncer'
import { OfflineBanner } from './OfflineBanner'

interface AppLayoutProps {
  children: ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const [accountOpen, setAccountOpen] = useState(false)
  const [calcOpen, setCalcOpen] = useState(false)
  useRouteAnnouncer()

  // Improvement 5: overdue from EVERY month, derived from the dates by the API.
  // (It counted status === 'OVERDUE', which the API never stores, so it was always 0.)
  const { data: overview } = useDashboardOverview()
  const overdueCount = overview?.overdue.count ?? 0

  const openCalc = () => { setAccountOpen(false); setCalcOpen(true) }

  return (
    <>
      {/* First Tab stop: jump over the header and navigation (WCAG 2.4.1). */}
      <a href="#conteudo" className="lt-skip-link">Pular para o conteúdo</a>
      <OfflineBanner />
      <Header onCalc={openCalc} />
      <BottomTabs onAccount={() => setAccountOpen(true)} overdueCount={overdueCount} />
      <AccountSheet open={accountOpen} onClose={() => setAccountOpen(false)} onCalc={openCalc} />
      <Modal open={calcOpen} onClose={() => setCalcOpen(false)} title="Calculadora">
        <Calculator />
      </Modal>
      <div id="conteudo" tabIndex={-1} style={{ outline: 'none' }}>
        {children}
      </div>
    </>
  )
}
