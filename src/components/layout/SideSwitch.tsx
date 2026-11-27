import { useState } from 'react'
import { Segmented } from '../ui/Segmented'
import { Modal } from '../ui/Modal'
import { Icon } from '../ui/Icon'
import { useSide } from '../../contexts/SideContext'
import { useToast } from '../../contexts/ToastContext'
import { SIDE_LABEL, SIDE_SUB, type Side } from '../../lib/side'

const SIDES: Side[] = ['in', 'out']

/** Switch and say where we are now (the colour changes too). */
function useSwitch() {
  const { side, setSide } = useSide()
  const { showToast } = useToast()
  return (next: Side) => {
    if (next === side) return
    setSide(next)
    showToast(next === 'out' ? 'Eu devo · o que você precisa pagar' : 'Me devem · o que você tem a receber', { icon: next === 'out' ? 'card' : 'wallet' })
  }
}

/**
 * "Me devem | Eu devo" as two named options (item 75): in the desktop top bar
 * (the side is global, like the bar) and at the top of Nova dívida, where the
 * side is a field of the form.
 */
export function SideTabs({ mini, className }: { mini?: boolean; className?: string }) {
  const { side } = useSide()
  const go = useSwitch()
  return (
    <Segmented<Side>
      mini={mini}
      className={className}
      label="Qual lado ver"
      value={side}
      options={SIDES.map((s) => ({ value: s, label: SIDE_LABEL[s] }))}
      onChange={go}
    />
  )
}

/**
 * Phones (item 75): a small pill above the title of Painel, Devedores and
 * Parcelas ("● Me devem ▾"). It opens "Ver qual lado?" with the two sides
 * (no amounts, by decision of 25/11/2026).
 */
export function SidePill() {
  const { side } = useSide()
  const go = useSwitch()
  const [open, setOpen] = useState(false)
  return (
    <div className="lt-side-pill-row lt-mobile-only">
      <button type="button" className="lt-side-pill" aria-haspopup="dialog" aria-label={`Lado: ${SIDE_LABEL[side]}. Trocar`} onClick={() => setOpen(true)}>
        <span className="lt-side-dot" aria-hidden="true" />
        {SIDE_LABEL[side]}
        <Icon name="chevronDown" size={12} strokeWidth={2.6} />
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Ver qual lado?">
        <div role="radiogroup" aria-label="Lado" className="lt-side-opts">
          {SIDES.map((s) => (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={side === s}
              className="lt-side-opt"
              data-side={s}
              onClick={() => {
                setOpen(false)
                go(s)
              }}
            >
              <span className="lt-side-dot" aria-hidden="true" />
              <span style={{ flex: 1, minWidth: 0 }}>
                <span className="lt-side-opt-t">{SIDE_LABEL[s]}</span>
                <span className="lt-side-opt-s">{SIDE_SUB[s]}</span>
              </span>
              {side === s && <Icon name="check" size={16} strokeWidth={2.8} />}
            </button>
          ))}
        </div>
      </Modal>
    </div>
  )
}
