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
