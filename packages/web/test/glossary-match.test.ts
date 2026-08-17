import { describe, expect, it } from 'vitest'
import { matchGlossaryTerms } from '../src/lib/glossary-match'

const termIds = (text: string) =>
  matchGlossaryTerms(text)
    .filter((s) => s.kind === 'term')
    .map((s) => (s.kind === 'term' ? s.id : ''))

const roundTrip = (text: string) =>
  matchGlossaryTerms(text)
    .map((s) => s.text)
    .join('')

describe('matchGlossaryTerms', () => {
  it('reassembles the original text exactly', () => {
    for (const text of [
      'Protección máxima (MOCP) según la placa',
      'alambre THHN/THWN-2 Cu #14',
      'Se calculó para 40 °C de temperatura ambiente.',
      'sin términos aquí 123',
    ]) {
      expect(roundTrip(text)).toBe(text)
    }
  })

  it('finds acronyms case-sensitively', () => {
    expect(termIds('Protección máxima (MOCP) según la placa')).toContain('mocp')
    // lowercase «mocp» in prose is not the rating
    expect(termIds('el mocp de la placa')).not.toContain('mocp')
  })

  it('does not match inside words or numbers', () => {
    // «tramo» must not match inside «tramoya»; digits touching the token block it too
    expect(termIds('la tramoya del teatro')).not.toContain('tramo')
    expect(termIds('AWG14')).toHaveLength(0)
  })

  it('prefers the longest variant at overlaps', () => {
    // «caída de tensión» must win over the shorter «tensión»
    const ids = termIds('la caída de tensión del circuito')
    expect(ids).toContain('caidaDeTension')
    expect(ids).not.toContain('tension')
  })

  it('links only the first occurrence of each term', () => {
    const ids = termIds('un térmico junto a otro térmico')
    expect(ids.filter((id) => id === 'breaker')).toHaveLength(1)
  })

  it('matches lowercase terms case-insensitively', () => {
    expect(termIds('Térmico (2 polos)')).toContain('breaker')
  })

  it('links the user-feedback acronyms', () => {
    expect(termIds('caja NEMA 3R apta para exterior')).toContain('nema3r')
    // Bare «AWG» resolves via calibre's synonym — its definition is the one
    // that explains AWG numbering; the awg entry's own name is «AWG / kcmil».
    expect(termIds('calibres en AWG y kcmil')).toEqual(expect.arrayContaining(['calibre', 'kcmil']))
    expect(termIds('12,000 BTU de capacidad')).toContain('btu')
  })
})
