import type { CSSProperties, ReactNode } from 'react'
import { useValuesHidden } from '../../contexts/PreferencesContext'
import { fmtMoney } from '../../lib/format'

/**
 * Every amount shown on screen goes through here (or <Money>, which uses it), so
 * "Esconder valores" (improvement 71) can blur it. Text meant to leave the screen
 * (toasts, WhatsApp, CSV, images, aria-labels) keeps using fmtMoney().
 * Hidden: blurred by CSS (html[data-hide-values] .lt-amt) and read as "valor oculto".
 */
export function Amount({ value, children, className, style }: { value?: number | string; children?: ReactNode; className?: string; style?: CSSProperties }) {
  const hidden = useValuesHidden()
  const content = children ?? fmtMoney(value ?? 0)
  return (
    <span className={className ? 'lt-amt ' + className : 'lt-amt'} style={style}>
      <span aria-hidden={hidden || undefined}>{content}</span>
      {hidden && <span className="lt-sr-only">valor oculto</span>}
    </span>
  )
}
