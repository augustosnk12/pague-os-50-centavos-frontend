import { useState } from 'react'
import { useGuardedNavigate } from '../../hooks/useGuardedNavigate'
import { Modal } from '../ui/Modal'
import { Icon } from '../ui/Icon'
import { Avatar } from '../ui/Avatar'
import { SupportSheet } from '../shared/SupportSheet'
import { useAuth } from '../../contexts/AuthContext'
import { useTheme } from '../../contexts/ThemeContext'
import { supportPix } from '../../lib/support'
import { usePlan } from '../../hooks/plan/usePlan'
import { useSide } from '../../contexts/SideContext'

interface AccountSheetProps {
  open: boolean
  onClose: () => void
  onCalc: () => void
}

/**
 * Phones: the "Conta" tab opens this sheet — the same quick items as the
 * desktop account menu (Recebimentos, Configurações, tema, calculadora,
 * Apoie o projeto, Sair). Everything is also in Configurações.
 */
export function AccountSheet({ open, onClose, onCalc }: AccountSheetProps) {
  const navigate = useGuardedNavigate()
  const { lender, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const [supportOpen, setSupportOpen] = useState(false)
  const { data: plan } = usePlan()
  const { t } = useSide()
  const then = (fn: () => void) => () => {
    onClose()
    fn()
  }

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title="Conta"
        head={(id, close) => (
          <div className="lt-remind-head">
            <Avatar name={lender?.name ?? lender?.email ?? 'Conta'} size={36} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <h2 id={id} className="lt-remind-title">
                <span className="lt-sr-only">Conta: </span>
                {lender?.name ?? 'Conta'}
              </h2>
              {lender?.email && <div className="lt-act-s">{lender.email}</div>}
            </div>
            <button type="button" className="lt-icon-close" aria-label="Fechar" onClick={close}>
              <Icon name="x" size={20} />
            </button>
          </div>
        )}
      >
        <div className="lt-acts">
          <AccountItem icon="trend" title={t('Recebimentos')} onClick={then(() => navigate('/payments'))} />
          <AccountItem icon="gear" title="Configurações" onClick={then(() => navigate('/settings'))} />
          {plan?.isAdmin && <AccountItem icon="shield" title="Administração" onClick={then(() => navigate('/admin'))} />}
          {/* Keeps the sheet open: the change is seen right away. */}
          <AccountItem icon={theme === 'dark' ? 'sun' : 'moon'} title={theme === 'dark' ? 'Tema claro' : 'Tema escuro'} onClick={toggleTheme} />
          <AccountItem icon="calc" title="Calculadora" onClick={then(onCalc)} />
          {supportPix() && <AccountItem icon="coffee" title="Apoie o projeto" onClick={then(() => setSupportOpen(true))} />}
          <div className="lt-acts-sep" role="separator" />
          <AccountItem icon="logout" title="Sair" danger onClick={then(logout)} />
        </div>
      </Modal>
      <SupportSheet open={supportOpen} onClose={() => setSupportOpen(false)} />
    </>
  )
}

function AccountItem({ icon, title, onClick, danger }: { icon: string; title: string; onClick: () => void; danger?: boolean }) {
  return (
    <button type="button" className="lt-act" data-danger={danger || undefined} onClick={onClick}>
      <Icon name={icon} size={20} />
      <span className="lt-act-txt">
        <span className="lt-act-t">{title}</span>
      </span>
    </button>
  )
}
