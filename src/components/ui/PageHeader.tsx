import type { ReactNode } from 'react'
import { Icon } from './Icon'
import { Detail } from '../../contexts/PreferencesContext'

export function BackButton({ label, onClick }: { label: string | null; onClick: () => void }) {
  return (
    <button type="button" className="lt-back" onClick={onClick} aria-label={`Voltar para ${label ?? 'a tela anterior'}`}>
      <Icon name="chevronLeft" size={17} /> {label ?? 'Voltar'}
    </button>
  )
}

interface PageHeaderProps {
  title: ReactNode
  /** Under the title; hidden in "Enxuta" unless `keepSub`. */
  sub?: ReactNode
  keepSub?: boolean
  /** "‹ Origem" above the title. */
  back?: { label: string | null; onClick: () => void }
  /** Next to the title (e.g. "Exportar", "Nova pessoa"). */
  action?: ReactNode
}

/**
 * Top of a screen (improvement 31): optional "‹ Voltar", the page's only <h1>,
 * a subtitle and one action beside the title.
 */
export function PageHeader({ title, sub, keepSub, back, action }: PageHeaderProps) {
  const subtitle = sub != null && sub !== '' ? <p className="lt-sub">{sub}</p> : null
  return (
    <header className="lt-ph" data-back={back ? true : undefined}>
      {back && <BackButton label={back.label} onClick={back.onClick} />}
      <div className="lt-ph-row">
        <div className="lt-ph-main">
          <h1 className="lt-h1">{title}</h1>
          {keepSub ? subtitle : <Detail>{subtitle}</Detail>}
        </div>
        {action}
      </div>
    </header>
  )
}
