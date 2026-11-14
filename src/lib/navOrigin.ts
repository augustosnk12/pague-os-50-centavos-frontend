/**
 * "Voltar sempre para a origem" (improvement 24): each history entry gets a
 * short name — the tab ("Painel", "Parcelas"…) or, on a profile, the
 * person's name — so a back button can say where it goes ("‹ Parcelas").
 */
const TABS: Record<string, string> = {
  '/dashboard': 'Painel',
  '/debtors': 'Devedores',
  '/installments': 'Parcelas',
  '/debts/new': 'Nova dívida',
}

const labels = new Map<number, string>()

const currentIdx = (): number | null => {
  const idx = (typeof window !== 'undefined' ? (window.history.state as { idx?: unknown } | null)?.idx : null) ?? null
  return typeof idx === 'number' ? idx : null
}

/** Called when a screen's heading shows up (route announcer). */
export function rememberScreen(pathname: string, heading: string) {
  const idx = currentIdx()
  if (idx === null) return
  const label = TABS[pathname] ?? heading.trim()
  if (label) labels.set(idx, label)
}

/** Name of the screen "Voltar" goes to, or null when unknown (opened directly). */
export function backLabel(): string | null {
  const idx = currentIdx()
  return idx && idx > 0 ? (labels.get(idx - 1) ?? null) : null
}
