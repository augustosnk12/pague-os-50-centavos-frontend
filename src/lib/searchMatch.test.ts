import { describe, it, expect } from 'vitest'
import { matchesTerm, normalizeTerm, rankByTerm } from './searchMatch'

describe('Regra de busca (item 21)', () => {
  it('ignores accents, case and extra spaces, like the API', () => {
    expect(normalizeTerm('  Conceição   Araújo ')).toBe('conceicao araujo')
    expect(matchesTerm('João Araújo', 'joao')).toBe(true)
    expect(matchesTerm('João Araújo', 'ARAU')).toBe(true)
    expect(matchesTerm('João Araújo', 'maria')).toBe(false)
    expect(matchesTerm('qualquer', '')).toBe(true)
  })

  it('names starting with the term (or a word of them) come first', () => {
    const names = ['Ana Mariana', 'Rosemari', 'Mariana Souza', 'Joana Maria']
    expect(rankByTerm(names, 'mari', (x) => x)).toEqual(['Ana Mariana', 'Mariana Souza', 'Joana Maria', 'Rosemari'])
  })
})
