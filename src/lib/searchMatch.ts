/**
 * The search rule of the API (B8: lower(f_unaccent(…)) LIKE '%term%', names
 * starting with the term — or with a word starting with it — first), for the
 * lists that are already on screen and filter as you type: Devedores, "Para
 * quem?", the debtor filter of Parcelas and "Registrar pagamento"
 * (improvement 21: the same rule everywhere).
 */
export const normalizeTerm = (s: string) =>
  s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim().replace(/\s+/g, ' ')

export function matchesTerm(text: string | null | undefined, term: string): boolean {
  const t = normalizeTerm(term)
  return !t || normalizeTerm(text ?? '').includes(t)
}

/** Items whose text contains the term; those starting with it (or with a word starting with it) first. */
export function rankByTerm<T>(items: T[], term: string, text: (x: T) => string): T[] {
  const t = normalizeTerm(term)
  if (!t) return items
  const scored = items
    .map((x, i) => ({ x, i, s: normalizeTerm(text(x)) }))
    .filter((e) => e.s.includes(t))
  const head = (s: string) => s.startsWith(t) || s.includes(` ${t}`)
  return scored.sort((a, b) => Number(head(b.s)) - Number(head(a.s)) || a.i - b.i).map((e) => e.x)
}
