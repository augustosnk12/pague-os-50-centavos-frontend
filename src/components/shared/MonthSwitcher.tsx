import { IconButton } from '../ui/IconButton'
import { monthLabelShort, addMonthsKey } from '../../lib/utils'

interface MonthSwitcherProps {
  mKey: string
  setMKey: (k: string) => void
}

export function MonthSwitcher({ mKey, setMKey }: MonthSwitcherProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 99, padding: 3, boxShadow: 'var(--shadow-sm)' }}>
      <IconButton name="chevronLeft" size={18} onClick={() => setMKey(addMonthsKey(mKey, -1))} label="Mês anterior" style={{ width: 34, height: 34 }} />
      <div style={{ fontWeight: 800, fontSize: 14, minWidth: 110, textAlign: 'center', letterSpacing: '-0.01em', textTransform: 'capitalize' }}>
        {monthLabelShort(mKey)}
      </div>
      <IconButton name="chevronRight" size={18} onClick={() => setMKey(addMonthsKey(mKey, 1))} label="Próximo mês" style={{ width: 34, height: 34 }} />
    </div>
  )
}
