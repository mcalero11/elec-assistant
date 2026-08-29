import { describe, expect, it } from 'vitest'
import { EngineError, standardBreaker, type BreakerInput } from '@elec-assistant/engine'
import golden from './golden/breaker.json'

describe('standardBreaker (golden)', () => {
  for (const c of golden.cases) {
    it(c.name, () => {
      const result = standardBreaker(c.input as BreakerInput)
      expect(result.rating).toBe(c.expected.rating)
      expect(result.nextSizeUpApplied).toBe(c.expected.nextSizeUpApplied)
      expect(result.citations).toContain('nec2026.s240_6_a')
    })
  }

  it('refuses a breaker the conductor cannot support (50 A load on a 40 A conductor)', () => {
    // 40 A is not standard-matched here: next-up allowance tops out at 45 A < required 50 A.
    expect(() => standardBreaker({ loadA: 50, conductorProtectionAmpacity: 40 })).toThrow(
      EngineError,
    )
  })
})

describe('standardBreaker minBreakerA floor', () => {
  it('raises the rating to the floor and flags it (33.3 A load, 40 A floor → 40, not 35)', () => {
    const result = standardBreaker({ loadA: 33.3, minBreakerA: 40 })
    expect(result.rating).toBe(40)
    expect(result.minBreakerApplied).toBe(true)
  })

  it('a floor below the load requirement changes nothing', () => {
    const result = standardBreaker({ loadA: 33.3, minBreakerA: 20 })
    expect(result.rating).toBe(35)
    expect(result.minBreakerApplied).toBe(false)
  })

  it('the 240.4 guard still rejects a floored breaker the conductor cannot support', () => {
    // Floor forces 40 A, but a 30 A conductor (standard-matched) allows at most 30 A.
    expect(() =>
      standardBreaker({ loadA: 20, minBreakerA: 40, conductorProtectionAmpacity: 30 }),
    ).toThrow(EngineError)
  })
})
