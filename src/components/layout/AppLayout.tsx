import { lazy, Suspense, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Header } from './Header'
import { BottomTabs } from './BottomTabs'
import { AccountSheet } from './AccountSheet'
import { Modal } from '../ui/Modal'
import { Calculator } from '../shared/Calculator'
import { useDashboardOverview } from '../../hooks/dashboard/useDashboardOverview'
import { useRouteAnnouncer } from '../../hooks/useRouteAnnouncer'
import { OfflineBanner } from './OfflineBanner'
import { useShortcuts } from '../../hooks/useShortcuts'

// Loaded on first use: it brings the payment sheet, which most visits never open.
const RegisterPicker = lazy(() => import('../shared/RegisterPicker').then((m) => ({ default: m.RegisterPicker })))

interface AppLayoutProps {
  children: ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const [accountOpen, setAccountOpen] = useState(false)
  const [calcOpen, setCalcOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [registerOpen, setRegisterOpen] = useState(false)
  const [registerLoaded, setRegisterLoaded] = useState(false)
  const openRegister = () => {
    setRegisterLoaded(true)
    setRegisterOpen(true)
  }
  const navigate = useNavigate()
  useRouteAnnouncer()

  // Improvement 28. On phones there is no header search: "/" and Ctrl K go to the
  // search of Devedores, which also finds debts (improvement 21).
  useShortcuts({
    onSearch: () => {
      if (window.matchMedia('(min-width: 880px)').matches) setSearchOpen(true)
      else navigate('/debtors?busca=1')
    },
    onRegister: openRegister,
    onNewDebt: () => navigate('/debts/new'),
  })

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
      <Header onCalc={openCalc} onRegister={openRegister} searchOpen={searchOpen} onSearchOpen={setSearchOpen} />
      <BottomTabs onAccount={() => setAccountOpen(true)} overdueCount={overdueCount} onRegister={openRegister} />
      {registerLoaded && (
        <Suspense fallback={null}>
          <RegisterPicker open={registerOpen} onClose={() => setRegisterOpen(false)} />
        </Suspense>
      )}
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
